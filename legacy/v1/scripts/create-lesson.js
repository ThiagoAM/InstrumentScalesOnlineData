#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline/promises");

const {
  REQUIRED_LOCALES,
  LEVEL_OPTIONS,
  DIFFICULTY_OPTIONS,
  MIN_LESSON_BLOCKS,
  MAX_LESSON_BLOCKS,
  SLUG_PATTERN,
  defaultEducationRoot,
  isPlainObject,
  makeUtcTimestamp,
  readJson,
  writeJson,
  ensureDirectory,
  listExistingTiers,
  loadCourses,
  loadSections,
  loadUnits,
  loadLessons,
  courseLessonIdsFile,
  lessonDir,
  lessonContentFile,
  unitLessonsFile,
  generateCourseLessonIds,
} = require("./education-utils");
const {
  validateEducation,
  formatValidationErrors,
  formatSuccess,
} = require("./validate-education");

const BLOCK_DELIMITER = "<!-- block -->";
const TEMPLATE_PREFIX = "lesson-markdown-";

class CreateLessonError extends Error {}

function usage() {
  return [
    "Usage: node scripts/create-lesson.js [--root <path>] [--markdown-dir <path>]",
    "",
    "Options:",
    "  --root <path>          Path to the v1/education directory.",
    "  --markdown-dir <path>  Reuse an existing directory with the six locale markdown files.",
    "  --help                 Show this help message.",
  ].join("\n");
}

function parseCliArgs(argv) {
  const options = {
    rootDir: defaultEducationRoot(),
    markdownDir: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help") {
      options.help = true;
      continue;
    }

    if (argument === "--root" || argument === "--markdown-dir") {
      const value = argv[index + 1];

      if (!value) {
        throw new CreateLessonError(`Missing value for ${argument}.\n\n${usage()}`);
      }

      if (argument === "--root") {
        options.rootDir = path.resolve(value);
      } else {
        options.markdownDir = path.resolve(value);
      }

      index += 1;
      continue;
    }

    throw new CreateLessonError(`Unknown argument "${argument}".\n\n${usage()}`);
  }

  return options;
}

function formatEntryLabel(entry, fallbackLocale = "en") {
  const localizedName = entry && entry.name && entry.name.values
    ? entry.name.values[fallbackLocale]
    : null;

  if (typeof localizedName === "string" && localizedName.trim().length > 0) {
    return `${entry.id} - ${localizedName}`;
  }

  return String(entry.id);
}

async function promptChoice(prompt, choices, ask, output) {
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new CreateLessonError(`No choices available for "${prompt}".`);
  }

  output.write(`\n${prompt}\n`);

  choices.forEach((choice, index) => {
    output.write(`  ${index + 1}. ${choice.label}\n`);
  });

  while (true) {
    const answer = (await ask("Select a number: ")).trim();
    const choiceIndex = Number.parseInt(answer, 10);

    if (Number.isInteger(choiceIndex) && choiceIndex >= 1 && choiceIndex <= choices.length) {
      return choices[choiceIndex - 1].value;
    }

    output.write("Enter one of the listed numbers.\n");
  }
}

async function promptRequiredText(prompt, ask, output, validator) {
  while (true) {
    const answer = (await ask(prompt)).trim();

    if (answer.length === 0) {
      output.write("A value is required.\n");
      continue;
    }

    if (typeof validator === "function") {
      const errorMessage = validator(answer);

      if (errorMessage) {
        output.write(`${errorMessage}\n`);
        continue;
      }
    }

    return answer;
  }
}

async function promptInsertPosition(lessonCount, ask, output) {
  const defaultValue = lessonCount + 1;

  while (true) {
    const answer = (await ask(
      `Insert position [1-${defaultValue}] (Enter for ${defaultValue}): `
    )).trim();

    if (answer.length === 0) {
      return defaultValue;
    }

    const position = Number.parseInt(answer, 10);

    if (Number.isInteger(position) && position >= 1 && position <= defaultValue) {
      return position;
    }

    output.write(`Enter an integer from 1 to ${defaultValue}.\n`);
  }
}

