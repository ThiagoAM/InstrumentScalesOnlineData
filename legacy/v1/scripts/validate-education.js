#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const {
  REQUIRED_LOCALES,
  REQUIRED_LOCALE_KEY,
  SLUG_PATTERN,
  ISO_UTC_PATTERN,
  EXPECTED_TIERS,
  defaultEducationRoot,
} = require("./education-utils");

function addError(errors, filePath, message) {
  errors.push({ path: filePath, message });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJsonFile(filePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    addError(errors, filePath, `Invalid JSON: ${error.message}`);
    return null;
  }
}

function listDir(dirPath, errors) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      addError(errors, dirPath, "Directory is missing.");
      return null;
    }

    addError(errors, dirPath, `Unable to read directory: ${error.message}`);
    return null;
  }
}

function isIgnorableSystemFile(dirent) {
  if (!dirent || !dirent.isFile()) {
    return false;
  }

  return (
    dirent.name === ".DS_Store" ||
    dirent.name === "Thumbs.db" ||
    dirent.name === "Desktop.ini" ||
    dirent.name.startsWith("._")
  );
}

function validateRequiredEntries(dirPath, expectedNames, errors) {
  const dirents = listDir(dirPath, errors);

  if (!dirents) {
    return null;
  }

  const actualNames = new Set(dirents.map((dirent) => dirent.name));

  for (const expectedName of expectedNames) {
    if (!actualNames.has(expectedName)) {
      addError(errors, dirPath, `Missing expected entry "${expectedName}".`);
    }
  }

  for (const dirent of dirents) {
    if (isIgnorableSystemFile(dirent)) {
      continue;
    }

    if (!expectedNames.includes(dirent.name)) {
      addError(
        errors,
        path.join(dirPath, dirent.name),
        "Unexpected file or directory."
      );
    }
  }

  return dirents;
}

function validateLessonDirectoryEntries(dirPath, errors) {
  const dirents = listDir(dirPath, errors);

  if (!dirents) {
    return;
  }

  const actualNames = new Set(dirents.map((dirent) => dirent.name));

  if (!actualNames.has("lesson-content.json")) {
    addError(errors, dirPath, 'Missing expected entry "lesson-content.json".');
  }

  for (const dirent of dirents) {
    if (isIgnorableSystemFile(dirent)) {
      continue;
    }

    if (dirent.name !== "lesson-content.json" && dirent.name !== "images") {
      addError(
        errors,
        path.join(dirPath, dirent.name),
        "Unexpected file or directory."
      );
    }
  }
}

function validateFileExists(filePath, errors) {
  let stats;

  try {
    stats = fs.statSync(filePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      addError(errors, filePath, "File is missing.");
      return false;
    }

    addError(errors, filePath, `Unable to inspect file: ${error.message}`);
    return false;
  }

  if (!stats.isFile()) {
    addError(errors, filePath, "Expected a file.");
    return false;
  }

  return true;
}

function validateDirectoryExists(dirPath, errors) {
  let stats;

  try {
    stats = fs.statSync(dirPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      addError(errors, dirPath, "Directory is missing.");
      return false;
    }

    addError(errors, dirPath, `Unable to inspect directory: ${error.message}`);
    return false;
  }

  if (!stats.isDirectory()) {
    addError(errors, dirPath, "Expected a directory.");
    return false;
  }

  return true;
}

function validateSlug(value, fieldName, filePath, errors) {
  if (typeof value !== "string" || value.length === 0) {
    addError(errors, filePath, `"${fieldName}" must be a non-empty string.`);
    return false;
  }

  if (!SLUG_PATTERN.test(value)) {
    addError(
      errors,
      filePath,
      `"${fieldName}" must match ${SLUG_PATTERN.toString()}.`
    );
    return false;
  }

  return true;
}

function validateString(value, fieldName, filePath, errors) {
  if (typeof value !== "string" || value.trim().length === 0) {
    addError(errors, filePath, `"${fieldName}" must be a non-empty string.`);
    return false;
  }

  return true;
}

