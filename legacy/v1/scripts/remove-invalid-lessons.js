#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const {
  MIN_LESSON_BLOCKS,
  MAX_LESSON_BLOCKS,
  defaultEducationRoot,
  makeUtcTimestamp,
  readJson,
  writeJson,
  loadCourses,
  loadSections,
  loadUnits,
  loadLessons,
  listExistingTiers,
  unitLessonsFile,
  courseLessonIdsFile,
  lessonDir,
  lessonContentFile,
  generateCourseLessonIds,
} = require("./education-utils");
const {
  validateEducation,
  formatValidationErrors,
  formatSuccess,
} = require("./validate-education");

class RemoveInvalidLessonsError extends Error {}

function usage() {
  return [
    "Usage: node scripts/remove-invalid-lessons.js [--root <path>]",
    "",
    "Options:",
    "  --root <path>  Path to the v1/education directory.",
    "  --help         Show this help message.",
  ].join("\n");
}

function parseCliArgs(argv) {
  const options = {
    rootDir: defaultEducationRoot(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help") {
      options.help = true;
      continue;
    }

    if (argument === "--root") {
      const value = argv[index + 1];

      if (!value) {
        throw new RemoveInvalidLessonsError(`Missing value for ${argument}.\n\n${usage()}`);
      }

      options.rootDir = path.resolve(value);
      index += 1;
      continue;
    }

    throw new RemoveInvalidLessonsError(`Unknown argument "${argument}".\n\n${usage()}`);
  }

  return options;
}

