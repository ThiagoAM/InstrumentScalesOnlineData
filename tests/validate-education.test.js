const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { validateEducation } = require("../scripts/validate-education");

const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const TIMESTAMP = "2026-03-14T00:00:00Z";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "education-validator-"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function localized(text) {
  return {
    values: Object.fromEntries(LOCALES.map((locale) => [locale, `${text} (${locale})`])),
  };
}

function courseEntry(id, suffix, slug) {
  return {
    id,
    slug,
    name: localized(`${suffix} course`),
    summary: localized(`${suffix} summary`),
    image: {
      type: "url",
      value: `https://example.com/${id}.jpg`,
    },
    tags: ["scales", suffix],
    order: 1,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

function sectionEntry(id) {
  return {
    id,
    name: localized(`${id} name`),
    description: localized(`${id} description`),
    image: null,
    order: 1,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

function lessonEntry(id) {
  return {
    id,
    level: "beginner",
    difficulty: "easy",
    name: localized(`${id} name`),
    description: localized(`${id} description`),
    order: 1,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

function lessonContent(id) {
  return {
    id,
    blocks: [
      {
        type: "text",
        value: localized(`${id} block content`),
      },
    ],
    tests: [],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

function buildCourse(rootDir, tierName, courseId, suffix) {
  const sectionId = `${suffix}-section`;
  const unitId = `${suffix}-unit`;
  const lessonId = `${suffix}-lesson`;

  writeJson(path.join(rootDir, tierName, "courses.json"), {
    schemaVersion: 1,
    courses: [
      courseEntry(
        courseId,
        suffix,
        tierName === "free" ? courseId.replace(/-free$/, "") : courseId
      ),
    ],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  writeText(path.join(rootDir, tierName, "images", `${courseId}.jpg`), "image");

  const courseDir = path.join(rootDir, tierName, "courses", courseId);
  writeJson(path.join(courseDir, "sections.json"), [sectionEntry(sectionId)]);
  writeJson(path.join(courseDir, "lessonIDs.json"), {
    lessonIDs: [`${courseId}/${sectionId}/${unitId}/${lessonId}`],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  const sectionDir = path.join(courseDir, "sections", sectionId);
  writeJson(path.join(sectionDir, "units.json"), [sectionEntry(unitId)]);

  const unitDir = path.join(sectionDir, "units", unitId);
  writeJson(path.join(unitDir, "lessons.json"), [lessonEntry(lessonId)]);

  const lessonDir = path.join(unitDir, "lessons", lessonId);
  writeJson(path.join(lessonDir, "lesson-content.json"), lessonContent(lessonId));
}

function buildValidFixture(rootDir) {
  buildCourse(rootDir, "free", "guitar-free", "free");
  buildCourse(rootDir, "max", "guitar", "max");
}

test("valid minimal education tree passes", () => {
  const rootDir = makeTempDir();
  buildValidFixture(rootDir);

  const result = validateEducation(rootDir);

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.counts, {
    tiers: 2,
    courses: 2,
    sections: 2,
    units: 2,
    lessons: 2,
  });
});

test("mismatched catalog id and directory name fails", () => {
  const rootDir = makeTempDir();
  buildValidFixture(rootDir);

  const wrongDir = path.join(
    rootDir,
    "max",
    "courses",
    "guitar",
    "sections",
    "wrong-section-name"
  );
  const rightDir = path.join(rootDir, "max", "courses", "guitar", "sections", "max-section");
  fs.renameSync(rightDir, wrongDir);

  const result = validateEducation(rootDir);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.map((error) => error.message).join("\n"),
    /Missing section directory "max-section"|Unexpected section directory "wrong-section-name"/
  );
});

test("missing lesson-content.json fails", () => {
  const rootDir = makeTempDir();
  buildValidFixture(rootDir);

  fs.unlinkSync(
    path.join(
      rootDir,
      "free",
      "courses",
      "guitar-free",
      "sections",
      "free-section",
      "units",
      "free-unit",
      "lessons",
      "free-lesson",
      "lesson-content.json"
    )
  );

  const result = validateEducation(rootDir);

  assert.equal(result.valid, false);
  assert.match(result.errors.map((error) => error.message).join("\n"), /File is missing/);
});

test("invalid slug id format fails", () => {
  const rootDir = makeTempDir();
  buildValidFixture(rootDir);

  const coursesPath = path.join(rootDir, "max", "courses.json");
  const coursesJson = JSON.parse(fs.readFileSync(coursesPath, "utf8"));
  coursesJson.courses[0].id = "Bad_ID";
  coursesJson.courses[0].slug = "Bad_ID";
  writeJson(coursesPath, coursesJson);

  const result = validateEducation(rootDir);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.map((error) => error.message).join("\n"),
    /must match \/|Missing course directory/
  );
});

test("missing locale or empty localized string fails", () => {
  const rootDir = makeTempDir();
  buildValidFixture(rootDir);

  const lessonPath = path.join(
    rootDir,
    "max",
    "courses",
    "guitar",
    "sections",
    "max-section",
    "units",
    "max-unit",
    "lessons",
    "max-lesson",
    "lesson-content.json"
  );
  const lessonJson = JSON.parse(fs.readFileSync(lessonPath, "utf8"));
  delete lessonJson.blocks[0].value.values.de;
  lessonJson.blocks[0].value.values.en = "   ";
  writeJson(lessonPath, lessonJson);

  const result = validateEducation(rootDir);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.map((error) => error.message).join("\n"),
    /must use exactly these locales|must be a non-empty string/
  );
});

test("non-contiguous order fails", () => {
  const rootDir = makeTempDir();
  buildValidFixture(rootDir);

  const lessonsPath = path.join(
    rootDir,
    "free",
    "courses",
    "guitar-free",
    "sections",
    "free-section",
    "units",
    "free-unit",
    "lessons.json"
  );
  writeJson(lessonsPath, [
    lessonEntry("free-lesson"),
    { ...lessonEntry("free-lesson-two"), order: 3 },
  ]);
  writeJson(
    path.join(
      rootDir,
      "free",
      "courses",
      "guitar-free",
      "sections",
      "free-section",
      "units",
      "free-unit",
      "lessons",
      "free-lesson-two",
      "lesson-content.json"
    ),
    lessonContent("free-lesson-two")
  );
  writeJson(
    path.join(rootDir, "free", "courses", "guitar-free", "lessonIDs.json"),
    {
      lessonIDs: [
        "guitar-free/free-section/free-unit/free-lesson",
        "guitar-free/free-section/free-unit/free-lesson-two",
      ],
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    }
  );

  const result = validateEducation(rootDir);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.map((error) => error.message).join("\n"),
    /contiguous integers starting at 1/
  );
});

test("lessonIDs drift fails", () => {
  const rootDir = makeTempDir();
  buildValidFixture(rootDir);

  writeJson(path.join(rootDir, "max", "courses", "guitar", "lessonIDs.json"), {
    lessonIDs: ["guitar/max-section/max-unit/not-the-right-lesson"],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  const result = validateEducation(rootDir);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.map((error) => error.message).join("\n"),
    /does not match the generated lesson path list/
  );
});

test("unexpected DS_Store file fails", () => {
  const rootDir = makeTempDir();
  buildValidFixture(rootDir);

  writeText(path.join(rootDir, "free", ".DS_Store"), "junk");

  const result = validateEducation(rootDir);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.map((error) => error.message).join("\n"),
    /Unexpected file or directory/
  );
});

test("invalid timestamp ordering fails", () => {
  const rootDir = makeTempDir();
  buildValidFixture(rootDir);

  const lessonPath = path.join(
    rootDir,
    "free",
    "courses",
    "guitar-free",
    "sections",
    "free-section",
    "units",
    "free-unit",
    "lessons",
    "free-lesson",
    "lesson-content.json"
  );
  const lessonJson = JSON.parse(fs.readFileSync(lessonPath, "utf8"));
  lessonJson.updatedAt = "2026-03-13T00:00:00Z";
  lessonJson.createdAt = "2026-03-14T00:00:00Z";
  writeJson(lessonPath, lessonJson);

  const result = validateEducation(rootDir);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.map((error) => error.message).join("\n"),
    /must not be earlier than/
  );
});
