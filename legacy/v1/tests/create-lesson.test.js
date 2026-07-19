const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  CreateLessonError,
  MAX_LESSON_BLOCKS,
  MIN_LESSON_BLOCKS,
  createLesson,
  parseMarkdownDirectory,
  runCli,
} = require("../scripts/create-lesson");
const { validateEducation } = require("../scripts/validate-education");

const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const TIMESTAMP = "2026-03-14T00:00:00Z";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-lesson-test-"));
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

function lessonContent(id) {
  return {
    id,
    blocks: [
      {
        type: "text",
        value: localized(`${id} block 1`),
      },
      {
        type: "text",
        value: localized(`${id} block 2`),
      },
      {
        type: "text",
        value: localized(`${id} block 3`),
      },
      {
        type: "text",
        value: localized(`${id} block 4`),
      },
    ],
    tests: [],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

function buildCourse(rootDir, tierName, courseId, slug, suffix) {
  writeText(path.join(rootDir, tierName, "images", `${courseId}.jpg`), "image");

  const courseDir = path.join(rootDir, tierName, "courses", courseId);
  const sectionId = `${suffix}-section`;
  const unitId = `${suffix}-unit`;
  const lessonId = `${suffix}-lesson`;

  writeJson(path.join(courseDir, "sections.json"), [catalogEntry(sectionId, 1)]);
  writeJson(path.join(courseDir, "lessonIDs.json"), {
    lessonIDs: [`${courseId}/${sectionId}/${unitId}/${lessonId}`],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  writeJson(path.join(courseDir, "sections", sectionId, "units.json"), [catalogEntry(unitId, 1)]);
  writeJson(
    path.join(courseDir, "sections", sectionId, "units", unitId, "lessons.json"),
    [lessonEntry(lessonId, 1)]
  );
  writeJson(
    path.join(
      courseDir,
      "sections",
      sectionId,
      "units",
      unitId,
      "lessons",
      lessonId,
      "lesson-content.json"
    ),
    lessonContent(lessonId)
  );

  return courseEntry(courseId, slug, 1);
}

function buildFixture(rootDir) {
  const freeCourse = buildCourse(rootDir, "free", "guitar-free", "guitar", "free");

  writeJson(path.join(rootDir, "free", "courses.json"), {
    schemaVersion: 1,
    courses: [freeCourse],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  writeText(path.join(rootDir, "max", "images", "guitar.jpg"), "image");
  writeJson(path.join(rootDir, "max", "courses.json"), {
    schemaVersion: 1,
    courses: [courseEntry("guitar", "guitar", 1)],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  const courseDir = path.join(rootDir, "max", "courses", "guitar");
  writeJson(path.join(courseDir, "sections.json"), [catalogEntry("max-section", 1)]);
  writeJson(path.join(courseDir, "sections", "max-section", "units.json"), [
    catalogEntry("target-unit", 1),
    catalogEntry("later-unit", 2),
  ]);
  writeJson(path.join(courseDir, "sections", "max-section", "units", "target-unit", "lessons.json"), [
    lessonEntry("existing-lesson-1", 1),
    lessonEntry("existing-lesson-2", 2),
  ]);
  writeJson(
    path.join(courseDir, "sections", "max-section", "units", "later-unit", "lessons.json"),
    [lessonEntry("later-unit-lesson", 1)]
  );
  writeJson(
    path.join(
      courseDir,
      "sections",
      "max-section",
      "units",
      "target-unit",
      "lessons",
      "existing-lesson-1",
      "lesson-content.json"
    ),
    lessonContent("existing-lesson-1")
  );
  writeJson(
    path.join(
      courseDir,
      "sections",
      "max-section",
      "units",
      "target-unit",
      "lessons",
      "existing-lesson-2",
      "lesson-content.json"
    ),
    lessonContent("existing-lesson-2")
  );
  writeJson(
    path.join(
      courseDir,
      "sections",
      "max-section",
      "units",
      "later-unit",
      "lessons",
      "later-unit-lesson",
      "lesson-content.json"
    ),
    lessonContent("later-unit-lesson")
  );
  writeJson(path.join(courseDir, "lessonIDs.json"), {
    lessonIDs: [
      "guitar/max-section/target-unit/existing-lesson-1",
      "guitar/max-section/target-unit/existing-lesson-2",
      "guitar/max-section/later-unit/later-unit-lesson",
    ],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });
}

function writeMarkdownDir(rootDir, options = {}) {
  const markdownDir = fs.mkdtempSync(path.join(os.tmpdir(), "lesson-markdown-fixture-"));

  for (const locale of LOCALES) {
    const blocks = options.blocks || [
      `First block (${locale})`,
      `Second block (${locale})`,
      `Third block (${locale})`,
      `Fourth block (${locale})`,
    ];
    const body = blocks.join("\n\n<!-- block -->\n\n");
    const content = [
      "---",
      `name: ${options.namePrefix || "Lesson name"} ${locale}`,
      `description: ${options.descriptionPrefix || "Lesson description"} ${locale}`,
      "---",
      body,
      "",
    ].join("\n");
    writeText(path.join(markdownDir, `${locale}.md`), content);
  }

  return markdownDir;
}

function makeMarkdownBlocks(count, locale) {
  return Array.from({ length: count }, (_, index) => `Block ${index + 1} (${locale})`);
}

function createPromptApi(answers) {
  let index = 0;

  return {
    async ask() {
      if (index >= answers.length) {
        throw new Error("Prompted for more answers than expected.");
      }

      const answer = answers[index];
      index += 1;
      return answer;
    },
  };
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

test("runCli creates a lesson at the default append position", async () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir);
  const markdownDir = writeMarkdownDir(rootDir);
  const output = createOutputBuffer();

  const result = await runCli(
    ["--root", rootDir, "--markdown-dir", markdownDir],
    {
      output: output.stream,
      promptApi: createPromptApi(["2", "1", "1", "1", "fresh-lesson", "", "1", "1"]),
    }
  );

  assert.equal(result.lessonId, "fresh-lesson");

  const lessons = JSON.parse(
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
  const lessonIds = lessons.map((lesson) => lesson.id);
  assert.deepEqual(lessonIds, ["existing-lesson-1", "existing-lesson-2", "fresh-lesson"]);
  assert.equal(lessons[2].order, 3);
  assert.equal(lessons[2].name.values.en, "Lesson name en");

  const lessonContentJson = JSON.parse(
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
        "lessons",
        "fresh-lesson",
        "lesson-content.json"
      ),
      "utf8"
    )
  );
  assert.equal(lessonContentJson.blocks.length, MIN_LESSON_BLOCKS);
  assert.equal(lessonContentJson.blocks[0].value.values.de, "First block (de)");

  const validationResult = validateEducation(rootDir);
  assert.equal(validationResult.valid, true);
  assert.match(output.read(), /Created lesson "fresh-lesson"/);
});

test("runCli inserts in the middle, renumbers orders, and rebuilds lessonIDs", async () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir);
  const markdownDir = writeMarkdownDir(rootDir, {
    namePrefix: "Inserted name",
    descriptionPrefix: "Inserted description",
  });

  await runCli(
    ["--root", rootDir, "--markdown-dir", markdownDir],
    {
      output: createOutputBuffer().stream,
      promptApi: createPromptApi(["2", "1", "1", "1", "inserted-lesson", "2", "2", "2"]),
    }
  );

  const lessons = JSON.parse(
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
    lessons.map((lesson) => ({
      id: lesson.id,
      order: lesson.order,
    })),
    [
      { id: "existing-lesson-1", order: 1 },
      { id: "inserted-lesson", order: 2 },
      { id: "existing-lesson-2", order: 3 },
    ]
  );
  assert.match(lessons[1].createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(lessons[1].updatedAt, lessons[1].createdAt);
  assert.equal(lessons[2].updatedAt !== TIMESTAMP, true);

  const lessonIdsFile = JSON.parse(
    fs.readFileSync(path.join(rootDir, "max", "courses", "guitar", "lessonIDs.json"), "utf8")
  );
  assert.deepEqual(lessonIdsFile.lessonIDs, [
    "guitar/max-section/target-unit/existing-lesson-1",
    "guitar/max-section/target-unit/inserted-lesson",
    "guitar/max-section/target-unit/existing-lesson-2",
    "guitar/max-section/later-unit/later-unit-lesson",
  ]);
});

test("runCli fails before repo mutation when a locale markdown file is missing", async () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir);
  const markdownDir = writeMarkdownDir(rootDir);
  fs.unlinkSync(path.join(markdownDir, "de.md"));

  const lessonsPath = path.join(
    rootDir,
    "max",
    "courses",
    "guitar",
    "sections",
    "max-section",
    "units",
    "target-unit",
    "lessons.json"
  );
  const before = fs.readFileSync(lessonsPath, "utf8");

  await assert.rejects(
    () =>
      runCli(["--root", rootDir, "--markdown-dir", markdownDir], {
        output: createOutputBuffer().stream,
        promptApi: createPromptApi(["2", "1", "1", "1", "missing-locale-lesson", "", "1", "1"]),
      }),
    /Missing locale markdown file/
  );

  assert.equal(fs.readFileSync(lessonsPath, "utf8"), before);
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
        "missing-locale-lesson"
      )
    ),
    false
  );
});