function generateLocaleMarkdownTemplates(markdownDir) {
  ensureDirectory(markdownDir);

  for (const locale of REQUIRED_LOCALES) {
    const filePath = path.join(markdownDir, `${locale}.md`);
    const template = ["---", "name: ", "description: ", "---", "", ""].join("\n");
    fs.writeFileSync(filePath, template, "utf8");
  }

  return markdownDir;
}

function parseLocaleHeader(filePath, headerText) {
  const fields = {};

  for (const rawLine of headerText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.length === 0) {
      continue;
    }

    const separatorIndex = line.indexOf(":");

    if (separatorIndex <= 0) {
      throw new CreateLessonError(
        `${filePath}: invalid header line "${rawLine}". Use "name: ..." and "description: ...".`
      );
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key !== "name" && key !== "description") {
      throw new CreateLessonError(
        `${filePath}: unsupported header field "${key}". Only "name" and "description" are allowed.`
      );
    }

    if (fields[key]) {
      throw new CreateLessonError(`${filePath}: duplicate "${key}" header field.`);
    }

    if (value.length === 0) {
      throw new CreateLessonError(`${filePath}: "${key}" must not be empty.`);
    }

    fields[key] = value;
  }

  if (!fields.name || !fields.description) {
    throw new CreateLessonError(
      `${filePath}: header must define non-empty "name" and "description" fields.`
    );
  }

  return fields;
}

function splitMarkdownBlocks(filePath, bodyText) {
  const lines = bodyText.split(/\r?\n/);
  const blocks = [];
  let currentLines = [];

  function flushBlock() {
    const block = currentLines.join("\n").trim();

    if (block.length === 0) {
      throw new CreateLessonError(
        `${filePath}: empty lesson block. Use "${BLOCK_DELIMITER}" only between non-empty blocks.`
      );
    }

    blocks.push(block);
    currentLines = [];
  }

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === BLOCK_DELIMITER) {
      flushBlock();
      continue;
    }

    if (
      (line.includes("<!--") || line.includes("-->")) &&
      trimmedLine !== BLOCK_DELIMITER &&
      trimmedLine.length > 0
    ) {
      throw new CreateLessonError(
        `${filePath}: malformed block delimiter. Use "${BLOCK_DELIMITER}" on its own line.`
      );
    }

    currentLines.push(line);
  }

  flushBlock();

  return blocks;
}

function parseLocaleMarkdownFile(filePath) {
  let fileText;

  try {
    fileText = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new CreateLessonError(`Missing locale markdown file: ${filePath}`);
    }

    throw error;
  }

  const match = fileText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    throw new CreateLessonError(
      `${filePath}: expected front matter bounded by "---" lines.`
    );
  }

  const fields = parseLocaleHeader(filePath, match[1]);
  const body = match[2].trim();

  if (body.length === 0) {
    throw new CreateLessonError(`${filePath}: lesson body must contain at least one text block.`);
  }

  return {
    ...fields,
    blocks: splitMarkdownBlocks(filePath, body),
  };
}

function assertLessonBlockCount(blockCount, label) {
  if (blockCount < MIN_LESSON_BLOCKS || blockCount > MAX_LESSON_BLOCKS) {
    throw new CreateLessonError(
      `${label} must contain between ${MIN_LESSON_BLOCKS} and ${MAX_LESSON_BLOCKS} blocks.`
    );
  }
}

