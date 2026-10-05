const fs = require("node:fs");
const path = require("node:path");
const { sha } = require("./source-inventory");
const { canonical } = require("./publishing-state");
const { fields, same, assertApprovedGuidedVariation } = require("./guided-variation");
const { manifestSHA } = require("./path-release-approval");
const read = (file) => JSON.parse(fs.readFileSync(file));
const POLICY = "owner-authorized-exact-pilot-pattern-variations-2026-10-04";
const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const digest = (value) => sha(JSON.stringify(canonical(value)));
function assertOnlyExtraAdded(before, after, placementID) {
  const restored = structuredClone(after);
  const matches = restored.units.flatMap((u) => u.placements.filter((p) => p.id === placementID));
  if (matches.length !== 1 || matches[0].role !== "extra" || matches[0].source !== "guided") throw new Error("A guided delta adds exactly one optional guided placement.");
  for (const unit of restored.units) unit.placements = unit.placements.filter((p) => p.id !== placementID);
  delete restored.approval;
  const original = structuredClone(before); delete original.approval;
  if (!same(restored, original)) throw new Error("Guided extras cannot modify prior placements, setup, units, prerequisites or required spine.");
  return matches[0];
}
function assertDeltaProof(root, course) {
  const proof = course.approval?.delta;
  if (course.approval?.basis !== "guided-extra-delta" || proof?.policy !== POLICY || !proof.basePath || !proof.author)
    throw new Error("Guided extra requires its explicit policy and intact approved baseline.");
  let cursor = course, depth = 0;
  while (cursor.approval?.basis === "guided-extra-delta") {
    if (++depth > 128) throw new Error("Guided approval chain exceeds 128; reconcile before adding extras.");
    cursor = cursor.approval.delta?.basePath;
    if (!cursor) throw new Error("Missing guided delta baseline.");
  }
  const placement = assertOnlyExtraAdded(proof.basePath, course, proof.placementID);
  if (course.approval.kind !== "editorial" || course.approval.approvedBy !== proof.reviewEvidence?.independent?.reviewer ||
      course.approval.approvedAt !== proof.reviewEvidence?.independent?.reviewedAt ||
      !same(course.approval.assetSHA256, proof.basePath.approval.assetSHA256))
    throw new Error("An optional delta names its own independent review and preserves the original asset approval.");
  require("./coordinated-publication").assertPathManifestApproval(proof.basePath);
  if (!require("./coordinated-publication").registeredPathPromotion(root, proof.basePath)) throw new Error("Guided extra baseline has no registered approval.");
  if (course.approval.pathManifestSHA256 !== manifestSHA(course) || placement.contentKey !== proof.contentKey ||
      !same(course.approval.documentSHA256, { ...proof.basePath.approval.documentSHA256, [proof.contentKey]: proof.contentSHA256 }))
    throw new Error("Guided extra approval must bind exactly the old documents and one reviewed addition.");
  const item = {
    id: proof.itemID, type: "gap", role: "extra", owner: proof.author, objective: placement.summaries.en,
    setup: course.setup, contentSHA256: proof.contentSHA256, source: "v2/education/" + placement.path,
    approvedPattern: proof.approvedPattern, reviewEvidence: proof.reviewEvidence,
    guidedTarget: { pathID: course.id, unitID: course.units.find((u) => u.placements.some((p) => p.id === placement.id)).id,
      lessonID: placement.lessonID, role: "extra", spineVersion: course.spineVersion },
  };
  if (!item.approvedPattern) throw new Error("This daily delta lane supports exact approved patterns; new physical patterns remain drafts.");
  if (sha(fs.readFileSync(path.join(root, item.source))) !== proof.contentSHA256) throw new Error("Guided extra delivered document differs from its review.");
  for (const gate of ["parser", "languages", "independent"]) {
    const review = proof.reviewEvidence?.[gate];
    if (review?.status !== "approved" || !review.reviewer || !review.reviewedAt || review.contentSHA256 !== proof.contentSHA256)
      throw new Error("Guided extra needs current parser, language and independent evidence.");
  }
  if (proof.reviewEvidence.independent.reviewer === proof.author) throw new Error("An author cannot review their own optional delta.");
  assertApprovedGuidedVariation(root, item);
  return true;
}
function registeredGuidedDelta(root, course) {
  if (course.approval?.basis !== "guided-extra-delta") return false;
  try {
    const record = require("./coordinated-publication").promotionRecords(root).find((r) =>
      r.kind === "guided-gap" && r.status === "promoted" && r.pathID === course.id && r.afterPathSHA256 === digest(course) && same(r.afterPath, course));
    if (!record || record.approvalSHA256 !== digest(course.approval)) return false;
    return assertDeltaProof(root, course);
  } catch { return false; }
}
function validateStagedGuidedIndex(root, stateRoot, indexBytes, outputs, runtimeConfig) {
  const runtime = require("./parser-runtime").loadRuntimeConfig(runtimeConfig);
  const directory = path.join(stateRoot, "promotion-validation");
  require("./maintenance-guard").assertWritesAllowed();
  fs.mkdirSync(directory, { recursive: true });
  const stage = fs.mkdtempSync(path.join(directory, "guided-gap-"));
  const index = JSON.parse(indexBytes), sourceHashes = {};
  try {
    for (const course of index.paths) {
      for (const placement of course.units.flatMap((unit) => unit.placements)) {
        const source = "v2/education/" + placement.path;
        const original = path.resolve(root, source), destination = path.resolve(stage, placement.path);
        if (!original.startsWith(path.resolve(root, "v2/education") + path.sep) || !destination.startsWith(stage + path.sep))
          throw new Error("Guided index staging cannot escape its education root.");
        const bytes = outputs[source] !== undefined ? Buffer.from(outputs[source]) : fs.readFileSync(original);
        if (outputs[source] === undefined) sourceHashes[source] = sha(bytes);
        require("./approved-assets").assertPathDocumentCompatible(bytes.toString("utf8"));
        require("./maintenance-guard").assertWritesAllowed();
        fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, bytes);
      }
    }
    const stagedIndex = path.join(stage, "paths.json"); fs.writeFileSync(stagedIndex, indexBytes);
    const output = require("./parser-runtime").runCurrentParser(["--paths", stagedIndex, "--root", stage], runtimeConfig);
    for (const [source, hash] of Object.entries(sourceHashes))
      if (sha(fs.readFileSync(path.join(root, source))) !== hash) throw new Error("Published source changed during guided index validation: " + source);
    const proof = { status: "approved", kind: "full-guided-index", validatedAt: new Date().toISOString(),
      indexSHA256: sha(indexBytes), documents: sourceHashes, currentCommit: runtime.current.commit,
      currentBinarySHA256: runtime.current.binarySHA256, currentSourceSHA256: runtime.current.sourceSHA256, output };
    fs.rmSync(stage, { recursive: true });
    return proof;
  } catch (error) {
    throw new Error(`${error.message}\nPreserved failed guided validation stage: ${stage}`);
  }
}
function promoteGuidedGap(root, stateRoot, id, { runtimeConfig } = {}) {
  const api = require("./editorial-pipeline");
  return api.withLock(stateRoot, () => {
    const queueFile = path.join(root, "editorial/queue.json"), queue = read(queueFile), item = queue.items.find((i) => i.id === id);
    if (!item?.guidedTarget || item.type !== "gap" || item.role !== "extra" || !item.blueprintApproved)
      throw new Error("Only an approved optional guided gap can use this promotion lane.");
    if (!item.approvedPattern) throw new Error("New musical/physical patterns stay in draft until an explicit human-reviewed promotion; the daily delta lane reuses exact approved patterns.");
    const gap = read(path.join(root, "editorial/guided-gaps.json")).gaps.find((g) => g.id === item.gapID);
    if (!gap || gap.status !== "approved-for-authoring" || gap.pathID !== item.guidedTarget.pathID || gap.unitID !== item.guidedTarget.unitID ||
        gap.instrument !== item.instrument || gap.blueprintID !== item.blueprintID || gap.blueprintVersion !== item.blueprintVersion ||
        gap.objective !== item.objective || gap.sourcePattern !== item.approvedPattern.contentKey)
      throw new Error("Guided promotion must treat the defined approved gap and its exact source pattern.");
    const recordFile = path.join(root, "editorial/promotions", `guided-gap-${id}.json`);
    let record = fs.existsSync(recordFile) ? read(recordFile) : null;
    const resumingPrepared = Boolean(record);
    if (record?.status === "promoted") {
      const current = read(path.join(root, "v2/education/paths.json")).paths.find((p) => p.id === record.pathID);
      if (!same(item.target, record.targets[id]) || sha(fs.readFileSync(path.join(root, item.target.path))) !== item.contentSHA256 ||
          !require("./coordinated-publication").registeredPathPromotion(root, current))
        throw new Error("Delivered guided extra changed; reconcile its registered promotion.");
      validateStagedGuidedIndex(root, stateRoot, fs.readFileSync(path.join(root, "v2/education/paths.json")), {}, runtimeConfig || process.env.EDITORIAL_RUNTIME_CONFIG);
      return { id, target: item.target, recordPath: path.relative(root, recordFile), resumed: true };
    }
    if (!record) {
      api.gateItem(item, { root, receipt: read(path.join(root, "editorial/evidence/swift-parser.json")) });
      require("./parser-runtime").runCurrentParser([path.join(root, item.source)], runtimeConfig || process.env.EDITORIAL_RUNTIME_CONFIG);
      const indexFile = path.join(root, "v2/education/paths.json"), index = read(indexFile), target = item.guidedTarget;
      const course = index.paths.find((p) => p.id === target.pathID), unit = course?.units.find((u) => u.id === target.unitID);
      if (!unit || course.spineVersion !== target.spineVersion || !same(course.setup, item.setup)) throw new Error("Guided gap target changed its approved unit, setup or enrollment spine.");
      if (!require("./coordinated-publication").registeredPathPromotion(root, course)) throw new Error("Publish the registered approved path before adding extras.");
      let cursor = course, depth = 0;
      while (cursor.approval?.basis === "guided-extra-delta") { depth++; cursor = cursor.approval.delta.basePath; }
      if (depth >= 128) throw new Error("Reconcile the 128-delta approval chain before adding another extra.");
      const source = fs.readFileSync(path.join(root, item.source), "utf8"), metadata = fields(source);
      if ([target.lessonID, course.instrument, unit.id].some((value) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))) throw new Error("Unsafe guided target identity.");
      require("./approved-assets").assertPathDocumentCompatible(source);
      if (metadata.id !== target.lessonID || metadata.course !== course.id || metadata.unit !== unit.id || metadata.instrument !== course.instrument || metadata.format !== "2")
        throw new Error("Authored document does not match its guided gap target.");
      if (index.paths.some((p) => p.units.some((u) => u.placements.some((l) => l.lessonID === target.lessonID)))) throw new Error("A released guided identity cannot be replaced by this extra lane.");
      const relative = `guided/${course.instrument}/${unit.id}/${target.lessonID}/lesson.md`, targetPath = "v2/education/" + relative;
      const beforePath = structuredClone(course), placement = {
        id: target.lessonID + "-placement", contentKey: "guided:" + target.lessonID, lessonID: target.lessonID, source: "guided", path: relative,
        revision: Number(metadata.revision), assessmentVersion: Number(metadata.assessmentVersion), role: "extra", skillID: course.instrument + ":" + item.gapID,
        prerequisites: [], estimatedMinutes: Number(metadata.estimatedMinutes),
        titles: Object.fromEntries(LOCALES.map((l) => [l, metadata["title." + l]])), summaries: Object.fromEntries(LOCALES.map((l) => [l, metadata["summary." + l]])),
      };
      unit.placements.push(placement);
      const proof = { policy: POLICY, basePath: beforePath, placementID: placement.id, itemID: id, author: item.owner,
        contentKey: placement.contentKey, contentSHA256: item.contentSHA256, approvedPattern: item.approvedPattern, reviewEvidence: item.reviewEvidence };
      course.approval = { kind: "editorial", basis: "guided-extra-delta", approvedBy: item.reviewEvidence.independent.reviewer,
        approvedAt: item.reviewEvidence.independent.reviewedAt, documentSHA256: { ...beforePath.approval.documentSHA256, [placement.contentKey]: item.contentSHA256 },
        ...(beforePath.approval.assetSHA256 !== undefined ? { assetSHA256: beforePath.approval.assetSHA256 } : {}), pathManifestSHA256: manifestSHA(course), delta: proof };
      assertOnlyExtraAdded(beforePath, course, placement.id);
      item.target = { kind: "file", path: targetPath, sha256: item.contentSHA256, files: [targetPath, "v2/education/paths.json"] };
      item.targetDigest = sha(JSON.stringify(item.target)); queue.revision += 1; index.revision += 1;
      const outputs = { [targetPath]: source, "v2/education/paths.json": JSON.stringify(index, null, 2) + "\n", "editorial/queue.json": JSON.stringify(queue, null, 2) + "\n" };
      const parserProof = validateStagedGuidedIndex(root, stateRoot, outputs["v2/education/paths.json"], outputs, runtimeConfig || process.env.EDITORIAL_RUNTIME_CONFIG);
      record = { schema: 1, kind: "guided-gap", id, status: "prepared", pathID: course.id, itemIDs: [id], beforePath,
        afterPath: course, afterPathSHA256: digest(course), approval: course.approval, approvalSHA256: digest(course.approval),
        parserProof,
        publishedContentSHA256: { [targetPath]: item.contentSHA256 }, targets: { [id]: item.target },
        files: Object.fromEntries(Object.entries(outputs).map(([file, content]) => [file, {
          beforeSHA256: fs.existsSync(path.join(root, file)) ? sha(fs.readFileSync(path.join(root, file))) : null, afterSHA256: sha(content), content,
        }])) };
      api.atomicJSON(recordFile, record);
    }
    if (record.id !== id || record.publishedContentSHA256?.[item.target?.path || Object.keys(record.publishedContentSHA256)[0]] !== item.contentSHA256)
      throw new Error("Preserve the prepared promotion; item identity or reviewed bytes changed.");
    if (record.status !== "prepared" || record.approvalSHA256 !== digest(record.afterPath.approval) || record.afterPathSHA256 !== digest(record.afterPath))
      throw new Error("Preserve the promotion journal; its reviewed path proof changed.");
    assertApprovedGuidedVariation(root, item);
    if (sha(fs.readFileSync(path.join(root, item.source))) !== item.contentSHA256)
      throw new Error("The reviewed candidate changed before prepared promotion recovery.");
    const stagedOutputs = Object.fromEntries(Object.entries(record.files).map(([file, value]) => {
      if (sha(value.content) !== value.afterSHA256) throw new Error("Prepared promotion output changed: " + file);
      return [file, value.content];
    }));
    if (!same(JSON.parse(stagedOutputs["v2/education/paths.json"]).paths.find((p) => p.id === record.pathID), record.afterPath) ||
        sha(stagedOutputs[record.targets[id].path]) !== item.contentSHA256)
      throw new Error("Prepared promotion outputs do not bind the reviewed path and document.");
    if (!record.parserProof || record.parserProof.indexSHA256 !== sha(stagedOutputs["v2/education/paths.json"]))
      throw new Error("Prepared promotion lacks its exact staged full-index parser proof; reconcile the old journal explicitly.");
    // Revalidate prepared recovery against the current pinned runtime before any published write.
    if (resumingPrepared)
      record.parserProof = validateStagedGuidedIndex(root, stateRoot, stagedOutputs["v2/education/paths.json"], stagedOutputs, runtimeConfig || process.env.EDITORIAL_RUNTIME_CONFIG);
    for (const [file, output] of Object.entries(record.files)) {
      const destination = path.resolve(root, file);
      if (!destination.startsWith(path.resolve(root) + path.sep)) throw new Error("Promotion output escapes repository.");
      const current = fs.existsSync(destination) ? sha(fs.readFileSync(destination)) : null;
      if (current !== output.beforeSHA256 && current !== output.afterSHA256) throw new Error("Third-party changes require reconciliation before any write: " + file);
    }
    for (const [file, output] of Object.entries(record.files)) {
      const destination = path.resolve(root, file);
      if (!destination.startsWith(path.resolve(root) + path.sep)) throw new Error("Promotion output escapes repository.");
      const current = fs.existsSync(destination) ? sha(fs.readFileSync(destination)) : null;
      if (current === output.afterSHA256) continue;
      if (current !== output.beforeSHA256) throw new Error("Third-party changes require reconciliation: " + file);
      require("./maintenance-guard").assertWritesAllowed();
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const temporary = destination + ".guided-promotion.tmp";
      fs.writeFileSync(temporary, output.content); fs.renameSync(temporary, destination);
    }
    if (record.status !== "promoted") { record.status = "promoted"; record.promotedAt = new Date().toISOString(); api.atomicJSON(recordFile, record); }
    return { id, target: record.targets[id], recordPath: path.relative(root, recordFile), next: "Refresh complete Swift parser/publication review, reselect the same daily batch, then publish normally." };
  });
}
module.exports = { POLICY, assertOnlyExtraAdded, assertDeltaProof, registeredGuidedDelta, validateStagedGuidedIndex, promoteGuidedGap };