test("runCli fails before repo mutation on malformed block delimiter", async () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir);
  const markdownDir = writeMarkdownDir(rootDir);
  writeText(
    path.join(markdownDir, "en.md"),
    [
      "---",
      "name: Broken en",
      "description: Broken description en",
      "---",
      "First line <!-- block --> second line",
      "",
    ].join("\n")
  );

  const lessonsPath = path.join(
    rootDir,
    "max",
    "courses",
    "guitar",
    "sections",
    "max-section",
    "units",
    "target-unit",
    "lessons.json"
  );
  const before = fs.readFileSync(lessonsPath, "utf8");

  await assert.rejects(
    () =>
      runCli(["--root", rootDir, "--markdown-dir", markdownDir], {
        output: createOutputBuffer().stream,
        promptApi: createPromptApi(["2", "1", "1", "1", "broken-lesson", "", "1", "1"]),
      }),
    /malformed block delimiter/
  );

  assert.equal(fs.readFileSync(lessonsPath, "utf8"), before);
});

test("runCli creates a lesson when markdown produces exactly the minimum block count", async () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir);
  const markdownDir = writeMarkdownDir(rootDir, {
    blocks: makeMarkdownBlocks(MIN_LESSON_BLOCKS, "en"),
  });
  const output = createOutputBuffer();

  for (const locale of LOCALES) {
    const body = makeMarkdownBlocks(MIN_LESSON_BLOCKS, locale).join("\n\n<!-- block -->\n\n");
    writeText(
      path.join(markdownDir, `${locale}.md`),
      [
        "---",
        `name: Lesson name ${locale}`,
        `description: Lesson description ${locale}`,
        "---",
        body,
        "",
      ].join("\n")
    );
  }

  await runCli(["--root", rootDir, "--markdown-dir", markdownDir], {
    output: output.stream,
    promptApi: createPromptApi(["2", "1", "1", "1", "minimum-block-lesson", "", "1", "1"]),
  });

  const lessonContentJson = JSON.parse(
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
        "lessons",
        "minimum-block-lesson",
        "lesson-content.json"
      ),
      "utf8"
    )
  );
  assert.equal(lessonContentJson.blocks.length, MIN_LESSON_BLOCKS);
});