function validateTimestamp(value, fieldName, filePath, errors) {
  if (typeof value !== "string" || !ISO_UTC_PATTERN.test(value)) {
    addError(
      errors,
      filePath,
      `"${fieldName}" must use UTC ISO-8601 format YYYY-MM-DDTHH:MM:SSZ.`
    );
    return null;
  }

  const date = new Date(value);
  const normalizedValue = value.replace(/Z$/, ".000Z");

  if (Number.isNaN(date.getTime()) || date.toISOString() !== normalizedValue) {
    addError(
      errors,
      filePath,
      `"${fieldName}" is not a valid UTC ISO-8601 timestamp.`
    );
    return null;
  }

  return date;
}

function validateCreatedUpdatedPair(target, filePath, errors) {
  if (!isPlainObject(target)) {
    addError(errors, filePath, "Expected an object containing timestamps.");
    return;
  }

  const createdAt = validateTimestamp(target.createdAt, "createdAt", filePath, errors);
  const updatedAt = validateTimestamp(target.updatedAt, "updatedAt", filePath, errors);

  if (createdAt && updatedAt && updatedAt < createdAt) {
    addError(errors, filePath, '"updatedAt" must not be earlier than "createdAt".');
  }
}

function validateLocalizedField(target, fieldName, filePath, errors) {
  const localized = target[fieldName];

  if (!isPlainObject(localized)) {
    addError(errors, filePath, `"${fieldName}" must be an object.`);
    return;
  }

  const values = localized.values;

  if (!isPlainObject(values)) {
    addError(errors, filePath, `"${fieldName}.values" must be an object.`);
    return;
  }

  const localeKey = Object.keys(values).sort().join("|");

  if (localeKey !== REQUIRED_LOCALE_KEY) {
    addError(
      errors,
      filePath,
      `"${fieldName}.values" must use exactly these locales: ${REQUIRED_LOCALES.join(
        ", "
      )}.`
    );
  }

  for (const locale of REQUIRED_LOCALES) {
    validateString(values[locale], `${fieldName}.values.${locale}`, filePath, errors);
  }
}

function validateImageField(value, fieldName, filePath, errors) {
  if (value === null) {
    return;
  }

  if (!isPlainObject(value)) {
    addError(errors, filePath, `"${fieldName}" must be null or an object.`);
    return;
  }

  validateString(value.type, `${fieldName}.type`, filePath, errors);

  const hasValue = typeof value.value === "string" && value.value.trim().length > 0;
  const hasName = typeof value.name === "string" && value.name.trim().length > 0;

  if (!hasValue && !hasName) {
    addError(
      errors,
      filePath,
      `"${fieldName}" must include a non-empty "value" or "name".`
    );
  }
}

function validateUniqueIds(items, filePath, errors) {
  const seen = new Set();

  for (const item of items) {
    if (!isPlainObject(item)) {
      continue;
    }

    const itemId = item.id;

    if (typeof itemId !== "string") {
      continue;
    }

    if (seen.has(itemId)) {
      addError(errors, filePath, `Duplicate sibling id "${itemId}".`);
      continue;
    }

    seen.add(itemId);
  }
}

function validateOrderSequence(items, filePath, errors) {
  const orders = [];

  for (const item of items) {
    if (!isPlainObject(item)) {
      continue;
    }

    if (!Number.isInteger(item.order)) {
      addError(errors, filePath, `"order" must be an integer for every entry.`);
      continue;
    }

    orders.push(item.order);
  }

  if (orders.length !== items.length) {
    return;
  }

  const sortedOrders = [...orders].sort((left, right) => left - right);

  for (let index = 0; index < sortedOrders.length; index += 1) {
    const expectedOrder = index + 1;

    if (sortedOrders[index] !== expectedOrder) {
      addError(
        errors,
        filePath,
        '"order" values must be contiguous integers starting at 1.'
      );
      return;
    }
  }
}

