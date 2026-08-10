const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

test("Pages artifact preserves the public V1 and V2 contracts", () => {
  execFileSync(process.execPath, [path.join(root, "scripts", "build-pages.js")], {
    cwd: root,
    stdio: "pipe",
  });

  const requiredFiles = [
    "v1/education/free/courses.json",
    "v1/education/max/courses.json",
    "v1/education/free/images/guitar-free.jpg",
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

  const freeCourses = JSON.parse(
    fs.readFileSync(path.join(dist, "v1/education/free/courses.json"), "utf8"),
  );
  const maxCourses = JSON.parse(
    fs.readFileSync(path.join(dist, "v1/education/max/courses.json"), "utf8"),
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

  assert.equal(freeCourses.courses.length, 3);
  assert.equal(maxCourses.courses.length, 3);
  assert.equal(v2Catalog.sections.length, 3);
  assert.equal(
    v2Catalog.sections.flatMap((section) =>
      section.units.flatMap((unit) => unit.lessons)
    ).length,
    372,
  );
  assert.equal(
    harmonyCatalog.sections.flatMap((section) =>
      section.units.flatMap((unit) => unit.lessons)
    ).length,
    313,
  );
  assert.deepEqual(courseIndex.courses.map((course) => course.id), [
    "instrument-scales",
    "chords-harmony",
  ]);
});