function parseMarkdownDirectory(markdownDir) {
  const localizedFiles = {};

  for (const locale of REQUIRED_LOCALES) {
    localizedFiles[locale] = parseLocaleMarkdownFile(path.join(markdownDir, `${locale}.md`));
  }

  const expectedBlockCount = localizedFiles[REQUIRED_LOCALES[0]].blocks.length;
  assertLessonBlockCount(expectedBlockCount, "Localized lesson content");

  for (const locale of REQUIRED_LOCALES.slice(1)) {
    if (localizedFiles[locale].blocks.length !== expectedBlockCount) {
      throw new CreateLessonError(
        `${path.join(markdownDir, `${locale}.md`)}: expected ${expectedBlockCount} blocks to match the other locale files.`
      );
    }
  }

  return {
    name: {
      values: Object.fromEntries(REQUIRED_LOCALES.map((locale) => [locale, localizedFiles[locale].name])),
    },
    description: {
      values: Object.fromEntries(
        REQUIRED_LOCALES.map((locale) => [locale, localizedFiles[locale].description])
      ),
    },
    blocks: Array.from({ length: expectedBlockCount }, (_, index) => ({
      type: "text",
      value: {
        values: Object.fromEntries(
          REQUIRED_LOCALES.map((locale) => [locale, localizedFiles[locale].blocks[index]])
        ),
      },
    })),
  };
}

function assertLocalizedValues(values, label) {
  if (!isPlainObject(values)) {
    throw new CreateLessonError(`${label} must be an object.`);
  }

  const localeKeys = Object.keys(values).sort().join("|");
  const expectedKeys = [...REQUIRED_LOCALES].sort().join("|");

  if (localeKeys !== expectedKeys) {
    throw new CreateLessonError(
      `${label} must use exactly these locales: ${REQUIRED_LOCALES.join(", ")}.`
    );
  }

  for (const locale of REQUIRED_LOCALES) {
    if (typeof values[locale] !== "string" || values[locale].trim().length === 0) {
      throw new CreateLessonError(`${label}.${locale} must be a non-empty string.`);
    }
  }
}

function assertLocalizedContent(localizedContent) {
  if (
    !isPlainObject(localizedContent) ||
    !isPlainObject(localizedContent.name) ||
    !isPlainObject(localizedContent.description) ||
    !Array.isArray(localizedContent.blocks)
  ) {
    throw new CreateLessonError("Localized lesson content is incomplete.");
  }

  assertLocalizedValues(localizedContent.name.values, "name.values");
  assertLocalizedValues(localizedContent.description.values, "description.values");

  if (localizedContent.blocks.length === 0) {
    throw new CreateLessonError("Localized lesson content must contain at least one block.");
  }

  assertLessonBlockCount(localizedContent.blocks.length, "Localized lesson content");

  localizedContent.blocks.forEach((block, index) => {
    if (!isPlainObject(block) || block.type !== "text" || !isPlainObject(block.value)) {
      throw new CreateLessonError(`blocks[${index}] must be a text block.`);
    }

    assertLocalizedValues(block.value.values, `blocks[${index}].value.values`);
  });
}

function assertValidEducationTree(rootDir, prefixMessage) {
  const validationResult = validateEducation(rootDir);

  if (!validationResult.valid) {
    const message = prefixMessage
      ? `${prefixMessage}\n${formatValidationErrors(validationResult.errors)}`
      : formatValidationErrors(validationResult.errors);
    throw new CreateLessonError(message);
  }

  return validationResult;
}

function upsertLessonEntry(lessons, newEntry, insertPosition, timestamp) {
  const nextLessons = lessons.map((lesson) => ({ ...lesson }));
  nextLessons.splice(insertPosition - 1, 0, newEntry);

  return nextLessons.map((lesson, index) => {
    const normalizedOrder = index + 1;
    const normalizedLesson = { ...lesson, order: normalizedOrder };

    if (lesson.id !== newEntry.id && lesson.order !== normalizedOrder) {
      normalizedLesson.updatedAt = timestamp;
    }

    return normalizedLesson;
  });
}

