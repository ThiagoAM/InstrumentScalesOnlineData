const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { sha } = require("../scripts/source-inventory");
const { approvalFor, pendingManifest, canonicalSHA, prepareLegacy, promoteLegacy, promotePath } = require("../scripts/promote-approved");
const runtimeConfig = process.env.EDITORIAL_TEST_RUNTIME_CONFIG || path.join(os.homedir(), "Library/Application Support/InstrumentScalesEditorial/parsers/active-runtimes.json");
const realRuntimeAvailable = fs.existsSync(runtimeConfig);
const L = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const labels = (value) => Object.fromEntries(L.map(locale => [locale, value]));
const read = (file) => JSON.parse(fs.readFileSync(file));
function json(root, relative, value) {
  const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n"); return file;
}
function markdown(id, revision, guided = false) {
  return "---\nschema: 2\n" + (guided ? "format: 2\nassessmentVersion: 1\nrequiredCapabilities: guided-steps,localized-regions,instrument-setup,notes\n" : "course: instrument-scales\nlevel: beginner\nsection: beginner\nunit: fixture\norder: 1\n") + `id: ${id}\nrevision: ${revision}\nestimatedMinutes: 5\ninstrument: guitar\n` + L.map(locale => `title.${locale}: Synthetic transaction fixture\nsummary.${locale}: Isolated fixture, never a reviewed production lesson.`).join("\n") + "\n---\n\n" + (guided ? ":::step id=orientation phase=orient\n" : "") + ":::localized\n" + L.map(locale => `:::locale ${locale}\n# Synthetic transaction fixture\n\nThis isolated fixture tests promotion integrity. It is not real teaching or human review. Read the three written notes and count their four beats, including the held final note. Compare the first note with the last one before repeating the short phrase slowly. The fixture represents exact bytes solely to exercise parser and transaction boundaries; no person performed this task.\n\n:::checkpoint Name C and D, count four beats and repeat the written phrase without changing its final note.\n`).join("\n") + ":::endlocalized\n\n```notes\nid: " + id + "-example\ntitle: C4 D4 C4\ninstrument: guitar\ntempo: 60\nbeat: 1\nsequence: C4 D4 C4/2\n```\n" + (guided ? "\n:::endstep\n" : "");
}
function human(documents, manifest = undefined) {
  return { schema: 1, kind: "human", approvedBy: "Synthetic human fixture, never production approval", approvedAt: "2026-10-04T00:00:00Z", playthrough: "completed", documentSHA256: documents, assetSHA256: {}, pathManifestSHA256: manifest,
    independentReview: { status: "approved", reviewer: "Synthetic independent fixture reviewer", reviewedAt: "2026-10-04T00:00:00Z" }, languages: { status: "approved", reviewer: "Synthetic six-language fixture reviewer", reviewedAt: "2026-10-04T00:00:00Z", locales: L } };
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coordinated-promotions-"));
  json(root, "editorial/publisher.json", { status: "active", host: os.hostname() });
  json(root, "editorial/queue.json", { schema: 1, revision: 1, dailyLimit: 3, items: [] });
  json(root, "v2/education/paths.json", { schema: 2, format: 2, revision: 1, paths: [] });
  return { root, options: { root, stateRoot: path.join(root, "private-state"), runtimeConfig }, cleanup() { fs.rmSync(root, { recursive: true }); } };
}
function legacy(f) {
  const id = "fixture-legacy", destination = `v2/education/courses/instrument-scales/sections/beginner/units/fixture/lessons/${id}/lesson.md`;
  const proposal = "editorial/candidates/legacy-repairs/" + destination;
  const served = markdown(id, 2).replace("instrument: guitar\n", "instrument: guitar\ncontentStatus: quarantined\n");
  for (const [relative, bytes] of [[destination, served], [proposal, markdown(id, 2)]]) { const file = path.join(f.root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); }
  const catalog = { schema: 2, course: "instrument-scales", revision: 1, sections: [{ id: "beginner", level: "beginner", units: [{ id: "fixture", lessons: [{ id, order: 1, estimatedMinutes: 3, instrument: "guitar", optional: true, contentStatus: "quarantined", titles: labels("Reference in review"), summaries: labels("Physical task pending"), path: destination.split("instrument-scales/")[1] }] }] }] };
  json(f.root, "v2/education/courses/instrument-scales/catalog.json", catalog);
  json(f.root, "editorial/evidence/legacy-fallbacks.json", { schema: 1, lessons: [{ id, path: destination, proposalPath: proposal, fallbackSHA256: sha(served), fallbackKind: "original-listening-reference" }], counts: { "original-listening-reference": 1, "concept-only-no-invented-audio": 0 } });
  json(f.root, "editorial/queue.json", { schema: 1, revision: 1, dailyLimit: 3, items: [{ id: "repair-" + id, type: "repair", owner: "Synthetic fixture author", classification: "musical", source: proposal, contentSHA256: sha(markdown(id, 2)), reviewEvidence: {}, status: "review-pending", revision: 2 }] });
  return { id, destination, proposal, catalog: "v2/education/courses/instrument-scales/catalog.json" };
}
function pathCandidate(f) {
  const placements = [], items = [], documents = {};
  for (let index = 1; index <= 4; index++) {
    const id = "fixture-guided-" + index, relative = `guided/guitar/fixture/${id}/lesson.md`, source = "editorial/candidates/" + relative;
    const bytes = markdown(id, 1, true), file = path.join(f.root, source); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
    placements.push({ id: "placement-" + index, contentKey: "guided:" + id, lessonID: id, source: "guided", path: relative, revision: 1, assessmentVersion: 1, role: "core", skillID: "fixture-" + index, prerequisites: [], titles: labels("Synthetic task"), summaries: labels("Fixture only"), estimatedMinutes: 5 });
    items.push({ id: "guided-" + id, type: "gap", role: "core", owner: "Synthetic fixture author", source, contentSHA256: sha(bytes), reviewEvidence: {}, status: "review-pending", revision: 1 });
    documents["guided:" + id] = sha(bytes);
    // Existing writable lesson directories let a read-only index parent force
    // interruption AFTER the document has been installed.
    fs.mkdirSync(path.join(f.root, "v2/education", path.dirname(relative)), { recursive: true });
  }
  const candidate = { id: "fixture-path", spineVersion: 1, instrument: "guitar", titles: labels("Synthetic spine"), summaries: labels("Fixture only"), requiredCapabilities: ["guided-steps", "localized-regions", "instrument-setup", "notes"], setup: { instrument: "guitar", tuningMIDINotes: [40,45,50,55,59,64], stringsPerCourse: 1, minimumFret: 0, maximumFret: 12, minimumMIDINote: 40, maximumMIDINote: 76, leftHanded: false }, units: [{ id: "fixture", order: 1, level: "beginner", titles: labels("Fixture unit"), summaries: labels("Fixture only"), prerequisites: [], placements }], publicationStatus: "review-pending", humanPlaythrough: "pending" };
  json(f.root, "editorial/candidates/paths.json", { schema: 2, format: 2, revision: 1, requiredCapabilities: candidate.requiredCapabilities, paths: [candidate] });
  json(f.root, "editorial/queue.json", { schema: 1, revision: 1, dailyLimit: 3, items });
  return { candidate, approval: human(documents, canonicalSHA(pendingManifest(candidate))) };
}
test("human approval rejects fabricated kind, stale bytes and missing independent/language evidence", () => {
  const bytes = Buffer.from("Synthetic fixture"), record = human({ fixture: sha(bytes) });
  assert.throws(() => approvalFor({ ...record, kind: "agent" }, "fixture", bytes), /explicit human/);
  assert.throws(() => approvalFor(record, "fixture", Buffer.from("changed")), /exact reviewed bytes/);
  assert.throws(() => approvalFor({ ...record, independentReview: {} }, "fixture", bytes), /Independent/);
  assert.throws(() => approvalFor({ ...record, languages: {} }, "fixture", bytes), /Six-language/);
});
test("pending manifest binds setup, prerequisites and roles, independently of promotion flags", () => {
  const candidate = { id: "fixture", setup: { maximumFret: 12 }, units: [{ prerequisites: [], placements: [{ role: "core" }] }], publicationStatus: "review-pending", humanPlaythrough: "pending" };
  const digest = canonicalSHA(pendingManifest(candidate));
  assert.equal(canonicalSHA(pendingManifest({ ...candidate, publicationStatus: "approved", humanPlaythrough: "approved", approval: {} })), digest);
  for (const alter of [p => p.setup.maximumFret++, p => p.units[0].prerequisites.push("other"), p => p.units[0].placements[0].role = "extra"]) { const changed = structuredClone(candidate); alter(changed); assert.notEqual(canonicalSHA(pendingManifest(changed)), digest); }
});
test("unsigned path and changed spine fail before parser/staging or published writes", () => {
  const f = fixture(); try {
    const { candidate, approval } = pathCandidate(f), before = fs.readFileSync(path.join(f.root, "v2/education/paths.json"));
    assert.throws(() => promotePath(candidate.id, { ...approval, pathManifestSHA256: "0".repeat(64) }, f.options), /exact pending spine/);
    assert.throws(() => promotePath(candidate.id, { ...approval, kind: "agent" }, f.options), /explicit human/);
    assert.deepEqual(fs.readFileSync(path.join(f.root, "v2/education/paths.json")), before);
    assert.equal(fs.existsSync(path.join(f.root, "editorial/promotions")), false);
  } finally { f.cleanup(); }
});
test("filled legacy approval request is preserved without a parser-runtime bypass", () => {
  const f = fixture(); try {
    const info = legacy(f), request = json(f.root, `editorial/candidates/prepared-promotions/${info.id}/approval-request.json`, { approvedBy: "Synthetic existing human", playthrough: "completed" }), before = fs.readFileSync(request);
    assert.throws(() => prepareLegacy(info.id, f.options), /Filled approval request preserved/);
    assert.deepEqual(fs.readFileSync(request), before);
  } finally { f.cleanup(); }
});
test("legacy real-parser promotion resumes after document write, registers targets and never claims done", { skip: !realRuntimeAvailable }, () => {
  const f = fixture(); const course = path.join(f.root, "v2/education/courses/instrument-scales"); try {
    const info = legacy(f), prepared = prepareLegacy(info.id, f.options), bytes = fs.readFileSync(prepared.file), approval = human({ [info.destination]: sha(bytes) });
    fs.chmodSync(course, 0o500);
    assert.throws(() => promoteLegacy(info.id, approval, f.options));
    assert.deepEqual(fs.readFileSync(path.join(f.root, info.destination)), bytes, "Target already changed before catalog interruption");
    const histories = fs.readdirSync(path.join(f.root, "editorial/promotions")); assert.equal(histories.length, 1);
    assert.equal(read(path.join(f.root, "editorial/promotions", histories[0])).status, "prepared");
    fs.writeFileSync(path.join(f.root, info.destination), "Unknown third-hash fixture mutation");
    assert.throws(() => promoteLegacy(info.id, approval, f.options), /diverged from before\/after/);
    assert.equal(fs.readFileSync(path.join(f.root, info.destination), "utf8"), "Unknown third-hash fixture mutation", "Resume never overwrites unrelated work");
    fs.writeFileSync(path.join(f.root, info.destination), bytes);
    fs.chmodSync(course, 0o700);
    const result = promoteLegacy(info.id, approval, f.options), history = read(result.history), queue = read(path.join(f.root, "editorial/queue.json"));
    assert.equal(history.status, "promoted"); assert.equal(history.kind, "legacy"); assert.equal(history.targetsFiles[info.destination], sha(bytes));
    assert.deepEqual(history.aggregateFiles, [info.catalog]); assert.equal(queue.items[0].source, history.sources[0].path);
    assert.equal(queue.items[0].reviewEvidence.playthrough.contentSHA256, sha(bytes)); assert.equal(queue.items[0].target.path, info.destination);
    assert.notEqual(queue.items[0].status, "done"); assert.equal(fs.existsSync(path.join(f.options.stateRoot, "item-outcomes.json")), false);
    const before = [info.catalog, "editorial/queue.json", "editorial/evidence/legacy-fallbacks.json"].map(file => fs.readFileSync(path.join(f.root, file)));
    assert.equal(promoteLegacy(info.id, approval, f.options).idempotent, true);
    assert.deepEqual([info.catalog, "editorial/queue.json", "editorial/evidence/legacy-fallbacks.json"].map(file => fs.readFileSync(path.join(f.root, file))), before);
    const grown = read(path.join(f.root, info.catalog)); grown.revision++; json(f.root, info.catalog, grown);
    const grownBytes = fs.readFileSync(path.join(f.root, info.catalog));
    assert.equal(promoteLegacy(info.id, approval, f.options).idempotent, true);
    assert.deepEqual(fs.readFileSync(path.join(f.root, info.catalog)), grownBytes, "Repeating a completed transaction never restores its old aggregate");
  } finally { fs.chmodSync(course, 0o700); f.cleanup(); }
});
test("four-item real-parser path promotion resumes before index, binds human manifest and is idempotent", { skip: !realRuntimeAvailable }, () => {
  const f = fixture(), education = path.join(f.root, "v2/education"); try {
    const { candidate, approval } = pathCandidate(f);
    fs.chmodSync(education, 0o500); assert.throws(() => promotePath(candidate.id, approval, f.options));
    for (const placement of candidate.units[0].placements) assert.equal(sha(fs.readFileSync(path.join(education, placement.path))), approval.documentSHA256[placement.contentKey]);
    assert.equal(read(path.join(education, "paths.json")).paths.length, 0);
    fs.chmodSync(education, 0o700);
    const result = promotePath(candidate.id, approval, f.options), history = read(result.history), published = read(path.join(education, "paths.json"));
    assert.equal(history.itemIDs.length, 4); assert.equal(history.status, "promoted"); assert.equal(history.kind, "path");
    assert.equal(published.paths[0].approval.pathManifestSHA256, approval.pathManifestSHA256);
    assert.equal(canonicalSHA(pendingManifest(published.paths[0])), approval.pathManifestSHA256);
    const before = fs.readFileSync(path.join(education, "paths.json")); assert.equal(promotePath(candidate.id, approval, f.options).idempotent, true);
    assert.deepEqual(fs.readFileSync(path.join(education, "paths.json")), before);
    const grown = read(path.join(education, "paths.json")); grown.revision++; json(f.root, "v2/education/paths.json", grown);
    const grownBytes = fs.readFileSync(path.join(education, "paths.json"));
    assert.equal(promotePath(candidate.id, approval, f.options).idempotent, true);
    assert.deepEqual(fs.readFileSync(path.join(education, "paths.json")), grownBytes);
    assert.ok(read(path.join(f.root, "editorial/queue.json")).items.every(item => item.target.files.includes("v2/education/paths.json") && item.reviewEvidence.playthrough.kind === "human" && item.status !== "done"));
  } finally { fs.chmodSync(education, 0o700); f.cleanup(); }
});
