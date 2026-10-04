#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { atomicJSON, withLock, assertPublisher } = require("./editorial-pipeline");
const { assertWritesAllowed } = require("./maintenance-guard");
const { sha, defaultStateRoot } = require("./source-inventory");
const { canonical } = require("./publishing-state");
const { approvedAssets, imageReferences, assertPathDocumentCompatible } = require("./approved-assets");
const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const defaultRoot = process.env.EDITORIAL_REPOSITORY_ROOT || path.join(__dirname, "..");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const jsonBytes = (value) => Buffer.from(JSON.stringify(value, null, 2) + "\n");
const canonicalSHA = (value) => sha(JSON.stringify(canonical(value)));
function arg(name) { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; }
function context(options = {}) {
  const root = path.resolve(options.root || defaultRoot);
  return { root, stateRoot: options.stateRoot || defaultStateRoot(root), runtimeConfig: options.runtimeConfig || arg("--runtime-config") || process.env.EDITORIAL_RUNTIME_CONFIG };
}
function safeFile(root, relative, published = false) {
  if (typeof relative !== "string" || path.isAbsolute(relative) || relative.includes("\\") || relative.includes(":") || relative.split("/").some(part => !part || part === "." || part === "..") || (published && !relative.startsWith("v2/")))
    throw new Error("Unsafe promotion path: " + relative);
  const file = path.resolve(root, relative), realRoot = fs.realpathSync(root);
  let ancestor = file; while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const real = fs.realpathSync(ancestor);
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) throw new Error("Promotion symlink escapes repository.");
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw new Error("Promotion target is a symlink.");
  return file;
}
function fields(bytes) {
  const match = bytes.toString("utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("Missing lesson metadata.");
  return Object.fromEntries(match[1].split("\n").map(line => line.match(/^([^:]+):\s*(.*)$/)).filter(Boolean).map(match => [match[1], match[2]]));
}
function parser(args, ctx) {
  const configuration = require("./parser-runtime").loadRuntimeConfig(ctx.runtimeConfig);
  const run = spawnSync(configuration.current.binary, ["--all-locales", "--strict", ...args], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error((run.stdout || "") + (run.stderr || ""));
  return { kind: "swift-parser", status: "approved", reviewer: "Current source-pinned Swift lessonlint", reviewedAt: new Date().toISOString(), currentCommit: configuration.current.commit, binarySHA256: configuration.current.binarySHA256, sourceSHA256: configuration.current.sourceSHA256, outputSHA256: sha(run.stdout || "") };
}
function approvalFor(record, key, bytes) {
  if (record.kind !== "human" || !record.approvedBy || !record.approvedAt || record.playthrough !== "completed")
    throw new Error("Promotion requires an explicit human playthrough record; agents cannot manufacture it.");
  if (record.documentSHA256?.[key] !== sha(bytes)) throw new Error("Human approval does not match the exact reviewed bytes: " + key);
  if (record.independentReview?.status !== "approved" || !record.independentReview.reviewer || !record.independentReview.reviewedAt || record.independentReview.reviewer === record.approvedBy)
    throw new Error("Independent content review is also required.");
  if (record.languages?.status !== "approved" || !record.languages.reviewer || !record.languages.reviewedAt) throw new Error("Six-language review is still pending.");
}
function pendingManifest(selected) {
  const pending = structuredClone(selected); delete pending.approval;
  pending.publicationStatus = "review-pending"; pending.humanPlaythrough = "pending";
  return pending;
}
function evidence(item, approval, digest, parserProof) {
  if (approval.independentReview.reviewer === item.owner) throw new Error("Independent reviewer cannot be the authored item's owner.");
  return {
    parser: { ...parserProof, contentSHA256: digest },
    languages: { ...approval.languages, contentSHA256: digest },
    independent: { ...approval.independentReview, contentSHA256: digest },
    playthrough: { status: "approved", kind: "human", reviewer: approval.approvedBy, reviewedAt: approval.approvedAt, contentSHA256: digest },
  };
}
function stageFile(ctx, key, relative) { return path.join(ctx.stateRoot, "promotions", key, sha(relative) + ".blob"); }
function currentSHA(file) { return fs.existsSync(file) ? sha(fs.readFileSync(file)) : null; }
function writeBytes(file, bytes) {
  assertWritesAllowed(); fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + "." + require("node:crypto").randomUUID() + ".tmp";
  fs.writeFileSync(temp, bytes, { flag: "wx" }); fs.renameSync(temp, file);
}
function transaction(ctx, plan, approval, parserProof) {
  const recordPath = "editorial/promotions/" + plan.id + "-" + plan.primarySHA256.slice(0, 12) + ".json";
  const recordFile = safeFile(ctx.root, recordPath), approvalSHA256 = canonicalSHA(approval);
  let record;
  if (fs.existsSync(recordFile)) {
    record = read(recordFile);
    if (record.kind !== plan.kind || record.approvalSHA256 !== approvalSHA256 || record.primarySHA256 !== plan.primarySHA256)
      throw new Error("Existing promotion belongs to another reviewed transaction; preserve it.");
  } else {
    const key = plan.kind + "-" + plan.id + "-" + approvalSHA256;
    const beforeFiles = {}, afterFiles = {}, updates = [];
    for (const [relative, bytes] of plan.files) {
      const file = safeFile(ctx.root, relative), staged = stageFile(ctx, key, relative);
      beforeFiles[relative] = currentSHA(file); afterFiles[relative] = sha(bytes);
      if (fs.existsSync(staged) && currentSHA(staged) !== afterFiles[relative]) throw new Error("Unknown promotion staging bytes preserved.");
      if (!fs.existsSync(staged)) writeBytes(staged, bytes);
      updates.push(relative);
    }
    record = {
      schema: 1, kind: plan.kind, id: plan.id, status: "prepared", transactionKey: key,
      preparedAt: new Date().toISOString(), primarySHA256: plan.primarySHA256, itemIDs: plan.itemIDs,
      targets: plan.targets, targetsFiles: Object.fromEntries(Object.entries(afterFiles).filter(([file]) => file.startsWith("v2/"))),
      aggregateFiles: plan.aggregateFiles,
      publishedContentSHA256: Object.fromEntries(Object.entries(afterFiles).filter(([file]) => file.startsWith("v2/") && !plan.aggregateFiles.includes(file))),
      beforeFiles, afterFiles, sources: plan.sources, approval, approvalSHA256, parserProof, updates,
    };
    atomicJSON(recordFile, record); // Durable plan precedes every destination/catalog/queue write.
  }
  for (const source of record.sources) {
    if (currentSHA(safeFile(ctx.root, source.path)) !== source.sha256) throw new Error("Reviewed promotion source changed; old staged transaction preserved.");
  }
  if (record.status === "promoted") {
    for (const [relative, digest] of Object.entries(record.publishedContentSHA256))
      if (currentSHA(safeFile(ctx.root, relative, true)) !== digest) throw new Error("Previously promoted content is now changed or superseded: " + relative);
    const queue = read(safeFile(ctx.root, "editorial/queue.json"));
    for (const itemID of record.itemIDs) {
      const item = queue.items.find(item => item.id === itemID);
      if (!item || canonicalSHA(item.target) !== canonicalSHA(record.targets[itemID])) throw new Error("Promoted queue target needs explicit reconciliation: " + itemID);
    }
    if (record.kind === "path") {
      const entry = read(safeFile(ctx.root, "v2/education/paths.json")).paths.find(entry => entry.id === record.id);
      if (!entry || canonicalSHA(entry) !== record.primarySHA256) throw new Error("Promoted spine changed or superseded.");
    } else {
      const bytes = fs.readFileSync(safeFile(ctx.root, record.targets[record.itemIDs[0]].path)), meta = fields(bytes);
      const catalog = read(safeFile(ctx.root, `v2/education/courses/${meta.course}/catalog.json`));
      const item = catalog.sections.flatMap(section => section.units.flatMap(unit => unit.lessons)).find(item => item.id === record.id);
      if (!item || item.contentStatus === "quarantined" || item.estimatedMinutes !== Number(meta.estimatedMinutes) || item.instrument !== meta.instrument || LOCALES.some(locale => item.titles[locale] !== meta["title." + locale] || item.summaries[locale] !== meta["summary." + locale])) throw new Error("Promoted catalog metadata needs explicit reconciliation.");
      if (read(safeFile(ctx.root, "editorial/evidence/legacy-fallbacks.json")).lessons.some(item => item.id === record.id)) throw new Error("Promoted legacy item is quarantined again.");
    }
    return { id: plan.id, kind: plan.kind, history: recordFile, promotionRecord: recordPath, itemIDs: record.itemIDs, targets: record.targets, idempotent: true, next: "Already installed; reconcile its actual publication attempt. Historical aggregate hashes are not overwritten." };
  }
  // Validate the complete precondition set BEFORE resuming any write.
  for (const relative of record.updates) {
    const current = currentSHA(safeFile(ctx.root, relative));
    if (current !== record.beforeFiles[relative] && current !== record.afterFiles[relative]) throw new Error("Promotion target diverged from before/after checkpoint: " + relative);
    if (currentSHA(stageFile(ctx, record.transactionKey, relative)) !== record.afterFiles[relative]) throw new Error("Promotion staging integrity mismatch: " + relative);
  }
  let wrote = false;
  for (const relative of record.updates) {
    const target = safeFile(ctx.root, relative);
    if (currentSHA(target) === record.afterFiles[relative]) continue;
    writeBytes(target, fs.readFileSync(stageFile(ctx, record.transactionKey, relative))); wrote = true;
    if (currentSHA(target) !== record.afterFiles[relative]) throw new Error("Promoted bytes did not survive readback.");
  }
  if (record.status !== "promoted") {
    record.status = "promoted"; record.promotedAt = new Date().toISOString(); atomicJSON(recordFile, record);
  }
  return { id: plan.id, kind: plan.kind, history: recordFile, promotionRecord: recordPath, itemIDs: record.itemIDs, targets: record.targets, idempotent: !wrote, next: "Refresh actual parser receipts and independent publication review, then use the explicit coordinated publication lane. No commit, deployment or done outcome is claimed." };
}
function priorTransaction(ctx, kind, id, approval, primarySHA256) {
  const file = safeFile(ctx.root, "editorial/promotions/" + id + "-" + primarySHA256.slice(0, 12) + ".json");
  if (!fs.existsSync(file)) return null;
  const record = read(file);
  if (record.kind !== kind || record.approvalSHA256 !== canonicalSHA(approval)) throw new Error("Different approval transaction already exists.");
  return record;
}
function resumePlan(record) {
  // transaction reads the durable descriptor/staged bytes. No catalog revision
  // or queue version is recomputed after a partially completed installation.
  return { ...record, files: new Map() };
}
function prepareLegacy(id, options = {}) {
  const ctx = context(options);
  return withLock(ctx.stateRoot, () => {
    assertPublisher(ctx.root);
    const fallbacks = read(safeFile(ctx.root, "editorial/evidence/legacy-fallbacks.json"));
    const item = fallbacks.lessons.find(x => x.id === id);
    if (!item) throw new Error("Unknown quarantined legacy ID.");
    const source = fs.readFileSync(safeFile(ctx.root, item.proposalPath)), current = fs.readFileSync(safeFile(ctx.root, item.path));
    const revision = Number(fields(current).revision) + 1;
    const prepared = Buffer.from(source.toString("utf8").replace(/^revision: \d+$/m, `revision: ${revision}`));
    const relative = "editorial/candidates/prepared-promotions/" + id + "/lesson.md", file = safeFile(ctx.root, relative);
    const request = path.join(path.dirname(file), "approval-request.json");
    const assetSHA256 = {};
    for (const reference of imageReferences(prepared.toString("utf8"))) {
      const asset = path.resolve(path.dirname(safeFile(ctx.root, item.proposalPath)), decodeURIComponent(reference));
      assetSHA256[item.path + ":" + reference] = sha(fs.readFileSync(asset));
    }
    const assets = approvedAssets(prepared.toString("utf8"), path.dirname(safeFile(ctx.root, item.proposalPath)), item.path, { assetSHA256 });
    const draft = { schema: 1, kind: "human", approvedBy: null, approvedAt: null, playthrough: "pending", documentSHA256: { [item.path]: sha(prepared) }, assetSHA256, independentReview: { status: "pending", reviewer: null }, languages: { status: "pending", locales: LOCALES }, source: relative, destination: item.path };
    if (fs.existsSync(request)) {
      const previous = read(request);
      if (previous.approvedBy || previous.playthrough === "completed") throw new Error("Filled approval request preserved; reuse it, never prepare over it.");
      if (canonicalSHA(previous.documentSHA256) !== canonicalSHA(draft.documentSHA256) || canonicalSHA(previous.assetSHA256 || {}) !== canonicalSHA(assetSHA256)) throw new Error("Prepared proposal changed; preserve its previous review checkpoint.");
    }
    if (fs.existsSync(file) && currentSHA(file) !== sha(prepared)) throw new Error("Existing prepared bytes preserved; use an explicit new revision checkpoint.");
    if (!fs.existsSync(file)) writeBytes(file, prepared);
    for (const asset of assets) writeBytes(safeFile(ctx.root, path.posix.dirname(relative) + "/" + asset.relativePath), fs.readFileSync(asset.source));
    parser([file], ctx);
    if (!fs.existsSync(request)) atomicJSON(request, draft);
    return { file, revision, approvalRequest: request };
  });
}
function promoteLegacy(id, approval, options = {}) {
  const ctx = context(options);
  return withLock(ctx.stateRoot, () => {
    assertPublisher(ctx.root);
    const prepared = read(safeFile(ctx.root, "editorial/candidates/prepared-promotions/" + id + "/approval-request.json"));
    const source = safeFile(ctx.root, prepared.source), bytes = fs.readFileSync(source), digest = sha(bytes);
    approvalFor(approval, prepared.destination, bytes);
    const parserProof = parser([source], ctx);
    if (sha(fs.readFileSync(source)) !== digest) throw new Error("Source changed during actual parser validation.");
    const prior = priorTransaction(ctx, "legacy", id, approval, digest);
    if (prior) return transaction(ctx, resumePlan(prior), approval, parserProof);
    const fallbackPath = "editorial/evidence/legacy-fallbacks.json", fallback = read(safeFile(ctx.root, fallbackPath));
    const quarantined = fallback.lessons.find(item => item.id === id);
    if (!quarantined || quarantined.path !== prepared.destination || currentSHA(safeFile(ctx.root, prepared.destination, true)) !== quarantined.fallbackSHA256) throw new Error("Quarantine changed; reconcile before promotion.");
    const meta = fields(bytes);
    if (meta.id !== id || !/^[a-z0-9][a-z0-9-]*$/.test(meta.course || "") || !prepared.destination.startsWith("v2/education/courses/" + meta.course + "/")) throw new Error("Prepared identity/destination mismatch.");
    const catalogPath = `v2/education/courses/${meta.course}/catalog.json`, catalog = read(safeFile(ctx.root, catalogPath));
    const lesson = catalog.sections.flatMap(s => s.units.flatMap(u => u.lessons)).find(item => item.id === id);
    if (!lesson) throw new Error("Existing catalog identity is required; promotion cannot mint a free sample.");
    const queuePath = "editorial/queue.json", queue = read(safeFile(ctx.root, queuePath)), item = queue.items.find(item => item.id === "repair-" + id);
    if (!item) throw new Error("Canonical repair queue item is required.");
    const assets = approvedAssets(bytes.toString("utf8"), path.dirname(source), prepared.destination, approval);
    const files = new Map([[prepared.destination, bytes]]), sources = [{ itemID: item.id, path: prepared.source, sha256: digest }];
    for (const asset of assets) {
      const target = path.posix.dirname(prepared.destination) + "/" + asset.relativePath;
      if (fs.existsSync(safeFile(ctx.root, target)) && currentSHA(safeFile(ctx.root, target)) !== asset.sha256) throw new Error("Different released visual requires a new reviewed reference.");
      files.set(target, fs.readFileSync(asset.source)); sources.push({ itemID: item.id, path: path.relative(ctx.root, asset.source), sha256: asset.sha256 });
    }
    delete lesson.contentStatus; lesson.estimatedMinutes = Number(meta.estimatedMinutes); lesson.instrument = meta.instrument;
    for (const locale of LOCALES) { lesson.titles[locale] = meta["title." + locale]; lesson.summaries[locale] = meta["summary." + locale]; }
    catalog.revision += 1;
    fallback.lessons = fallback.lessons.filter(item => item.id !== id);
    fallback.counts = Object.fromEntries(["original-listening-reference", "concept-only-no-invented-audio"].map(kind => [kind, fallback.lessons.filter(item => item.fallbackKind === kind).length]));
    item.source = prepared.source; item.contentSHA256 = digest; item.revision = Number(meta.revision);
    item.status = "open"; item.stage = "human-approved-prepared"; item.reviewEvidence = evidence(item, approval, digest, parserProof);
    item.target = { kind: "file", path: prepared.destination, sha256: digest, files: [...files.keys(), catalogPath] }; item.targetDigest = canonicalSHA(item.target);
    queue.revision += 1;
    files.set(catalogPath, jsonBytes(catalog)); files.set(fallbackPath, jsonBytes(fallback)); files.set(queuePath, jsonBytes(queue));
    return transaction(ctx, { kind: "legacy", id, primarySHA256: digest, itemIDs: [item.id], targets: { [item.id]: item.target }, aggregateFiles: [catalogPath], sources, files }, approval, parserProof);
  });
}
function promotePath(id, approval, options = {}) {
  const ctx = context(options);
  return withLock(ctx.stateRoot, () => {
    assertPublisher(ctx.root);
    const candidates = read(safeFile(ctx.root, "editorial/candidates/paths.json")), selected = candidates.paths.find(candidate => candidate.id === id);
    if (!selected) throw new Error("Unknown path candidate.");
    for (const placement of selected.units.flatMap(unit => unit.placements)) {
      const relative = (placement.source === "guided" ? "editorial/candidates/" : "v2/education/") + placement.path;
      assertPathDocumentCompatible(fs.readFileSync(safeFile(ctx.root, relative), "utf8"));
    }
    const manifestSHA = canonicalSHA(pendingManifest(selected));
    if (approval.pathManifestSHA256 !== manifestSHA) throw new Error("Human path approval must bind the exact pending spine/setup/roles/prerequisites.");
    const promoted = structuredClone(selected); promoted.publicationStatus = "approved"; promoted.humanPlaythrough = "approved";
    promoted.approval = { approvedBy: approval.approvedBy, approvedAt: approval.approvedAt, documentSHA256: approval.documentSHA256, assetSHA256: approval.assetSHA256 || {}, pathManifestSHA256: manifestSHA };
    const primarySHA256 = canonicalSHA(promoted), prior = priorTransaction(ctx, "path", id, approval, primarySHA256);
    const files = new Map(), sources = [], queuePath = "editorial/queue.json", queue = read(safeFile(ctx.root, queuePath));
    const targets = {}, itemIDs = [], indexPath = "v2/education/paths.json";
    const parserRoot = path.join(ctx.stateRoot, "promotions", "path-validation-" + primarySHA256);
    assertWritesAllowed(); fs.mkdirSync(parserRoot, { recursive: true });
    for (const placement of promoted.units.flatMap(unit => unit.placements)) {
      const isGuided = placement.source === "guided";
      const relative = (isGuided ? "editorial/candidates/" : "v2/education/") + placement.path, file = safeFile(ctx.root, relative), bytes = fs.readFileSync(file);
      if (!isGuided && fields(bytes).contentStatus === "quarantined") throw new Error("A path cannot treat a quarantined notice as an approved skill.");
      approvalFor(approval, placement.contentKey, bytes);
      const item = isGuided ? queue.items.find(item => item.source === relative) : null;
      if (isGuided && !item) throw new Error("Every path content key needs its existing queue identity.");
      const target = "v2/education/" + placement.path, assets = approvedAssets(bytes.toString("utf8"), path.dirname(file), placement.contentKey, approval);
      const staged = path.join(parserRoot, placement.path);
      writeBytes(staged, bytes); files.set(target, bytes); sources.push({ itemID: item?.id || null, path: relative, sha256: sha(bytes) });
      const targetFiles = [target, indexPath];
      for (const asset of assets) {
        const assetTarget = path.posix.dirname(target) + "/" + asset.relativePath;
        if (fs.existsSync(safeFile(ctx.root, assetTarget)) && currentSHA(safeFile(ctx.root, assetTarget)) !== asset.sha256) throw new Error("Different released visual requires a new reviewed reference.");
        const assetBytes = fs.readFileSync(asset.source); files.set(assetTarget, assetBytes); writeBytes(path.join(path.dirname(staged), asset.relativePath), assetBytes);
        sources.push({ itemID: item?.id || null, path: path.relative(ctx.root, asset.source), sha256: asset.sha256 }); targetFiles.push(assetTarget);
      }
      if (!item) continue;
      if (!itemIDs.includes(item.id)) itemIDs.push(item.id);
      targets[item.id] = { kind: "file", path: target, sha256: sha(bytes), files: targetFiles };
    }
    if (!itemIDs.length) throw new Error("An all-legacy spine needs an explicit planned spine queue identity; no item is invented by promotion.");
    const candidateIndex = { ...candidates, paths: [promoted] }, validationIndex = path.join(parserRoot, "paths.json");
    atomicJSON(validationIndex, candidateIndex);
    const parserProof = parser(["--paths", validationIndex, "--root", parserRoot], ctx);
    for (const source of sources) if (currentSHA(safeFile(ctx.root, source.path)) !== source.sha256) throw new Error("Path source changed during parser validation.");
    if (prior) return transaction(ctx, resumePlan(prior), approval, parserProof);
    const published = read(safeFile(ctx.root, indexPath)), existing = published.paths.find(candidate => candidate.id === id);
    if (existing) throw new Error("Existing enrollment spine requires its recorded transaction or explicit versioned promotion.");
    for (const [file, bytes] of files) if (fs.existsSync(safeFile(ctx.root, file)) && currentSHA(safeFile(ctx.root, file)) !== sha(bytes)) throw new Error("Refusing to overwrite different released content: " + file);
    for (const itemID of itemIDs) {
      const item = queue.items.find(item => item.id === itemID), target = targets[itemID];
      item.contentSHA256 = target.sha256; item.reviewEvidence = evidence(item, approval, target.sha256, parserProof);
      item.status = "open"; item.stage = "human-approved-prepared"; item.target = target; item.targetDigest = canonicalSHA(target);
    }
    queue.revision += 1; published.paths.push(promoted); published.revision += 1;
    files.set(indexPath, jsonBytes(published)); files.set(queuePath, jsonBytes(queue));
    return transaction(ctx, { kind: "path", id, primarySHA256, itemIDs, targets, aggregateFiles: [indexPath], sources, files }, approval, parserProof);
  });
}
if (require.main === module) try {
  assertWritesAllowed(); assertPublisher(defaultRoot);
  const kind = arg("--kind"), id = arg("--id");
  if (!id) throw new Error("Usage: --kind prepare-legacy|legacy|path --id <stable ID> [--approval <completed-human-record.json>]");
  const options = { runtimeConfig: arg("--runtime-config") || process.env.EDITORIAL_RUNTIME_CONFIG };
  const result = kind === "riff" || kind === "gap" ? require("./promote-queue-item").promoteQueueItem(defaultRoot, defaultStateRoot(defaultRoot), id)
    : kind === "prepare-legacy" ? prepareLegacy(id, options)
      : kind === "legacy" ? promoteLegacy(id, read(arg("--approval")), options)
        : kind === "path" ? promotePath(id, read(arg("--approval")), options) : (() => { throw new Error("Unknown promotion kind."); })();
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
module.exports = { approvalFor, pendingManifest, prepareLegacy, promotePath, promoteLegacy, canonicalSHA };
