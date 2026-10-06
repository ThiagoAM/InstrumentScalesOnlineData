const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { canonical } = require("../scripts/publishing-state");
const { sha, digestFiles, candidateDigests } = require("../scripts/audit-swift-parser");
const { manifestSHA } = require("../scripts/path-release-approval");
const { selectItems, gateItem, recordReview, treeManifest } = require("../scripts/editorial-pipeline");
const { createGuidedLesson, listGaps } = require("../scripts/create-guided-lesson");
const { promoteGuidedGap, registeredGuidedDelta, assertOnlyExtraAdded } = require("../scripts/promote-guided-gap");
const root = path.join(__dirname, "..");
const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const runtimeConfig = process.env.EDITORIAL_TEST_RUNTIME_CONFIG || path.join(os.homedir(), "Library/Application Support/InstrumentScalesEditorial/parsers/active-runtimes.json");
const digest = (value) => sha(JSON.stringify(canonical(value)));
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "guided-daily-fixture-"));
  // This fixture creates its own approval history; real promotion journals belong to production.
  const productionPromotions = path.join(root, "editorial/promotions");
  for (const name of ["v2", "editorial", "scripts", "create-lesson.js"]) fs.cpSync(path.join(root, name), path.join(directory, name), {
    recursive: true, filter: (source) => source !== productionPromotions,
  });
  const candidate = JSON.parse(fs.readFileSync(path.join(directory, "editorial/candidates/paths.json"))).paths.find((p) => p.id === "guitar-foundation");
  const documents = {}, published = {};
  for (const placement of candidate.units.flatMap((u) => u.placements)) {
    const bytes = fs.readFileSync(path.join(directory, "editorial/candidates", placement.path));
    const destination = path.join(directory, "v2/education", placement.path);
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, bytes);
    documents[placement.contentKey] = sha(bytes); published["v2/education/" + placement.path] = sha(bytes);
  }
  // These are explicit synthetic fixture reviews, never authorizations for real publication.
  const approval = { kind: "human", basis: "owner-release", approvedBy: "Synthetic fixture owner", approvedAt: "2026-10-04T12:00:00Z", playthrough: "not-claimed",
    releaseApproval: { kind: "human", status: "approved", scope: "guided-pilot-release", pathIDs: [candidate.id], approvalReference: "fixture-only", approvalStatement: "Synthetic owner release fixture; not real approval." },
    documentSHA256: documents, pathManifestsSHA256: { [candidate.id]: manifestSHA(candidate) },
    independentReview: { status: "approved", reviewer: "Synthetic reviewer", reviewedAt: "2026-10-04T12:00:00Z", reviewReference: "fixture-only", documentSHA256: documents },
    languages: { status: "approved", reviewer: "Synthetic reviewer", reviewedAt: "2026-10-04T12:00:00Z", reviewReference: "fixture-only", documentSHA256: documents, locales: LOCALES } };
  candidate.publicationStatus = "approved"; candidate.humanPlaythrough = "not-claimed";
  candidate.approval = { basis: "owner-release", approvedBy: approval.approvedBy, approvedAt: approval.approvedAt, releaseApproval: approval.releaseApproval,
    documentSHA256: documents, assetSHA256: {}, pathManifestSHA256: manifestSHA(candidate) };
  fs.writeFileSync(path.join(directory, "v2/education/paths.json"), JSON.stringify({ schema: 2, format: 2, revision: 1, requiredCapabilities: ["guided-steps", "localized-regions", "instrument-setup"], paths: [candidate] }));
  fs.mkdirSync(path.join(directory, "editorial/promotions"), { recursive: true });
  fs.writeFileSync(path.join(directory, "editorial/promotions/fixture-pilot.json"), JSON.stringify({ kind: "paths", pathIDs: [candidate.id], status: "promoted", approval, approvalSHA256: digest(approval), pathSHA256: { [candidate.id]: digest(candidate) }, publishedContentSHA256: published }));
  assert.deepEqual(fs.readdirSync(path.join(directory, "editorial/promotions")), ["fixture-pilot.json"]);
  fs.writeFileSync(path.join(directory, "editorial/queue.json"), JSON.stringify({ schema: 1, revision: 1, dailyLimit: 3, newContentModel: "guided-only", items: [] }));
  const gap = JSON.parse(fs.readFileSync(path.join(directory, "editorial/guided-gaps.json"))).gaps[0];
  const origin = candidate.units[0].placements.find((p) => p.contentKey === gap.sourcePattern);
  let markdown = fs.readFileSync(path.join(directory, "v2/education", origin.path), "utf8").replaceAll(origin.lessonID, "guitar-fixture-release-diagnosis");
  for (const locale of LOCALES) {
    const old = markdown.match(new RegExp("^summary\\." + locale + ": (.+)$", "m"))[1];
    markdown = markdown.replace(`summary.${locale}: ${old}`, `summary.${locale}: ${locale === "en" ? gap.objective : "Synthetic fixture objective for " + locale}`);
  }
  return { directory, state: path.join(directory, "fixture-state"), gap, beforePath: structuredClone(candidate),
    spec: { id: "guitar-fixture-release-diagnosis", author: "Synthetic fixture author", reuseApprovedPattern: true, markdown },
    cleanup: () => { fs.rmSync(directory, { recursive: true }); if (fs.existsSync(directory + ".recovery")) fs.rmSync(directory + ".recovery", { recursive: true }); } };
}
function refreshReceipt(f) {
  const file = path.join(f.directory, "editorial/evidence/swift-parser.json"), receipt = JSON.parse(fs.readFileSync(file));
  receipt.reviewOnly = false; receipt.files = digestFiles(f.directory); receipt.candidateFiles = candidateDigests(f.directory);
  fs.writeFileSync(file, JSON.stringify(receipt)); return receipt;
}
function review(f, item) {
  const base = { status: "approved", reviewer: "Synthetic independent reviewer", reviewedAt: "2026-10-04T13:00:00Z", contentSHA256: item.contentSHA256 };
  for (const [gate, kind] of Object.entries({ parser: "source-parser", languages: "independent-language-review", independent: "independent-content-review" }))
    recordReview(f.directory, f.state, item.id, { ...base, gate, kind, ...(gate === "languages" ? { locales: LOCALES } : {}),
      ...(gate === "independent" ? { scope: "approved-pattern-variation", noNewPhysicalPattern: true, substantiveObjective: true,
        patternSHA256: item.approvedPattern.patternSHA256, originDocumentSHA256: item.approvedPattern.documentSHA256 } : {}) });
  return JSON.parse(fs.readFileSync(path.join(f.directory, "editorial/queue.json"))).items[0];
}
test("guided daily policy excludes seven legacy riffs and legacy gaps while retaining existing repairs", () => {
  const items = Array.from({ length: 7 }, (_, i) => ({ id: "legacy-riff-" + i, type: "riff", status: "open" }));
  items.push({ id: "legacy-gap", type: "gap", status: "open", blueprintApproved: true },
    { id: "existing-repair", type: "repair", status: "open" },
    { id: "new-guided", type: "gap", status: "open", blueprintApproved: true, guidedTarget: { role: "extra" } });
  assert.deepEqual(selectItems({ newContentModel: "guided-only", items }, { today: "2026-10-04" }).map((i) => i.id), ["existing-repair", "new-guided"]);
});
test("guided authoring refuses a changed approved pattern before writing and rejects new legacy authorship", () => {
  const f = fixture();
  try {
    assert.equal(listGaps(f.directory)[0].state, "ready-for-authoring");
    const changed = { ...f.spec, markdown: f.spec.markdown.replace("sequence: C4 D4 -", "sequence: C#4 D4 -") };
    assert.throws(() => createGuidedLesson(f.directory, f.state, f.gap.id, changed), /New musical blocks/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.directory, "editorial/queue.json"))).items.length, 0);
    assert.throws(() => execFileSync(process.execPath, [path.join(f.directory, "create-lesson.js"), "--spec", "unused.json", "--locales", LOCALES.join(",")], { cwd: f.directory, stdio: "pipe" }), /New legacy lessons/);
  } finally { f.cleanup(); }
});
test("guided promotion rejects date-only, missing timezone and calendar overflow before a journal or published write", () => {
  const f = fixture();
  try {
    const created = createGuidedLesson(f.directory, f.state, f.gap.id, f.spec);
    refreshReceipt(f);
    const reviewed = review(f, created), queueFile = path.join(f.directory, "editorial/queue.json");
    const before = treeManifest(path.join(f.directory, "v2"));
    for (const reviewedAt of ["2026-10-04", "2026-10-04T13:00:00", "2026-02-30T13:00:00Z"]) {
      recordReview(f.directory, f.state, created.id, { ...reviewed.reviewEvidence.independent, reviewedAt });
      const beforeQueue = fs.readFileSync(queueFile, "utf8");
      assert.throws(() => promoteGuidedGap(f.directory, f.state, created.id, { runtimeConfig }), /strict ISO8601 timestamps/);
      assert.deepEqual(treeManifest(path.join(f.directory, "v2")), before);
      assert.equal(fs.readFileSync(queueFile, "utf8"), beforeQueue);
      assert.equal(fs.existsSync(path.join(f.directory, "editorial/promotions", `guided-gap-${created.id}.json`)), false);
    }
  } finally { f.cleanup(); }
});
test("actual parser: author, independently review and promote an optional exact-pattern gap with frozen enrollment", { skip: !fs.existsSync(runtimeConfig) }, () => {
  const f = fixture();
  try {
    const created = createGuidedLesson(f.directory, f.state, f.gap.id, f.spec);
    const receipt = refreshReceipt(f);
    assert.throws(() => gateItem(created, { root: f.directory, receipt }), /parser approval/);
    const reviewed = review(f, created);
    gateItem(reviewed, { root: f.directory, receipt });
    const beforeIndex = fs.readFileSync(path.join(f.directory, "v2/education/paths.json"));
    const beforeQueue = fs.readFileSync(path.join(f.directory, "editorial/queue.json"));
    const promotion = promoteGuidedGap(f.directory, f.state, created.id, { runtimeConfig });
    require("../scripts/parser-runtime").runCurrentParser(["--paths", path.join(f.directory, "v2/education/paths.json"), "--root", path.join(f.directory, "v2/education")], runtimeConfig);
    const record = JSON.parse(fs.readFileSync(path.join(f.directory, promotion.recordPath)));
    assert.equal(record.parserProof.kind, "full-guided-index");
    assert.equal(record.parserProof.indexSHA256, sha(fs.readFileSync(path.join(f.directory, "v2/education/paths.json"))));
    assert.equal(sha(fs.readFileSync(path.join(f.directory, promotion.target.path))), created.contentSHA256);
    refreshReceipt(f);
    const course = JSON.parse(fs.readFileSync(path.join(f.directory, "v2/education/paths.json"))).paths[0];
    assert.equal(registeredGuidedDelta(f.directory, course), true);
    assert.equal(course.humanPlaythrough, "not-claimed");
    assert.equal(course.approval.basis, "guided-extra-delta");
    assert.deepEqual(course.approval.delta.basePath, f.beforePath);
    assertOnlyExtraAdded(f.beforePath, course, f.spec.id + "-placement");
    const tampered = structuredClone(course); tampered.units[0].placements[0].role = "extra";
    assert.throws(() => assertOnlyExtraAdded(f.beforePath, tampered, f.spec.id + "-placement"), /cannot modify/);
    assert.equal(registeredGuidedDelta(f.directory, tampered), false);
    assert.equal(promoteGuidedGap(f.directory, f.state, created.id, { runtimeConfig }).resumed, true);
    // Simulate interruption after the reviewed MD write, before index/queue/terminal journal.
    record.status = "prepared"; delete record.promotedAt;
    fs.writeFileSync(path.join(f.directory, promotion.recordPath), JSON.stringify(record));
    fs.writeFileSync(path.join(f.directory, "v2/education/paths.json"), beforeIndex);
    fs.writeFileSync(path.join(f.directory, "editorial/queue.json"), beforeQueue);
    promoteGuidedGap(f.directory, f.state, created.id, { runtimeConfig });
    require("../scripts/parser-runtime").runCurrentParser(["--paths", path.join(f.directory, "v2/education/paths.json"), "--root", path.join(f.directory, "v2/education")], runtimeConfig);
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.directory, promotion.recordPath))).status, "promoted");
    assert.equal(registeredGuidedDelta(f.directory, JSON.parse(fs.readFileSync(path.join(f.directory, "v2/education/paths.json"))).paths[0]), true);
    fs.writeFileSync(path.join(f.directory, promotion.target.path), f.spec.markdown.replace("sequence: C4 D4 -", "sequence: C#4 D4 -"));
    assert.equal(registeredGuidedDelta(f.directory, course), false);
  } finally { f.cleanup(); }
});
