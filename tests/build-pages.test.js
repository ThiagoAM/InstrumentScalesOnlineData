const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const scratch = fs.mkdtempSync(
  path.join(require("node:os").tmpdir(), "pages-build-fixture-"),
);
const fixtureRoot = path.join(scratch, "repo"),
  stateRoot = path.join(scratch, "state");
fs.mkdirSync(fixtureRoot);
for (const name of ["v1", "v2", "editorial", "scripts", "site"])
  fs.cpSync(path.join(root, name), path.join(fixtureRoot, name), {
    recursive: true,
  });
const dist = path.join(fixtureRoot, "dist");
test.after(() => fs.rmSync(scratch, { recursive: true }));

test("Pages publishes only V2 education and retains home/toggles", () => {
  execFileSync(
    process.execPath,
    [path.join(root, "scripts", "build-pages.js"), "--review-snapshot"],
    {
      cwd: root,
      stdio: "pipe",
      env: {
        ...process.env,
        EDITORIAL_REPOSITORY_ROOT: fixtureRoot,
        EDITORIAL_STATE_ROOT: stateRoot,
      },
    },
  );

  const requiredFiles = [
    "v1/home/home.json",
    "v1/toggles/feature-toggles.json",
    "v2/education/courses.json",
    "v2/education/courses/instrument-scales/course.json",
    "v2/education/courses/instrument-scales/catalog.json",
    "v2/education/courses/chords-harmony/course.json",
    "v2/education/courses/chords-harmony/catalog.json",
    "v2/daily/riffs.json",
    ".nojekyll",
  ];

  for (const relativePath of requiredFiles) {
    const publishedPath = path.join(dist, relativePath);
    assert.equal(
      fs.existsSync(publishedPath),
      true,
      `Missing published compatibility file: ${relativePath}`,
    );
  }

  assert.equal(fs.existsSync(path.join(dist, "v1/education")), false);
  assert.equal(fs.existsSync(path.join(dist, "editorial")), false);
  const snapshot = JSON.parse(
    fs.readFileSync(path.join(dist, "snapshot.json"), "utf8"),
  );
  assert.equal(snapshot.publicationStatus, "review-pending");
  const published = JSON.parse(
    fs.readFileSync(path.join(dist, "v2/education/paths.json"), "utf8"),
  );
  for (const p of published.paths) {
    assert.equal(p.publicationStatus, "approved");
    if (p.approval.basis === "owner-release") {
      assert.equal(p.humanPlaythrough, "not-claimed");
      assert.equal(p.approval.releaseApproval.kind, "human");
      assert.equal(p.approval.releaseApproval.status, "approved");
      assert.equal(p.approval.releaseApproval.scope, "guided-pilot-release");
      assert.ok(p.approval.releaseApproval.pathIDs.includes(p.id));
    } else if (p.approval.basis === "guided-extra-delta") {
      assert.equal(p.humanPlaythrough, p.approval.delta.basePath.humanPlaythrough);
      assert.equal(require("../scripts/promote-guided-gap").registeredGuidedDelta(fixtureRoot, p), true);
    } else {
      assert.ok(!p.approval.basis || p.approval.basis === "human-playthrough");
      assert.equal(p.humanPlaythrough, "approved");
    }
    assert.equal(require("../scripts/coordinated-publication").registeredPathPromotion(fixtureRoot, p), true);
    for (const l of p.units.flatMap((u) => u.placements))
      assert.equal(
        require("../scripts/audit-swift-parser").sha(
          fs.readFileSync(path.join(dist, "v2/education", l.path)),
        ),
        p.approval.documentSHA256[l.contentKey],
      );
  }
  if (fs.existsSync(path.join(root, "site/instrument-scales")))
    assert.ok(
      fs.existsSync(path.join(dist, "instrument-scales")),
      "Local review may show prepared commercial source.",
    );
  const v2Catalog = JSON.parse(
    fs.readFileSync(
      path.join(dist, "v2/education/courses/instrument-scales/catalog.json"),
      "utf8",
    ),
  );
  const harmonyCatalog = JSON.parse(
    fs.readFileSync(
      path.join(dist, "v2/education/courses/chords-harmony/catalog.json"),
      "utf8",
    ),
  );
  const courseIndex = JSON.parse(
    fs.readFileSync(path.join(dist, "v2/education/courses.json"), "utf8"),
  );

  assert.equal(v2Catalog.sections.length, 3);
  for (const [courseID, publishedCatalog] of [
    ["instrument-scales", v2Catalog],
    ["chords-harmony", harmonyCatalog],
  ]) {
    const relativeCourse = path.join("v2", "education", "courses", courseID);
    const sourceCatalog = JSON.parse(
      fs.readFileSync(path.join(root, relativeCourse, "catalog.json"), "utf8"),
    );
    assert.deepEqual(
      publishedCatalog,
      sourceCatalog,
      `${courseID} must publish the complete current catalog`,
    );
    for (const section of sourceCatalog.sections) {
      for (const unit of section.units) {
        for (const lesson of unit.lessons) {
          const relativeLesson = path.join(relativeCourse, lesson.path);
          assert.equal(
            fs.readFileSync(path.join(dist, relativeLesson), "utf8"),
            fs.readFileSync(path.join(root, relativeLesson), "utf8"),
            `Published lesson must match its source: ${courseID}/${lesson.id}`,
          );
        }
      }
    }
  }
  assert.deepEqual(
    courseIndex.courses.map((course) => course.id),
    ["instrument-scales", "chords-harmony"],
  );
});
