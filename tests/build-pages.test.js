const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

test("Pages publishes only V2 education and retains home/toggles", () => {
  execFileSync(process.execPath, [path.join(root, "scripts", "build-pages.js")], {
    cwd: root,
    stdio: "pipe",
  });

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
    const sourceCatalog = JSON.parse(fs.readFileSync(
      path.join(root, relativeCourse, "catalog.json"), "utf8",
    ));
    assert.deepEqual(publishedCatalog, sourceCatalog,
      `${courseID} must publish the complete current catalog`);
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
  assert.deepEqual(courseIndex.courses.map((course) => course.id), [
    "instrument-scales",
    "chords-harmony",
  ]);
});