function validateExpectedDirectories(parentDir, expectedIds, label, errors) {
  const dirents = listDir(parentDir, errors);

  if (!dirents) {
    return [];
  }

  const actualDirectories = [];

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) {
      addError(
        errors,
        path.join(parentDir, dirent.name),
        `Unexpected file in ${label} directory container.`
      );
      continue;
    }

    actualDirectories.push(dirent.name);
  }

  const actualSet = new Set(actualDirectories);
  const expectedSet = new Set(expectedIds);

  for (const expectedId of expectedIds) {
    if (!actualSet.has(expectedId)) {
      addError(
        errors,
        parentDir,
        `Missing ${label} directory "${expectedId}".`
      );
    }
  }

  for (const actualId of actualDirectories) {
    if (!expectedSet.has(actualId)) {
      addError(
        errors,
        path.join(parentDir, actualId),
        `Unexpected ${label} directory "${actualId}".`
      );
    }
  }

  return actualDirectories;
}

function validateTierImagesDirectory(imagesDir, errors) {
  const dirents = listDir(imagesDir, errors);

  if (!dirents) {
    return;
  }

  for (const dirent of dirents) {
    if (!dirent.isFile()) {
      addError(
        errors,
        path.join(imagesDir, dirent.name),
        "Only image files are allowed inside tier images directories."
      );
    }
  }
}

function validateOptionalImagesDirectory(imagesDir, errors) {
  if (!fs.existsSync(imagesDir)) {
    return;
  }

  const dirents = listDir(imagesDir, errors);

  if (!dirents) {
    return;
  }

  for (const dirent of dirents) {
    if (!dirent.isFile()) {
      addError(
        errors,
        path.join(imagesDir, dirent.name),
        "Only files are allowed inside lesson images directories."
      );
    }
  }
}

function validateCoursesJson(filePath, errors) {
  if (!validateFileExists(filePath, errors)) {
    return [];
  }

  const data = readJsonFile(filePath, errors);

  if (!isPlainObject(data)) {
    addError(errors, filePath, "courses.json must be an object.");
    return [];
  }

  if (!Number.isInteger(data.schemaVersion)) {
    addError(errors, filePath, '"schemaVersion" must be an integer.');
  }

  validateCreatedUpdatedPair(data, filePath, errors);

  if (!Array.isArray(data.courses)) {
    addError(errors, filePath, '"courses" must be an array.');
    return [];
  }

  validateUniqueIds(data.courses, filePath, errors);
  validateOrderSequence(data.courses, filePath, errors);

  for (const course of data.courses) {
    if (!isPlainObject(course)) {
      addError(errors, filePath, "Each course entry must be an object.");
      continue;
    }

    validateSlug(course.id, "id", filePath, errors);
    validateSlug(course.slug, "slug", filePath, errors);

    const expectedSlug = course.id.endsWith("-free")
      ? course.id.slice(0, -"-free".length)
      : course.id;

    if (course.slug !== expectedSlug) {
      addError(
        errors,
        filePath,
        `"slug" must match "${expectedSlug}" for course "${course.id}".`
      );
    }

    validateLocalizedField(course, "name", filePath, errors);
    validateLocalizedField(course, "summary", filePath, errors);
    validateImageField(course.image, "image", filePath, errors);

    if (!Array.isArray(course.tags)) {
      addError(errors, filePath, `"tags" must be an array for course "${course.id}".`);
    } else {
      for (const tag of course.tags) {
        validateSlug(tag, "tags[]", filePath, errors);
      }
    }

    validateCreatedUpdatedPair(course, filePath, errors);
  }

  return data.courses;
}

function validateArrayCatalog(filePath, itemLabel, requiredTextField, errors, extraValidator) {
  if (!validateFileExists(filePath, errors)) {
    return [];
  }

  const data = readJsonFile(filePath, errors);

  if (!Array.isArray(data)) {
    addError(errors, filePath, `${path.basename(filePath)} must be an array.`);
    return [];
  }

  validateUniqueIds(data, filePath, errors);
  validateOrderSequence(data, filePath, errors);

  for (const item of data) {
    if (!isPlainObject(item)) {
      addError(errors, filePath, `Each ${itemLabel} entry must be an object.`);
      continue;
    }

    validateSlug(item.id, "id", filePath, errors);
    validateLocalizedField(item, "name", filePath, errors);
    validateLocalizedField(item, requiredTextField, filePath, errors);
    validateCreatedUpdatedPair(item, filePath, errors);

    if (Object.prototype.hasOwnProperty.call(item, "image")) {
      validateImageField(item.image, "image", filePath, errors);
    }

    if (typeof extraValidator === "function") {
      extraValidator(item, filePath, errors);
    }
  }

  return data;
}