function createLesson(options) {
  const {
    rootDir,
    tierName,
    courseId,
    sectionId,
    unitId,
    lessonId,
    insertPosition,
    level,
    difficulty,
    localizedContent,
    timestamp = makeUtcTimestamp(),
  } = options;

  if (!SLUG_PATTERN.test(lessonId)) {
    throw new CreateLessonError(
      `"${lessonId}" is not a valid lesson id. Lesson ids must match ${SLUG_PATTERN.toString()}.`
    );
  }

  if (!LEVEL_OPTIONS.includes(level)) {
    throw new CreateLessonError(`Unsupported lesson level "${level}".`);
  }

  if (!DIFFICULTY_OPTIONS.includes(difficulty)) {
    throw new CreateLessonError(`Unsupported lesson difficulty "${difficulty}".`);
  }

  assertLocalizedContent(localizedContent);

  assertValidEducationTree(rootDir, "The current education tree is invalid. No changes were made.");

  const courses = loadCourses(rootDir, tierName);
  const course = courses.find((entry) => entry.id === courseId);

  if (!course) {
    throw new CreateLessonError(`Course "${courseId}" was not found in tier "${tierName}".`);
  }

  const sections = loadSections(rootDir, tierName, courseId);
  const section = sections.find((entry) => entry.id === sectionId);

  if (!section) {
    throw new CreateLessonError(`Section "${sectionId}" was not found in course "${courseId}".`);
  }

  const units = loadUnits(rootDir, tierName, courseId, sectionId);
  const unit = units.find((entry) => entry.id === unitId);

  if (!unit) {
    throw new CreateLessonError(`Unit "${unitId}" was not found in section "${sectionId}".`);
  }

  const lessonsPath = unitLessonsFile(rootDir, tierName, courseId, sectionId, unitId);
  const existingLessons = loadLessons(rootDir, tierName, courseId, sectionId, unitId);
  const maximumPosition = existingLessons.length + 1;

  if (!Number.isInteger(insertPosition) || insertPosition < 1 || insertPosition > maximumPosition) {
    throw new CreateLessonError(
      `Insert position must be an integer between 1 and ${maximumPosition}.`
    );
  }

  if (existingLessons.some((lesson) => lesson.id === lessonId)) {
    throw new CreateLessonError(
      `A lesson with id "${lessonId}" already exists in unit "${unitId}".`
    );
  }

  const targetLessonDir = lessonDir(rootDir, tierName, courseId, sectionId, unitId, lessonId);

  if (fs.existsSync(targetLessonDir)) {
    throw new CreateLessonError(`Target lesson directory already exists: ${targetLessonDir}`);
  }

  const newLessonEntry = {
    id: lessonId,
    level,
    difficulty,
    name: localizedContent.name,
    description: localizedContent.description,
    order: insertPosition,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const nextLessons = upsertLessonEntry(existingLessons, newLessonEntry, insertPosition, timestamp);
  const nextLessonContent = {
    id: lessonId,
    blocks: localizedContent.blocks,
    tests: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeJson(lessonsPath, nextLessons);
  ensureDirectory(targetLessonDir);
  writeJson(
    lessonContentFile(rootDir, tierName, courseId, sectionId, unitId, lessonId),
    nextLessonContent
  );

  const lessonIdsPath = courseLessonIdsFile(rootDir, tierName, courseId);
  const previousLessonIds = readJson(lessonIdsPath);
  writeJson(lessonIdsPath, {
    lessonIDs: generateCourseLessonIds(rootDir, tierName, courseId),
    createdAt: previousLessonIds.createdAt || timestamp,
    updatedAt: timestamp,
  });

  const validationResult = assertValidEducationTree(
    rootDir,
    "Lesson files were written, but validation failed."
  );

  return {
    rootDir,
    tierName,
    courseId,
    sectionId,
    unitId,
    lessonId,
    markdownDir: options.markdownDir || null,
    validationResult,
  };
}

function createPromptApi(input = process.stdin, output = process.stdout) {
  const rl = readline.createInterface({ input, output });

  return {
    ask(question) {
      return rl.question(question);
    },
    close() {
      rl.close();
    },
  };
}

async function runCli(argv = process.argv.slice(2), io = {}) {
  const options = parseCliArgs(argv);

  if (options.help) {
    (io.output || process.stdout).write(`${usage()}\n`);
    return null;
  }

  const input = io.input || process.stdin;
  const output = io.output || process.stdout;
  const promptApi = io.promptApi || createPromptApi(input, output);
  const ask = promptApi.ask.bind(promptApi);
  const rootDir = path.resolve(options.rootDir);

  try {
    assertValidEducationTree(rootDir, "The current education tree is invalid. Fix it before creating a lesson.");

    const tiers = listExistingTiers(rootDir);

    if (tiers.length === 0) {
      throw new CreateLessonError(`No education tiers were found in ${rootDir}.`);
    }

    output.write(`Using education root: ${rootDir}\n`);

    const tierName = await promptChoice(
      "Choose a tier:",
      tiers.map((tier) => ({ label: tier, value: tier })),
      ask,
      output
    );
    const courses = loadCourses(rootDir, tierName);
    const courseId = await promptChoice(
      "Choose a course:",
      courses.map((course) => ({ label: formatEntryLabel(course), value: course.id })),
      ask,
      output
    );
    const sections = loadSections(rootDir, tierName, courseId);
    const sectionId = await promptChoice(
      "Choose a section:",
      sections.map((section) => ({ label: formatEntryLabel(section), value: section.id })),
      ask,
      output
    );
    const units = loadUnits(rootDir, tierName, courseId, sectionId);
    const unitId = await promptChoice(
      "Choose a unit:",
      units.map((unit) => ({ label: formatEntryLabel(unit), value: unit.id })),
      ask,
      output
    );

    const existingLessons = loadLessons(rootDir, tierName, courseId, sectionId, unitId);
    const lessonId = await promptRequiredText(
      "New lesson id (slug): ",
      ask,
      output,
      (value) => (
        SLUG_PATTERN.test(value)
          ? null
          : `Lesson ids must match ${SLUG_PATTERN.toString()}.`
      )
    );
    const insertPosition = await promptInsertPosition(existingLessons.length, ask, output);
    const level = await promptChoice(
      "Choose a lesson level:",
      LEVEL_OPTIONS.map((value) => ({ label: value, value })),
      ask,
      output
    );
    const difficulty = await promptChoice(
      "Choose a lesson difficulty:",
      DIFFICULTY_OPTIONS.map((value) => ({ label: value, value })),
      ask,
      output
    );

    let markdownDir = options.markdownDir;

    if (!markdownDir) {
      markdownDir = fs.mkdtempSync(path.join(os.tmpdir(), TEMPLATE_PREFIX));
      generateLocaleMarkdownTemplates(markdownDir);
      output.write(`\nCreated locale templates in: ${markdownDir}\n`);
      output.write(`Fill ${REQUIRED_LOCALES.join(", ")} markdown files before continuing.\n`);
      output.write(
        `Each file must use front matter for name/description and "${BLOCK_DELIMITER}" between 4 and 10 blocks.\n`
      );
      await ask("Press Enter when the markdown files are ready: ");
    }

    const localizedContent = parseMarkdownDirectory(markdownDir);
    const result = createLesson({
      rootDir,
      tierName,
      courseId,
      sectionId,
      unitId,
      lessonId,
      insertPosition,
      level,
      difficulty,
      localizedContent,
      markdownDir,
    });

    output.write(`\nCreated lesson "${lessonId}" in ${tierName}/${courseId}/${sectionId}/${unitId}.\n`);
    output.write(`${formatSuccess(result.validationResult)}\n`);
    output.write(`Markdown source directory: ${markdownDir}\n`);
    return result;
  } finally {
    if (!io.promptApi) {
      promptApi.close();
    }
  }
}

async function main(argv = process.argv.slice(2)) {
  try {
    await runCli(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  BLOCK_DELIMITER,
  CreateLessonError,
  MAX_LESSON_BLOCKS,
  MIN_LESSON_BLOCKS,
  createLesson,
  generateLocaleMarkdownTemplates,
  parseCliArgs,
  parseMarkdownDirectory,
  runCli,
};
