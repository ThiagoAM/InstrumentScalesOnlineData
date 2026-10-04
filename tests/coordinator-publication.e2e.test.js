const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { execFileSync, spawn } = require("node:child_process");
const { sha, digestFiles, candidateDigests } = require("../scripts/audit-swift-parser");
const { publishedInventory } = require("../scripts/source-inventory");
const { canonicalSHA, pendingManifest } = require("../scripts/promote-approved");
const { fixtureCoordinator } = require("./helpers/fixture-coordinator");
const { assertWritesAllowed } = require("../scripts/maintenance-guard");
const sourceRoot = path.join(__dirname, "..");
const runtimeConfig = process.env.EDITORIAL_TEST_RUNTIME_CONFIG || path.join(os.homedir(), "Library/Application Support/InstrumentScalesEditorial/parsers/active-runtimes.json");
const runtimeAvailable = fs.existsSync(runtimeConfig);
const locales = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
function json(file, value) {
  assertWritesAllowed();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}
function git(root, ...args) {
  assertWritesAllowed();
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe", timeout: 30000 }).trim();
}
function syntheticApproval(documents, manifest) {
  return {
    schema: 1, kind: "human", playthrough: "completed",
    approvedBy: "Synthetic fixture human, never a production approval",
    approvedAt: "2026-10-04T00:00:00Z",
    independentReview: { status: "approved", reviewer: "Synthetic fixture independent reviewer", reviewedAt: "2026-10-04T00:00:00Z" },
    languages: { status: "approved", reviewer: "Synthetic fixture language reviewer", reviewedAt: "2026-10-04T00:00:00Z", locales },
    documentSHA256: documents, assetSHA256: {}, ...(manifest ? { pathManifestSHA256: manifest } : {}),
  };
}
function fixture() {
  assertWritesAllowed();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "instrument-scales-coordinator-e2e-"));
  const repo = path.join(directory, "repo"), remote = path.join(directory, "remote.git"), state = path.join(directory, "state");
  fs.mkdirSync(repo);
  for (const name of ["v1", "v2", "editorial", "scripts", "README.md", "OPENCLAW.md", "create-lesson.js", ".gitignore", "site"])
    { assertWritesAllowed(); fs.cpSync(path.join(sourceRoot, name), path.join(repo, name), { recursive: true }); }
  const coordinator = fixtureCoordinator(process.env);
  json(path.join(repo, "editorial/publisher.json"), {
    status: "active", host: os.hostname(), fixture: true, coordinatorThread: coordinator,
    publicBaseURL: "https://thiagoam.github.io/InstrumentScalesOnlineData",
  });
  // This COPY may be taken while candidate evidence is being consolidated. Bind
  // its pending checkpoint to its copied bytes; never touch production evidence.
  const fallbackFile = path.join(repo, "editorial/evidence/legacy-fallbacks.json"), fallbacks = read(fallbackFile);
  for (const item of fallbacks.lessons) item.proposalSHA256 = sha(fs.readFileSync(path.join(repo, item.proposalPath)));
  json(fallbackFile, fallbacks);
  require("../scripts/editorial-state").initializeState(state, "Synthetic isolated coordinator publication fixture; no real approval or delivery");
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.name", "Synthetic coordinator fixture");
  git(repo, "config", "user.email", "fixture@example.invalid");
  git(directory, "init", "--bare", remote);
  git(repo, "remote", "add", "origin", remote);
  git(repo, "add", ".");
  git(repo, "commit", "-m", "Synthetic fixture baseline; real corpus copy, no production authorization");
  git(repo, "push", "-u", "origin", "main");
  const environment = {
    ...process.env, INSTRUMENT_SCALES_EDITORIAL_COORDINATOR: coordinator,
    EDITORIAL_REPOSITORY_ROOT: repo, EDITORIAL_STATE_ROOT: state,
  };
  const command = (env, args) => execFileSync(process.execPath, [path.join(repo, "scripts/editorial-pipeline.js"), ...args], {
    cwd: repo, env, encoding: "utf8", stdio: "pipe", timeout: 90000, maxBuffer: 16 * 1024 * 1024,
  });
  const cli = (...args) => JSON.parse(command(environment, args));
  const checkpoint = (key, next, evidence = {}) => {
    const file = path.join(directory, "checkpoint.json"); json(file, evidence);
    return cli("checkpoint", key, next, file);
  };
  return {
    directory, repo, remote, state, coordinator, environment, command, cli, checkpoint,
    run(script, args = []) {
      return execFileSync(process.execPath, [path.join(repo, script), ...args], {
        cwd: repo, env: environment, encoding: "utf8", stdio: "pipe", timeout: 90000, maxBuffer: 16 * 1024 * 1024,
      });
    },
    cleanup() { assertWritesAllowed(); fs.rmSync(directory, { recursive: true }); },
  };
}
const labels = value => Object.fromEntries(locales.map(locale => [locale, value]));
function bytes(file, value) {
  assertWritesAllowed(); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value);
}
function syntheticMarkdown(id, { course, revision = 1, guided = false, quarantined = false } = {}) {
  const front = ["schema: 2", ...(guided ? ["format: 2", "assessmentVersion: 1", "requiredCapabilities: guided-steps,localized-regions,instrument-setup,notes"] : []),
    `id: ${id}`, `course: ${course}`, "level: beginner", "section: beginner", "unit: four-beats", "order: 1", `revision: ${revision}`,
    "estimatedMinutes: 5", "instrument: guitar", ...(quarantined ? ["contentStatus: quarantined"] : []),
    ...locales.flatMap(locale => [`title.${locale}: Synthetic four-beat transaction fixture`, `summary.${locale}: Isolated parser and publication fixture; never a production lesson or real human approval.`]),
  ];
  return "---\n" + front.join("\n") + "\n---\n\n" + (guided ? ":::step id=orientation phase=orient\n" : "") + ":::localized\n" +
    locales.map(locale => `:::locale ${locale}\n# Synthetic four-beat transaction fixture\n\nThis is a synthetic transaction fixture, not real teaching, a translation or human review. Read C4, D4 and C4 as one beat, one beat and two beats. Count all four beats before repeating the same phrase. The isolated content exercises exact parser bytes and promotion boundaries only. No person performed this task and these synthetic approvals must never be exported as production evidence.\n\n:::checkpoint Count four beats and name the final C without changing its two-beat duration.\n`).join("\n") +
    ":::endlocalized\n\n```notes\nid: " + id + "-example\ntitle: C4 D4 C4\ninstrument: guitar\ntempo: 60\nbeat: 1\nsequence: C4 D4 C4/2\n```\n" + (guided ? "\n:::endstep\n" : "");
}
function queueItem(id, source, content, extra = {}) {
  return { id, type: "gap", objective: "Synthetic exact-byte promotion and delivery boundary test", setup: "Standard six-string guitar E2 A2 D3 G3 B3 E4, no capo", locales,
    blueprintVersion: 1, owner: "Synthetic fixture author", status: "review-pending", source, contentSHA256: sha(content), reviewEvidence: {}, revision: 1, ...extra };
}
function syntheticLegacy(f) {
  const nonce = require("node:crypto").randomUUID(), course = "synthetic-m15-course-" + nonce, id = "synthetic-m15-legacy-" + nonce;
  const catalogFile = `v2/education/courses/${course}/catalog.json`, relative = `sections/beginner/units/four-beats/lessons/${id}/lesson.md`;
  const destination = `v2/education/courses/${course}/${relative}`, proposal = "editorial/candidates/legacy-repairs/" + destination;
  const original = "editorial/originals/legacy/" + destination;
  const proposed = syntheticMarkdown(id, { course, revision: 2 }), archived = syntheticMarkdown(id, { course, revision: 1 });
  const fallback = syntheticMarkdown(id, { course, revision: 2, quarantined: true });
  bytes(path.join(f.repo, proposal), proposed); bytes(path.join(f.repo, destination), fallback); bytes(path.join(f.repo, original), archived);
  const index = read(path.join(f.repo, "v2/education/courses.json"));
  assert.equal(index.courses.some(c => c.id === course), false, "New synthetic identity never depends on an existing real course");
  index.courses.push({ id: course, order: Math.max(0, ...index.courses.map(c => c.order)) + 1, titles: labels("Synthetic transaction course"), summaries: labels("Fixture only"), theme: "music.note" });
  json(path.join(f.repo, "v2/education/courses.json"), index);
  json(path.join(f.repo, catalogFile), { schema: 2, course, revision: 1, sections: [{ id: "beginner", level: "beginner", order: 1, titles: labels("Synthetic beginner"), summaries: labels("Fixture only"), theme: "music.note", units: [{ id: "four-beats", order: 1, titles: labels("Synthetic unit"), summaries: labels("Fixture only"), theme: "music.note", lessons: [{ id, order: 1, estimatedMinutes: 5, instrument: "guitar", optional: true, contentStatus: "quarantined", titles: labels("Synthetic four-beat transaction fixture"), summaries: labels("Synthetic physical task pending"), path: relative }] }] }] });
  const fallbackFile = path.join(f.repo, "editorial/evidence/legacy-fallbacks.json"), fallbacks = read(fallbackFile);
  fallbacks.lessons.push({ id, path: destination, originalPath: original, proposalPath: proposal, originalSHA256: sha(archived), fallbackSHA256: sha(fallback), proposalSHA256: sha(proposed), fallbackKind: "original-listening-reference" });
  fallbacks.counts["original-listening-reference"] = (fallbacks.counts["original-listening-reference"] || 0) + 1; json(fallbackFile, fallbacks);
  const repairFile = path.join(f.repo, "editorial/evidence/legacy-repair.json"), repairs = read(repairFile);
  repairs.changes.push({ id, path: destination, originalPath: original, proposalPath: proposal, classification: "musical", beforeSHA256: sha(archived), afterSHA256: sha(proposed), physicalReview: "pending", classificationReason: "Synthetic new physical fixture only, never a production review" }); json(repairFile, repairs);
  const queueFile = path.join(f.repo, "editorial/queue.json"), queue = read(queueFile);
  queue.items.push(queueItem("repair-" + id, proposal, proposed, { type: "repair", classification: "musical", revision: 2 })); json(queueFile, queue);
  return { id, destination, catalogFile };
}
function syntheticPath(f) {
  const nonce = require("node:crypto").randomUUID(), id = "synthetic-m15-path-" + nonce;
  const placements = [], queue = read(path.join(f.repo, "editorial/queue.json"));
  const capabilities = ["guided-steps", "localized-regions", "instrument-setup", "notes"];
  for (let index = 1; index <= 6; index++) {
    const lessonID = `synthetic-m15-guided-${nonce}-${index}`, relative = `guided/guitar/${id}/${lessonID}/lesson.md`, source = "editorial/candidates/" + relative;
    const role = index <= 4 ? "core" : index === 5 ? "transfer" : "extra", content = syntheticMarkdown(lessonID, { course: id, guided: true });
    bytes(path.join(f.repo, source), content);
    placements.push({ id: "placement-" + lessonID, contentKey: "guided:" + lessonID, lessonID, source: "guided", path: relative, revision: 1, assessmentVersion: 1, role, skillID: "fixture-" + lessonID, prerequisites: [], titles: labels("Synthetic task"), summaries: labels("Fixture only"), estimatedMinutes: 5 });
    queue.items.push(queueItem("guided-" + lessonID, source, content, { role }));
  }
  const candidate = { id, spineVersion: 1, instrument: "guitar", titles: labels("Synthetic transaction path"), summaries: labels("Fixture only; no real teacher approval"), requiredCapabilities: capabilities,
    setup: { instrument: "guitar", tuningMIDINotes: [40,45,50,55,59,64], stringsPerCourse: 1, minimumFret: 0, maximumFret: 12, minimumMIDINote: 40, maximumMIDINote: 76, leftHanded: false },
    units: [{ id: "four-beats", order: 1, level: "beginner", titles: labels("Synthetic unit"), summaries: labels("Fixture only"), prerequisites: [], placements }], publicationStatus: "review-pending", humanPlaythrough: "pending" };
  const indexFile = path.join(f.repo, "editorial/candidates/paths.json"), index = read(indexFile);
  index.paths.push(candidate); json(indexFile, index); json(path.join(f.repo, "editorial/queue.json"), queue);
  assert.equal(read(path.join(f.repo, "v2/education/paths.json")).paths.some(p => p.id === id), false);
  return candidate;
}
function sealSyntheticBaseline(f) {
  // All synthetic initial bytes precede the promotion's base commit. Subsequent
  // published delta checks can therefore require only its registered targets.
  git(f.repo, "add", "."); git(f.repo, "commit", "-m", "Synthetic stable initial scenario, independent of production candidates");
  git(f.repo, "push", "origin", "main");
}