function validateLessonsJson(filePath, errors) {
  return validateArrayCatalog(
    filePath,
    "lesson",
    "description",
    errors,
    (lesson, targetPath, targetErrors) => {
      validateSlug(lesson.level, "level", targetPath, targetErrors);
      validateSlug(lesson.difficulty, "difficulty", targetPath, targetErrors);
    }
  );
}

function validateLessonContent(filePath, expectedLessonId, errors) {
  if (!validateFileExists(filePath, errors)) {
    return false;
  }

  const data = readJsonFile(filePath, errors);

  if (!isPlainObject(data)) {
    addError(errors, filePath, "lesson-content.json must be an object.");
    return false;
  }

  validateCreatedUpdatedPair(data, filePath, errors);
  validateSlug(data.id, "id", filePath, errors);

  if (data.id !== expectedLessonId) {
    addError(
      errors,
      filePath,
      `"id" must match the lesson directory name "${expectedLessonId}".`
    );
  }

  if (!Array.isArray(data.blocks)) {
    addError(errors, filePath, '"blocks" must be an array.');
  } else {
    data.blocks.forEach((block, index) => {
      if (!isPlainObject(block)) {
        addError(errors, filePath, `blocks[${index}] must be an object.`);
        return;
      }

      if (block.type !== "text") {
        addError(errors, filePath, `blocks[${index}].type must be "text".`);
      }

      if (!isPlainObject(block.value)) {
        addError(errors, filePath, `blocks[${index}].value must be an object.`);
        return;
      }

      validateLocalizedField(block, "value", filePath, errors);
    });
  }

  if (!Array.isArray(data.tests)) {
    addError(errors, filePath, '"tests" must be an array.');
  }

  return true;
}

function validateLessonIdsFile(filePath, expectedLessonIds, errors) {
  if (!validateFileExists(filePath, errors)) {
    return;
  }

  const data = readJsonFile(filePath, errors);

  if (!isPlainObject(data)) {
    addError(errors, filePath, "lessonIDs.json must be an object.");
    return;
  }

  validateCreatedUpdatedPair(data, filePath, errors);

  if (!Array.isArray(data.lessonIDs)) {
    addError(errors, filePath, '"lessonIDs" must be an array.');
    return;
  }

  const seen = new Set();

  for (const lessonId of data.lessonIDs) {
    if (typeof lessonId !== "string" || lessonId.trim().length === 0) {
      addError(errors, filePath, 'Every "lessonIDs" entry must be a non-empty string.');
      continue;
    }

    if (seen.has(lessonId)) {
      addError(errors, filePath, `Duplicate lessonIDs entry "${lessonId}".`);
      continue;
    }

    seen.add(lessonId);
  }

  if (data.lessonIDs.length !== expectedLessonIds.length) {
    addError(
      errors,
      filePath,
      `"lessonIDs" must contain exactly ${expectedLessonIds.length} entries.`
    );
    return;
  }

  for (let index = 0; index < expectedLessonIds.length; index += 1) {
    if (data.lessonIDs[index] !== expectedLessonIds[index]) {
      addError(
        errors,
        filePath,
        `"lessonIDs" does not match the generated lesson path list at index ${index}.`
      );
      return;
    }
  }
}