function readLessonBlockCount(filePath) {
  let data;

  try {
    data = readJson(filePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new RemoveInvalidLessonsError(`Missing lesson-content.json: ${filePath}`);
    }

    throw new RemoveInvalidLessonsError(
      `Invalid JSON in lesson-content.json "${filePath}": ${error.message}`
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new RemoveInvalidLessonsError(`${filePath} must contain a JSON object.`);
  }

  if (!Array.isArray(data.blocks)) {
    return null;
  }

  return data.blocks.length;
}

function findInvalidLessons(rootDir) {
  const invalidLessons = [];
  const tiers = listExistingTiers(rootDir);

  for (const tierName of tiers) {
    const courses = loadCourses(rootDir, tierName);

    for (const course of courses) {
      const sections = loadSections(rootDir, tierName, course.id);

      for (const section of sections) {
        const units = loadUnits(rootDir, tierName, course.id, section.id);

        for (const unit of units) {
          const lessons = loadLessons(rootDir, tierName, course.id, section.id, unit.id);

          for (const lesson of lessons) {
            const contentPath = lessonContentFile(
              rootDir,
              tierName,
              course.id,
              section.id,
              unit.id,
              lesson.id
            );
            const blockCount = readLessonBlockCount(contentPath);

            if (
              !Number.isInteger(blockCount) ||
              blockCount < MIN_LESSON_BLOCKS ||
              blockCount > MAX_LESSON_BLOCKS
            ) {
              invalidLessons.push({
                tierName,
                courseId: course.id,
                sectionId: section.id,
                unitId: unit.id,
                lessonId: lesson.id,
                blockCount,
                lessonsPath: unitLessonsFile(rootDir, tierName, course.id, section.id, unit.id),
                lessonIdsPath: courseLessonIdsFile(rootDir, tierName, course.id),
                lessonPath: lessonDir(rootDir, tierName, course.id, section.id, unit.id, lesson.id),
              });
            }
          }
        }
      }
    }
  }

  return invalidLessons;
}

function normalizeLessonOrders(lessons, timestamp) {
  return lessons.map((lesson, index) => {
    const nextOrder = index + 1;

    if (lesson.order === nextOrder) {
      return lesson;
    }

    return {
      ...lesson,
      order: nextOrder,
      updatedAt: timestamp,
    };
  });
}

function removeInvalidLessons(options = {}) {
  const rootDir = path.resolve(options.rootDir || defaultEducationRoot());
  const timestamp = options.timestamp || makeUtcTimestamp();

  const invalidLessons = findInvalidLessons(rootDir);

  if (invalidLessons.length === 0) {
    const validationResult = validateEducation(rootDir);

    if (!validationResult.valid) {
      throw new RemoveInvalidLessonsError(
        `Education tree is invalid.\n${formatValidationErrors(validationResult.errors)}`
      );
    }

    return {
      rootDir,
      timestamp,
      removedLessons: [],
      unitsTouched: 0,
      coursesTouched: 0,
      validationResult,
    };
  }

  const lessonsByUnit = new Map();
  const coursesToRebuild = new Map();

  for (const lesson of invalidLessons) {
    const unitKey = lesson.lessonsPath;
    const unitItems = lessonsByUnit.get(unitKey) || [];
    unitItems.push(lesson);
    lessonsByUnit.set(unitKey, unitItems);

    const courseKey = `${lesson.tierName}/${lesson.courseId}`;
    coursesToRebuild.set(courseKey, {
      tierName: lesson.tierName,
      courseId: lesson.courseId,
      lessonIdsPath: lesson.lessonIdsPath,
    });
  }

  for (const [lessonsPath, unitLessons] of lessonsByUnit.entries()) {
    const lessonIdsToRemove = new Set(unitLessons.map((lesson) => lesson.lessonId));
    const existingLessons = readJson(lessonsPath);

    if (!Array.isArray(existingLessons)) {
      throw new RemoveInvalidLessonsError(`${lessonsPath} must contain an array.`);
    }

    const nextLessons = existingLessons.filter((lesson) => !lessonIdsToRemove.has(lesson.id));

    if (nextLessons.length !== existingLessons.length - lessonIdsToRemove.size) {
      throw new RemoveInvalidLessonsError(
        `Failed to remove expected lesson entries from ${lessonsPath}.`
      );
    }

    writeJson(lessonsPath, normalizeLessonOrders(nextLessons, timestamp));
  }

  for (const lesson of invalidLessons) {
    fs.rmSync(lesson.lessonPath, { recursive: true, force: true });
  }

  for (const course of coursesToRebuild.values()) {
    const previousLessonIds = readJson(course.lessonIdsPath);

    if (!previousLessonIds || typeof previousLessonIds !== "object" || Array.isArray(previousLessonIds)) {
      throw new RemoveInvalidLessonsError(`${course.lessonIdsPath} must contain an object.`);
    }

    writeJson(course.lessonIdsPath, {
      lessonIDs: generateCourseLessonIds(rootDir, course.tierName, course.courseId),
      createdAt: previousLessonIds.createdAt || timestamp,
      updatedAt: timestamp,
    });
  }

  const validationResult = validateEducation(rootDir);

  if (!validationResult.valid) {
    throw new RemoveInvalidLessonsError(
      `Cleanup completed but produced an invalid education tree.\n${formatValidationErrors(validationResult.errors)}`
    );
  }

  return {
    rootDir,
    timestamp,
    removedLessons: invalidLessons,
    unitsTouched: lessonsByUnit.size,
    coursesTouched: coursesToRebuild.size,
    validationResult,
  };
}

async function runCli(argv = process.argv.slice(2), io = {}) {
  const options = parseCliArgs(argv);
  const output = io.output || process.stdout;

  if (options.help) {
    output.write(`${usage()}\n`);
    return null;
  }

  const result = removeInvalidLessons(options);

  if (result.removedLessons.length === 0) {
    output.write(`No invalid lessons found in ${result.rootDir}.\n`);
    output.write(`${formatSuccess(result.validationResult)}\n`);
    return result;
  }

  output.write(
    `Removed ${result.removedLessons.length} invalid lessons across ${result.unitsTouched} units and ${result.coursesTouched} courses.\n`
  );

  result.removedLessons.forEach((lesson) => {
    const blockLabel = Number.isInteger(lesson.blockCount) ? `${lesson.blockCount} blocks` : "missing blocks";
    output.write(
      `- ${lesson.tierName}/${lesson.courseId}/${lesson.sectionId}/${lesson.unitId}/${lesson.lessonId} (${blockLabel})\n`
    );
  });

  output.write(`${formatSuccess(result.validationResult)}\n`);
  return result;
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
  RemoveInvalidLessonsError,
  findInvalidLessons,
  parseCliArgs,
  removeInvalidLessons,
  runCli,
};