test("runCli creates a lesson when markdown produces exactly the maximum block count", async () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir);
  const markdownDir = writeMarkdownDir(rootDir);

  for (const locale of LOCALES) {
    const body = makeMarkdownBlocks(MAX_LESSON_BLOCKS, locale).join("\n\n<!-- block -->\n\n");
    writeText(
      path.join(markdownDir, `${locale}.md`),
      [
        "---",
        `name: Lesson name ${locale}`,
        `description: Lesson description ${locale}`,
        "---",
        body,
        "",
      ].join("\n")
    );
  }

  await runCli(["--root", rootDir, "--markdown-dir", markdownDir], {
    output: createOutputBuffer().stream,
    promptApi: createPromptApi(["2", "1", "1", "1", "maximum-block-lesson", "", "1", "1"]),
  });

  const lessonContentJson = JSON.parse(
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
        "lessons",
        "maximum-block-lesson",
        "lesson-content.json"
      ),
      "utf8"
    )
  );
  assert.equal(lessonContentJson.blocks.length, MAX_LESSON_BLOCKS);
});

test("runCli fails before repo mutation when markdown produces fewer than the minimum block count", async () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir);
  const markdownDir = writeMarkdownDir(rootDir);
  const lessonsPath = path.join(
    rootDir,
    "max",
    "courses",
    "guitar",
    "sections",
    "max-section",
    "units",
    "target-unit",
    "lessons.json"
  );
  const before = fs.readFileSync(lessonsPath, "utf8");

  for (const locale of LOCALES) {
    const body = makeMarkdownBlocks(MIN_LESSON_BLOCKS - 1, locale).join("\n\n<!-- block -->\n\n");
    writeText(
      path.join(markdownDir, `${locale}.md`),
      [
        "---",
        `name: Lesson name ${locale}`,
        `description: Lesson description ${locale}`,
        "---",
        body,
        "",
      ].join("\n")
    );
  }

  await assert.rejects(
    () =>
      runCli(["--root", rootDir, "--markdown-dir", markdownDir], {
        output: createOutputBuffer().stream,
        promptApi: createPromptApi(["2", "1", "1", "1", "too-short-lesson", "", "1", "1"]),
      }),
    /between 4 and 10 blocks/
  );

  assert.equal(fs.readFileSync(lessonsPath, "utf8"), before);
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
        "too-short-lesson"
      )
    ),
    false
  );
});