function validateCourseTree(rootDir, tierName, course, errors, counts) {
  const courseDir = path.join(rootDir, tierName, "courses", course.id);
  validateRequiredEntries(courseDir, ["sections", "sections.json", "lessonIDs.json"], errors);

  const sectionsFile = path.join(courseDir, "sections.json");
  const sections = validateArrayCatalog(sectionsFile, "section", "description", errors);
  const sectionIds = sections.map((section) => section.id).filter(Boolean);
  validateExpectedDirectories(path.join(courseDir, "sections"), sectionIds, "section", errors);
  counts.sections += sections.length;

  const lessonIds = [];

  for (const section of sections) {
    const sectionDir = path.join(courseDir, "sections", section.id);
    validateRequiredEntries(sectionDir, ["units", "units.json"], errors);

    const unitsFile = path.join(sectionDir, "units.json");
    const units = validateArrayCatalog(unitsFile, "unit", "description", errors);
    const unitIds = units.map((unit) => unit.id).filter(Boolean);
    validateExpectedDirectories(path.join(sectionDir, "units"), unitIds, "unit", errors);
    counts.units += units.length;

    for (const unit of units) {
      const unitDir = path.join(sectionDir, "units", unit.id);
      validateRequiredEntries(unitDir, ["lessons", "lessons.json"], errors);

      const lessonsFile = path.join(unitDir, "lessons.json");
      const lessons = validateLessonsJson(lessonsFile, errors);
      const lessonEntryIds = lessons.map((lesson) => lesson.id).filter(Boolean);
      validateExpectedDirectories(path.join(unitDir, "lessons"), lessonEntryIds, "lesson", errors);

      for (const lesson of lessons) {
        const lessonDir = path.join(unitDir, "lessons", lesson.id);
        validateLessonDirectoryEntries(lessonDir, errors);
        validateLessonContent(
          path.join(lessonDir, "lesson-content.json"),
          lesson.id,
          errors
        );
        validateOptionalImagesDirectory(path.join(lessonDir, "images"), errors);
        lessonIds.push(`${course.id}/${section.id}/${unit.id}/${lesson.id}`);
      }

      counts.lessons += lessons.length;
    }
  }

  validateLessonIdsFile(path.join(courseDir, "lessonIDs.json"), lessonIds, errors);
}

function validateEducation(rootDir = defaultEducationRoot()) {
  const resolvedRoot = path.resolve(rootDir);
  const errors = [];
  const counts = {
    tiers: 0,
    courses: 0,
    sections: 0,
    units: 0,
    lessons: 0,
  };

  if (!validateDirectoryExists(resolvedRoot, errors)) {
    return { valid: false, errors, counts, rootDir: resolvedRoot };
  }

  validateRequiredEntries(resolvedRoot, EXPECTED_TIERS, errors);

  for (const tierName of EXPECTED_TIERS) {
    const tierDir = path.join(resolvedRoot, tierName);

    if (!validateDirectoryExists(tierDir, errors)) {
      continue;
    }

    counts.tiers += 1;
    validateRequiredEntries(tierDir, ["courses", "courses.json", "images"], errors);
    validateTierImagesDirectory(path.join(tierDir, "images"), errors);

    const courses = validateCoursesJson(path.join(tierDir, "courses.json"), errors);
    const courseIds = courses.map((course) => course.id).filter(Boolean);
    validateExpectedDirectories(path.join(tierDir, "courses"), courseIds, "course", errors);
    counts.courses += courses.length;

    for (const course of courses) {
      validateCourseTree(resolvedRoot, tierName, course, errors, counts);
    }
  }

  return { valid: errors.length === 0, errors, counts, rootDir: resolvedRoot };
}

function formatValidationErrors(errors) {
  const grouped = new Map();

  for (const error of errors) {
    if (!grouped.has(error.path)) {
      grouped.set(error.path, []);
    }

    grouped.get(error.path).push(error.message);
  }

  const lines = [];

  for (const filePath of [...grouped.keys()].sort()) {
    lines.push(filePath);

    for (const message of grouped.get(filePath)) {
      lines.push(`  - ${message}`);
    }
  }

  lines.push(`Validation failed with ${errors.length} error(s).`);
  return lines.join("\n");
}

function formatSuccess(result) {
  const { counts, rootDir } = result;
  return `Validation passed for ${rootDir} (${counts.tiers} tiers, ${counts.courses} courses, ${counts.sections} sections, ${counts.units} units, ${counts.lessons} lessons).`;
}

function main(argv = process.argv.slice(2)) {
  const rootDir = argv[0] || defaultEducationRoot();
  const result = validateEducation(rootDir);

  if (!result.valid) {
    console.error(formatValidationErrors(result.errors));
    process.exitCode = 1;
    return;
  }

  console.log(formatSuccess(result));
}

if (require.main === module) {
  main();
}

module.exports = {
  REQUIRED_LOCALES,
  formatSuccess,
  formatValidationErrors,
  validateEducation,
};
