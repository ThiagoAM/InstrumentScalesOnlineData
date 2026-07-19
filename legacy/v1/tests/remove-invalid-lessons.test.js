const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  removeInvalidLessons,
  runCli,
} = require("../scripts/remove-invalid-lessons");
const {
  MAX_LESSON_BLOCKS,
  MIN_LESSON_BLOCKS,
} = require("../scripts/education-utils");
const { validateEducation } = require("../scripts/validate-education");

const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const TIMESTAMP = "2026-03-14T00:00:00Z";
const CLEANUP_TIMESTAMP = "2026-03-15T00:00:00Z";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "remove-invalid-lessons-test-"));
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

function courseEntry(id, slug, order) {
  return {
    id,
    slug,
    name: localized(`${id} course`),
    summary: localized(`${id} summary`),
    image: {
      type: "url",
      value: `https://example.com/${id}.jpg`,
    },
    tags: ["scales", id],
    order,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

function catalogEntry(id, order) {
  return {
    id,
    name: localized(`${id} name`),
    description: localized(`${id} description`),
    image: null,
    order,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

function lessonEntry(id, order) {
  return {
    id,
    level: "beginner",
    difficulty: "easy",
    name: localized(`${id} lesson`),
    description: localized(`${id} description`),
    order,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

function lessonContent(id, blockCount) {
  return {
    id,
    blocks: Array.from({ length: blockCount }, (_, index) => ({
      type: "text",
      value: localized(`${id} block ${index + 1}`),
    })),
    tests: [],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

function buildCourse(rootDir, tierName, courseId, slug, sectionId, units) {
  writeText(path.join(rootDir, tierName, "images", `${courseId}.jpg`), "image");

  const courseDir = path.join(rootDir, tierName, "courses", courseId);
  writeJson(path.join(courseDir, "sections.json"), [catalogEntry(sectionId, 1)]);
  writeJson(
    path.join(courseDir, "sections", sectionId, "units.json"),
    units.map((unit, index) => catalogEntry(unit.unitId, index + 1))
  );

  const lessonIDs = [];

  for (const unit of units) {
    writeJson(
      path.join(courseDir, "sections", sectionId, "units", unit.unitId, "lessons.json"),
      unit.lessons.map((lesson) => lessonEntry(lesson.id, lesson.order))
    );

    for (const lesson of unit.lessons) {
      writeJson(
        path.join(
          courseDir,
          "sections",
          sectionId,
          "units",
          unit.unitId,
          "lessons",
          lesson.id,
          "lesson-content.json"
        ),
        lessonContent(lesson.id, lesson.blockCount)
      );
      lessonIDs.push(`${courseId}/${sectionId}/${unit.unitId}/${lesson.id}`);
    }
  }

  writeJson(path.join(courseDir, "lessonIDs.json"), {
    lessonIDs,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  return courseEntry(courseId, slug, 1);
}

function buildFixture(rootDir, options = {}) {
  const freeCourse = buildCourse(
    rootDir,
    "free",
    "bass-free",
    "bass",
    "free-section",
    options.freeUnits || [
      {
        unitId: "free-unit",
        lessons: [
          { id: "free-valid", order: 1, blockCount: MIN_LESSON_BLOCKS },
        ],
      },
    ]
  );

  const maxCourse = buildCourse(
    rootDir,
    "max",
    "guitar",
    "guitar",
    "max-section",
    options.maxUnits || [
      {
        unitId: "target-unit",
        lessons: [
          { id: "valid-lesson-1", order: 1, blockCount: MIN_LESSON_BLOCKS },
          { id: "valid-lesson-2", order: 2, blockCount: MIN_LESSON_BLOCKS },
        ],
      },
    ]
  );

  writeJson(path.join(rootDir, "free", "courses.json"), {
    schemaVersion: 1,
    courses: [freeCourse],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });
  writeJson(path.join(rootDir, "max", "courses.json"), {
    schemaVersion: 1,
    courses: [maxCourse],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });
}

function createOutputBuffer() {
  let output = "";

  return {
    stream: {
      write(chunk) {
        output += String(chunk);
      },
    },
    read() {
      return output;
    },
  };
}

test("removeInvalidLessons removes invalid lessons, renumbers orders, rebuilds lessonIDs, and preserves unrelated content", () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir, {
    freeUnits: [
      {
        unitId: "free-unit",
        lessons: [
          { id: "invalid-long-free", order: 1, blockCount: MAX_LESSON_BLOCKS + 1 },
          { id: "free-valid", order: 2, blockCount: MIN_LESSON_BLOCKS },
        ],
      },
    ],
    maxUnits: [
      {
        unitId: "target-unit",
        lessons: [
          { id: "valid-lesson-1", order: 1, blockCount: MIN_LESSON_BLOCKS },
          { id: "invalid-short", order: 2, blockCount: MIN_LESSON_BLOCKS - 3 },
          { id: "valid-lesson-2", order: 3, blockCount: MIN_LESSON_BLOCKS },
          { id: "invalid-long", order: 4, blockCount: MAX_LESSON_BLOCKS + 1 },
        ],
      },
      {
        unitId: "later-unit",
        lessons: [
          { id: "later-valid", order: 1, blockCount: MIN_LESSON_BLOCKS },
        ],
      },
    ],
  });

  const result = removeInvalidLessons({
    rootDir,
    timestamp: CLEANUP_TIMESTAMP,
  });

  assert.deepEqual(
    result.removedLessons.map((lesson) => lesson.lessonId).sort(),
    ["invalid-long", "invalid-long-free", "invalid-short"]
  );
  assert.equal(result.unitsTouched, 2);
  assert.equal(result.coursesTouched, 2);

  const targetLessons = JSON.parse(
    fs.readFileSync(
      path.join(
        rootDir,
        "max",
        "courses",
        "guitar",
        "sections",
        "max-section",
        "units",
        "target-unit",
        "lessons.json"
      ),
      "utf8"
    )
  );
  assert.deepEqual(
    targetLessons.map((lesson) => ({
      id: lesson.id,
      order: lesson.order,
      updatedAt: lesson.updatedAt,
    })),
    [
      { id: "valid-lesson-1", order: 1, updatedAt: TIMESTAMP },
      { id: "valid-lesson-2", order: 2, updatedAt: CLEANUP_TIMESTAMP },
    ]
  );

  const freeLessons = JSON.parse(
    fs.readFileSync(
      path.join(
        rootDir,
        "free",
        "courses",
        "bass-free",
        "sections",
        "free-section",
        "units",
        "free-unit",
        "lessons.json"
      ),
      "utf8"
    )
  );
  assert.deepEqual(
    freeLessons.map((lesson) => ({
      id: lesson.id,
      order: lesson.order,
      updatedAt: lesson.updatedAt,
    })),
    [
      { id: "free-valid", order: 1, updatedAt: CLEANUP_TIMESTAMP },
    ]
  );

  const laterLessons = JSON.parse(
    fs.readFileSync(
      path.join(
        rootDir,
        "max",
        "courses",
        "guitar",
        "sections",
        "max-section",
        "units",
        "later-unit",
        "lessons.json"
      ),
      "utf8"
    )
  );
  assert.equal(laterLessons[0].id, "later-valid");
  assert.equal(laterLessons[0].updatedAt, TIMESTAMP);

  const guitarLessonIds = JSON.parse(
    fs.readFileSync(path.join(rootDir, "max", "courses", "guitar", "lessonIDs.json"), "utf8")
  );
  assert.deepEqual(guitarLessonIds.lessonIDs, [
    "guitar/max-section/target-unit/valid-lesson-1",
    "guitar/max-section/target-unit/valid-lesson-2",
    "guitar/max-section/later-unit/later-valid",
  ]);
  assert.equal(guitarLessonIds.createdAt, TIMESTAMP);
  assert.equal(guitarLessonIds.updatedAt, CLEANUP_TIMESTAMP);

  const freeLessonIds = JSON.parse(
    fs.readFileSync(path.join(rootDir, "free", "courses", "bass-free", "lessonIDs.json"), "utf8")
  );
  assert.deepEqual(freeLessonIds.lessonIDs, [
    "bass-free/free-section/free-unit/free-valid",
  ]);
  assert.equal(freeLessonIds.createdAt, TIMESTAMP);
  assert.equal(freeLessonIds.updatedAt, CLEANUP_TIMESTAMP);

  assert.equal(
    fs.existsSync(
      path.join(
        rootDir,
        "max",
        "courses",
        "guitar",
        "sections",
        "max-section",
        "units",
        "target-unit",
        "lessons",
        "invalid-short"
      )
    ),
    false
  );
  assert.equal(
    fs.existsSync(
      path.join(
        rootDir,
        "max",
        "courses",
        "guitar",
        "sections",
        "max-section",
        "units",
        "target-unit",
        "lessons",
        "invalid-long"
      )
    ),
    false
  );
  assert.equal(
    fs.existsSync(
      path.join(
        rootDir,
        "free",
        "courses",
        "bass-free",
        "sections",
        "free-section",
        "units",
        "free-unit",
        "lessons",
        "invalid-long-free"
      )
    ),
    false
  );

  const validationResult = validateEducation(rootDir);
  assert.equal(validationResult.valid, true);
});

test("runCli reports a no-op success summary when nothing is invalid", async () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir);
  const output = createOutputBuffer();

  const before = fs.readFileSync(
    path.join(
      rootDir,
      "max",
      "courses",
      "guitar",
      "sections",
      "max-section",
      "units",
      "target-unit",
      "lessons.json"
    ),
    "utf8"
  );

  const result = await runCli(["--root", rootDir], {
    output: output.stream,
  });

  assert.equal(result.removedLessons.length, 0);
  assert.match(output.read(), /No invalid lessons found/);
  assert.match(output.read(), /Validation passed/);
  assert.equal(
    fs.readFileSync(
      path.join(
        rootDir,
        "max",
        "courses",
        "guitar",
        "sections",
        "max-section",
        "units",
        "target-unit",
        "lessons.json"
      ),
      "utf8"
    ),
    before
  );
});