test("runCli fails before repo mutation when markdown produces more than the maximum block count", async () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir);
  const markdownDir = writeMarkdownDir(rootDir);
  const lessonsPath = path.join(
    rootDir,
    "max",
    "courses",
    "guitar",
    "sections",
    "max-section",
    "units",
    "target-unit",
    "lessons.json"
  );
  const before = fs.readFileSync(lessonsPath, "utf8");

  for (const locale of LOCALES) {
    const body = makeMarkdownBlocks(MAX_LESSON_BLOCKS + 1, locale).join("\n\n<!-- block -->\n\n");
    writeText(
      path.join(markdownDir, `${locale}.md`),
      [
        "---",
        `name: Lesson name ${locale}`,
        `description: Lesson description ${locale}`,
        "---",
        body,
        "",
      ].join("\n")
    );
  }

  await assert.rejects(
    () =>
      runCli(["--root", rootDir, "--markdown-dir", markdownDir], {
        output: createOutputBuffer().stream,
        promptApi: createPromptApi(["2", "1", "1", "1", "too-long-lesson", "", "1", "1"]),
      }),
    /between 4 and 10 blocks/
  );

  assert.equal(fs.readFileSync(lessonsPath, "utf8"), before);
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
        "too-long-lesson"
      )
    ),
    false
  );
});

test("createLesson rejects an invalid lesson slug", () => {
  const rootDir = makeTempDir();
  buildFixture(rootDir);
  const markdownDir = writeMarkdownDir(rootDir);
  const localizedContent = parseMarkdownDirectory(markdownDir);

  assert.throws(
    () =>
      createLesson({
        rootDir,
        tierName: "max",
        courseId: "guitar",
        sectionId: "max-section",
        unitId: "target-unit",
        lessonId: "Bad_Lesson",
        insertPosition: 3,
        level: "beginner",
        difficulty: "easy",
        localizedContent,
      }),
    CreateLessonError
  );
});