function reviewCopiedSnapshot(f) {
  // Both source-pinned Swift executables actually parse the copied complete
  // corpus. No preexisting receipt is relabeled as an executed parser test.
  f.run("scripts/audit-swift-parser.js", ["--runtime-config", runtimeConfig]);
  const receipt = read(path.join(f.repo, "editorial/evidence/swift-parser.json"));
  assert.equal(receipt.reviewOnly, false);
  const configured = read(runtimeConfig).current;
  assert.equal(receipt.runtimeProvenance.currentCommit, configured.commit);
  assert.equal(receipt.currentBinarySHA256, configured.binarySHA256);
  assert.equal(receipt.runtimeProvenance.currentSourceSHA256, configured.sourceSHA256);
  assert.equal(receipt.valid, true);
  assert.deepEqual(receipt.files, digestFiles(f.repo));
  assert.deepEqual(receipt.candidateFiles, candidateDigests(f.repo));
  const files = digestFiles(f.repo), served = publishedInventory(f.repo);
  const repairs = read(path.join(f.repo, "editorial/evidence/legacy-repair.json")).changes;
  json(path.join(f.repo, "editorial/evidence/independent-review.json"), {
    status: "approved", reviewer: "Synthetic publication reviewer, never production approval", reviewedAt: "2026-10-04T00:00:00Z",
    publishedFiles: files, snapshotSHA256: sha(JSON.stringify(files)), servedFiles: served, servedSHA256: sha(JSON.stringify(served)),
    documentSHA256: Object.fromEntries(repairs.map(r => [r.path, sha(fs.readFileSync(path.join(f.repo, r.path)))])),
  });
}
function rejectedIdentities(f, args, expectedStateFile) {
  const before = expectedStateFile && fs.readFileSync(expectedStateFile);
  for (const identity of [null, "incorrect-synthetic-coordinator"]) {
    const environment = { ...f.environment };
    if (identity === null) delete environment.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
    else environment.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR = identity;
    assert.throws(() => f.command(environment, args), /coordinator|coordena|lock|maintenance|paus/i);
    if (before) assert.deepEqual(fs.readFileSync(expectedStateFile), before, "Rejected identity leaves durable state unchanged");
  }
}
async function served(directory) {
  let requests = 0;
  const server = http.createServer((request, response) => {
    requests++;
    const file = path.resolve(directory, new URL(request.url, "http://localhost").pathname.slice(1));
    if (!file.startsWith(path.resolve(directory) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, url: "http://127.0.0.1:" + server.address().port, requestCount: () => requests };
}
function asyncCLI(f, args, environment = f.environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(f.repo, "scripts/editorial-pipeline.js"), ...args], { cwd: f.repo, env: environment });
    let stdout = "", stderr = "";
    child.stdout.on("data", bytes => stdout += bytes);
    child.stderr.on("data", bytes => stderr += bytes);
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(stderr)));
  });
}
function assertUndelivered(f, ids, message) {
  const file = path.join(f.state, "item-outcomes.json");
  const outcomes = fs.existsSync(file) ? read(file).items : {};
  for (const id of ids) {
    assert.notEqual(outcomes[id]?.status, "done", message);
    assert.equal(outcomes[id]?.publishedCommit, undefined, message);
  }
}
async function publish(f, promoted, { resumeAfterCommit = false } = {}) {
  reviewCopiedSnapshot(f);
  const record = path.join(f.repo, promoted.promotionRecord);
  // The CLI composes the machine guard with the lane identity check. The
  // independent identity-API test below also exercises the lane without writes.
  rejectedIdentities(f, ["start-coordinated-promotion", record]);
  const batch = f.cli("start-coordinated-promotion", record);
  assert.equal(batch.kind, "coordinator-promotion");
  assert.equal(batch.lane, "coordinator-intervention");
  assert.deepEqual(batch.itemIDs.slice().sort(), promoted.itemIDs.slice().sort());
  const batchFile = path.join(f.state, "batches", batch.key + ".json");
  const evidence = path.join(f.directory, "checkpoint.json"); json(evidence, {});
  // On this Mac the private global guard may reject first; in an environment
  // without that guard the lane's coordinator check is exercised directly.
  rejectedIdentities(f, ["checkpoint", batch.key, "validated", evidence], batchFile);
  f.checkpoint(batch.key, "validated");
  f.checkpoint(batch.key, "review-pending");
  f.checkpoint(batch.key, "review-approved");
  assertUndelivered(f, batch.itemIDs, "A promoted/reviewed record is not delivered yet");
  git(f.repo, "add", ".");
  git(f.repo, "commit", "-m", "Synthetic coordinated promotion, real fixture targets and evidence");
  const commit = git(f.repo, "rev-parse", "HEAD");
  f.checkpoint(batch.key, "commit-created", { commit });
  if (resumeAfterCommit) {
    // Every CLI call is a new process: durable restart, not retained JS state.
    const resumed = f.cli("start-coordinated-promotion", record);
    assert.equal(resumed.key, batch.key); assert.equal(resumed.state, "commit-created");
    rejectedIdentities(f, ["select", "2026-10-04"], batchFile);
    assert.equal(f.cli("select", "2026-10-04").key, batch.key);
    assert.equal(fs.readdirSync(path.join(f.state, "batches")).filter(n => n.endsWith(".json")).length, 1);
  }
  // Default CLI commit comes from GITHUB_SHA. Rebuild explicitly bound to the
  // prepared actual commit, without touching HOME or the maintenance guard.
  execFileSync(process.execPath, [path.join(f.repo, "scripts/build-pages.js")], {
    cwd: f.repo, env: { ...f.environment, GITHUB_SHA: commit }, encoding: "utf8", stdio: "pipe", timeout: 90000,
  });
  rejectedIdentities(f, ["finalize-snapshot", batch.key], batchFile);
  const finalized = f.cli("finalize-snapshot", batch.key);
  assert.ok(finalized.snapshotSHA256);
  assert.notEqual(git(f.repo, "ls-remote", "origin", "refs/heads/main").split(/\s+/)[0], commit, "Remote still holds only the fixture baseline");
  assert.throws(() => f.checkpoint(batch.key, "push-confirmed"), /Remote main differs/);
  git(f.repo, "push", "origin", "main");
  f.checkpoint(batch.key, "push-confirmed");
  assertUndelivered(f, batch.itemIDs, "A real push still does not prove deployment");
  const service = await served(path.join(f.repo, "dist"));
  try {
    // Verify an actual failed serving attempt first; no done outcome may appear.
    const target = Object.keys(read(record).publishedContentSHA256)[0];
    const servedFile = path.join(f.repo, "dist", target), saved = fs.readFileSync(servedFile);
    assertWritesAllowed(); fs.writeFileSync(servedFile, Buffer.from("corrupt synthetic fixture deployment"));
    await assert.rejects(asyncCLI(f, ["verify-deployment", batch.key, service.url, "--allow-local-fixture"]), /hash|digest|mismatch|differs|content|byte/i);
    assert.equal(read(batchFile).state, "push-confirmed");
    assertUndelivered(f, batch.itemIDs, "A failed HTTP verification grants no delivered outcome");
    assertWritesAllowed(); fs.writeFileSync(servedFile, saved);
    const verified = await asyncCLI(f, ["verify-deployment", batch.key, service.url, "--allow-local-fixture"]);
    assert.equal(verified.state, "deployment-confirmed");
    assert.ok(service.requestCount() > 0, "Actual loopback HTTP requests verified all snapshot bytes");
    f.checkpoint(batch.key, "notification-recorded", { notificationSkipped: "Synthetic fixture only; no messaging authorization or external message" });
  } finally {
    await new Promise(resolve => service.server.close(resolve));
  }
  assert.equal(read(batchFile).state, "notification-recorded");
  const artifact = require("../scripts/editorial-pipeline").treeManifest(path.join(f.repo, "dist"));
  assert.ok(artifact["snapshot.json"]);
  assert.equal(sha(JSON.stringify(artifact)), finalized.snapshotSHA256, "Verified identity includes the actual served manifest bytes");
  const outcomes = read(path.join(f.state, "item-outcomes.json"));
  for (const id of batch.itemIDs) {
    assert.equal(outcomes.items[id].publishedCommit, commit);
    assert.equal(outcomes.items[id].verifiedSnapshot, finalized.snapshotSHA256);
    assert.equal(outcomes.items[id].verifiedSnapshotKind, "artifact-tree-with-manifest");
  }
  assert.equal(git(f.repo, "status", "--porcelain"), "", "Only private delivery state changes after the fixture commit");
  const repeat = f.cli("start-coordinated-promotion", record);
  assert.equal(repeat.key, batch.key); assert.equal(repeat.state, "notification-recorded");
  assert.equal(fs.readdirSync(path.join(f.state, "batches")).filter(n => n.endsWith(".json")).length, 1);
  return { batch, commit, record: read(record) };
}
test("coordinator identity API refuses absent/wrong identity without changing HOME or guard", () => {
  assertWritesAllowed();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "instrument-scales-coordinator-identity-"));
  try {
    json(path.join(directory, "editorial/publisher.json"), { coordinatorThread: "synthetic-lane-owner" });
    const script = "require(process.argv[1]).assertCoordinator(process.argv[2]);";
    for (const identity of [null, "wrong-synthetic-owner"]) {
      const environment = { ...process.env };
      if (identity === null) delete environment.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
      else environment.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR = identity;
      assert.throws(() => execFileSync(process.execPath, ["-e", script, path.join(sourceRoot, "scripts/coordinated-publication.js"), directory], { env: environment, stdio: "pipe" }), /authorized coordinator identity/);
    }
  } finally { assertWritesAllowed(); fs.rmSync(directory, { recursive: true }); }
});
test("legacy coordinated cycle uses real Swift/Git/push/HTTP, resumes and delivers only after byte verification", { skip: !runtimeAvailable }, async () => {
  const f = fixture();
  try {
    const scenario = syntheticLegacy(f), { id, destination } = scenario;
    sealSyntheticBaseline(f);
    const prepared = JSON.parse(f.run("scripts/promote-approved.js", ["--kind", "prepare-legacy", "--id", id, "--runtime-config", runtimeConfig]));
    const approvalFile = path.join(f.directory, "approval.json");
    json(approvalFile, syntheticApproval({ [destination]: sha(fs.readFileSync(prepared.file)) }));
    const promoted = JSON.parse(f.run("scripts/promote-approved.js", ["--kind", "legacy", "--id", id, "--approval", approvalFile, "--runtime-config", runtimeConfig]));
    const result = await publish(f, promoted, { resumeAfterCommit: true });
    assert.equal(result.record.kind, "legacy");
    assert.equal(sha(fs.readFileSync(path.join(f.repo, destination))), result.record.publishedContentSHA256[destination]);
    const catalog = read(path.join(f.repo, scenario.catalogFile));
    const reference = catalog.sections.flatMap(s => s.units.flatMap(u => u.lessons)).find(l => l.id === id);
    assert.notEqual(reference.contentStatus, "quarantined");
    assert.equal(read(path.join(f.repo, "editorial/evidence/legacy-fallbacks.json")).lessons.some(l => l.id === id), false);
  } finally { f.cleanup(); }
});
test("approved path coordinated cycle publishes all core/transfer/extra placements beyond daily quota as one explicit intervention", { skip: !runtimeAvailable }, async () => {
  const f = fixture();
  try {
    const candidate = syntheticPath(f);
    sealSyntheticBaseline(f);
    const placements = candidate.units.flatMap(u => u.placements);
    assert.ok(placements.length > 3);
    const documents = Object.fromEntries(placements.map(l => [l.contentKey, sha(fs.readFileSync(path.join(f.repo, "editorial/candidates", l.path)))]));
    const approvalFile = path.join(f.directory, "approval.json"); json(approvalFile, syntheticApproval(documents, canonicalSHA(pendingManifest(candidate))));
    const promoted = JSON.parse(f.run("scripts/promote-approved.js", ["--kind", "path", "--id", candidate.id, "--approval", approvalFile, "--runtime-config", runtimeConfig]));
    const result = await publish(f, promoted);
    const published = read(path.join(f.repo, "v2/education/paths.json")).paths.find(p => p.id === candidate.id);
    assert.equal(result.record.kind, "path");
    assert.equal(published.publicationStatus, "approved"); assert.equal(published.humanPlaythrough, "approved");
    assert.equal(published.approval.pathManifestSHA256, canonicalSHA(pendingManifest(candidate)));
    for (const placement of placements) {
      const relative = "v2/education/" + placement.path;
      assert.equal(sha(fs.readFileSync(path.join(f.repo, relative))), result.record.publishedContentSHA256[relative]);
    }
    assert.equal(result.batch.itemIDs.length, placements.length);
    assert.equal(read(path.join(f.repo, "editorial/queue.json")).dailyLimit, 3, "The coordinated exception never raises the scheduled daily limit");
  } finally { f.cleanup(); }
});
