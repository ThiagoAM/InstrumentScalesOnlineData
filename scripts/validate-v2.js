#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const ACCEPTED_FENCES = [
  "scale", "notes", "fretboard", "quiz", "compare", "chord", "progression", "listen", "tap",
];
const LEVELS = ["beginner", "intermediate", "advanced"];
const ACTIVITIES = new Set([
  "ear-training", "guided-practice", "fretboard", "rhythm", "theory", "improvisation", "keyboard",
  "chords", "harmony",
]);
const OS_METADATA = /^(?:\.DS_Store|\._.*|Thumbs\.db|Desktop\.ini)$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MUSIC_SYMBOL = /[\u2669-\u266f\u{1d100}-\u{1d1ff}]/u;

function issue(collection, filePath, message) {
  collection.push({ path: filePath, message });
}

function readJSON(filePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    issue(errors, filePath, `Invalid JSON: ${error.message}`);
    return null;
  }
}

function frontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return null;
  return Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => line.match(/^([^:]+):\s*(.*)$/))
      .filter(Boolean)
      .map((entry) => [entry[1].trim(), entry[2].trim()])
  );
}

function checkLocalized(value, label, filePath, errors, warnings, warningOnly = false) {
  for (const locale of REQUIRED_LOCALES) {
    if (typeof value?.[locale] !== "string" || !value[locale].trim()) {
      issue(warningOnly ? warnings : errors, filePath, `Missing non-empty ${label}.${locale}.`);
    }
  }
}

function checkSlug(value, label, filePath, errors) {
  if (!SLUG.test(value || "")) issue(errors, filePath, `Invalid ${label}: ${value}.`);
}

function checkContiguous(items, label, filePath, errors) {
  if (!Array.isArray(items)) {
    issue(errors, filePath, `${label} must be an array.`);
    return false;
  }
  const orders = items.map((item) => item?.order);
  const expected = Array.from({ length: items.length }, (_, index) => index + 1);
  if (orders.some((order) => !Number.isInteger(order)) || orders.some((order, index) => order !== expected[index])) {
    issue(errors, filePath, `${label} order values must be contiguous from 1 in array order.`);
  }
  return true;
}

function localizedBodies(markdown) {
  const wrapper = markdown.match(/:::localized\s*\n([\s\S]*?)\n:::endlocalized(?:\s*\n|$)/);
  if (!wrapper) return null;
  const sections = {};
  const marker = /^:::locale ([^\s]+)\s*$/gm;
  const matches = [...wrapper[1].matchAll(marker)];
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length;
    const end = matches[index + 1]?.index ?? wrapper[1].length;
    sections[matches[index][1]] = wrapper[1].slice(start, end).replace(/^\n/, "").trim();
  }
  return sections;
}

function stripLocalizedTitles(body, titles) {
  return Object.values(titles || {}).reduce((result, title) => {
    if (typeof title !== "string" || !title.trim()) return result;
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return result.replace(new RegExp(escaped, "giu"), " ");
  }, body);
}

function stripLocalizedMetadata(body, lesson) {
  return stripLocalizedTitles(stripLocalizedTitles(body, lesson.summaries), lesson.titles);
}

function proseText(body) {
  return body
    .split("\n")
    .filter((line) => !/^\s*(?:#|:::checkpoint\b|:::)/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function proseUnits(body) {
  const prose = proseText(body);
  const whitespaceWords = prose ? prose.split(/\s+/u).length : 0;
  const cjkCharacters = (prose.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
  return Math.max(whitespaceWords, Math.floor(cjkCharacters / 2));
}

function normalizedBody(body, titles) {
  return stripLocalizedTitles(body, titles)
    .replace(/^[ \t]*#[ \t]+[^\n]*(?:\n|$)/, "")
    .replace(/^[ \t]*:::checkpoint[^\n]*(?:\n|$)/gm, "")
    .trim()
    .replace(/\s+/g, " ");
}

function proseParagraphs(body) {
  return body
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph
      .split("\n")
      .filter((line) => !/^\s*(?:#|:::checkpoint\b|:::)/.test(line))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean);
}

function validateFences(markdown, lessonPath, errors) {
  const lines = markdown.split("\n");
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    const opener = lines[index].trim().match(/^```([A-Za-z0-9-]+)\s*$/);
    if (!opener) continue;
    const name = opener[1];
    let closing = index + 1;
    while (closing < lines.length && lines[closing].trim() !== "```") closing += 1;
    if (closing >= lines.length) {
      issue(errors, lessonPath, `Unterminated ${name} fence.`);
      return found;
    }
    if (ACCEPTED_FENCES.includes(name)) found.push(name);
    index = closing;
  }
  return found;
}

function validateLesson({
  lesson, course, section, unit, courseRoot, catalogPath, strictLocales,
  errors, warnings, bodyHashes, paragraphHashes,
}) {
  checkSlug(lesson.id, "lesson id", catalogPath, errors);
  if (!Number.isInteger(lesson.estimatedMinutes) || lesson.estimatedMinutes < 1 || lesson.estimatedMinutes > 60) {
    issue(errors, catalogPath, `${lesson.id} estimatedMinutes must be an integer from 1 through 60.`);
  }
  if (!ACTIVITIES.has(lesson.activity)) issue(errors, catalogPath, `${lesson.id} has invalid activity: ${lesson.activity}.`);
  if (typeof lesson.optional !== "boolean") issue(errors, catalogPath, `${lesson.id} optional must be a boolean.`);
  checkLocalized(lesson.titles, `${lesson.id}.titles`, catalogPath, errors, warnings, !strictLocales);
  checkLocalized(lesson.summaries, `${lesson.id}.summaries`, catalogPath, errors, warnings, !strictLocales);

  const nestedPath = `levels/${section.level}/sections/${section.id}/units/${unit.id}/lessons/${lesson.id}/lesson.md`;
  const releasedPath = `sections/${section.id}/units/${unit.id}/lessons/${lesson.id}/lesson.md`;
  if (![nestedPath, releasedPath].includes(lesson.path)) {
    issue(errors, catalogPath, `${lesson.id} must use path ${nestedPath} (or the released path ${releasedPath}).`);
    return;
  }
  const resolvedRoot = path.resolve(courseRoot);
  const lessonPath = path.resolve(courseRoot, lesson.path);
  if (!lessonPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    issue(errors, catalogPath, `${lesson.id} escapes the course directory.`);
    return;
  }

  let markdown;
  try {
    markdown = fs.readFileSync(lessonPath, "utf8").replace(/\r\n/g, "\n");
  } catch (error) {
    issue(errors, lessonPath, `Unable to read lesson: ${error.message}`);
    return;
  }
  const fields = frontMatter(markdown);
  if (!fields) {
    issue(errors, lessonPath, "Missing YAML-style front matter.");
    return;
  }
  for (const [key, expected] of [
    ["schema", "2"], ["id", lesson.id], ["course", course.id], ["level", section.level],
    ["section", section.id], ["unit", unit.id], ["order", String(lesson.order)],
  ]) {
    if (fields[key] !== expected) issue(errors, lessonPath, `${key} must be ${expected}.`);
  }
  if (!Number.isInteger(Number(fields.revision)) || Number(fields.revision) < 1) {
    issue(errors, lessonPath, "revision must be an integer of at least 1.");
  }
  for (const locale of REQUIRED_LOCALES) {
    for (const field of ["title", "summary"]) {
      if (!fields[`${field}.${locale}`]?.trim()) issue(errors, lessonPath, `Missing ${field}.${locale}.`);
    }
  }

  const bodies = localizedBodies(markdown);
  if (!bodies) {
    issue(errors, lessonPath, "Localized body must be wrapped in localized markers.");
  } else {
    for (const locale of REQUIRED_LOCALES) {
      if (!bodies[locale]?.trim()) {
        issue(errors, lessonPath, `Missing localized body for ${locale}.`);
        continue;
      }
      const units = proseUnits(bodies[locale]);
      if (units < 30) {
        issue(errors, lessonPath, `${locale} body has fewer than 30 prose words or equivalent CJK length.`);
      } else if (units < 100) {
        issue(warnings, lessonPath, `${locale} body has fewer than 100 prose words or equivalent CJK length.`);
      }
      const normalized = normalizedBody(bodies[locale], lesson.titles);
      if (locale !== "en" && bodies[locale] === bodies.en) {
        issue(errors, lessonPath, `${locale} body is byte-identical to the English body.`);
      }
      const emojiCount = [...bodies[locale]].filter((character) =>
        /\p{Extended_Pictographic}/u.test(character) && !MUSIC_SYMBOL.test(character)).length;
      const exclamationCount = (bodies[locale].match(/!/g) || []).length;
      if (emojiCount > 2) issue(warnings, lessonPath, `${locale} body exceeds the two-emoji hype budget.`);
      if (exclamationCount > 3) issue(warnings, lessonPath, `${locale} body exceeds the three-exclamation hype budget.`);
      if (strictLocales && normalized) {
        const hash = crypto.createHash("sha256").update(normalized).digest("hex");
        const key = `${locale}:${hash}`;
        const previous = bodyHashes.get(key);
        if (previous) issue(errors, lessonPath, `${locale} body duplicates ${previous}.`);
        else bodyHashes.set(key, lessonPath);

        for (const paragraph of proseParagraphs(bodies[locale])) {
          if (proseUnits(paragraph) < 20) continue;
          const normalizedParagraph = stripLocalizedMetadata(paragraph, lesson)
            .toLocaleLowerCase(locale)
            .replace(/[\p{P}\p{S}\s]+/gu, " ")
            .trim();
          if (!normalizedParagraph) continue;
          const paragraphHash = crypto.createHash("sha256").update(normalizedParagraph).digest("hex");
          const paragraphKey = `${locale}:${paragraphHash}`;
          const priorParagraph = paragraphHashes.get(paragraphKey);
          if (priorParagraph && priorParagraph !== lessonPath) {
            issue(errors, lessonPath, `${locale} prose paragraph duplicates ${priorParagraph}.`);
          } else {
            paragraphHashes.set(paragraphKey, lessonPath);
          }
        }
      }
    }
  }

  const fences = validateFences(markdown, lessonPath, errors);
  if (!fences.length) issue(errors, lessonPath, `Lesson needs at least one playable fence (${ACCEPTED_FENCES.join(", ")}).`);

  for (const entry of fs.readdirSync(path.dirname(lessonPath))) {
    if (entry !== "lesson.md" && !OS_METADATA.test(entry)) {
      issue(errors, path.dirname(lessonPath), `Unexpected lesson file: ${entry}.`);
    }
  }
}

function validateCourse(courseRoot, options, state) {
  const { strictLocales } = options;
  const { errors, warnings, seenLessonIDs, bodyHashes, paragraphHashes } = state;
  const coursePath = path.join(courseRoot, "course.json");
  const catalogPath = path.join(courseRoot, "catalog.json");
  const course = readJSON(coursePath, errors);
  const catalog = readJSON(catalogPath, errors);
  if (!course || !catalog) return 0;

  if (course.schema !== 2) issue(errors, coursePath, "Course schema must be 2.");
  checkSlug(course.id, "course id", coursePath, errors);
  if (!Number.isInteger(course.revision) || course.revision < 1) issue(errors, coursePath, "revision must be at least 1.");
  checkLocalized(course.titles, "titles", coursePath, errors, warnings);
  if (JSON.stringify(course.levels) !== JSON.stringify(LEVELS)) {
    issue(errors, coursePath, `Levels must be ${LEVELS.join(", ")} in order.`);
  }
  if (catalog.schema !== 2) issue(errors, catalogPath, "Catalog schema must be 2.");
  if (catalog.course !== course.id) issue(errors, catalogPath, "Catalog course must match course.json id.");
  if (!checkContiguous(catalog.sections, "sections", catalogPath, errors)) return 0;

  let lessonCount = 0;
  for (const section of catalog.sections) {
    checkSlug(section.id, "section id", catalogPath, errors);
    if (!LEVELS.includes(section.level)) issue(errors, catalogPath, `${section.id} has invalid level: ${section.level}.`);
    if (section.level !== section.id) issue(errors, catalogPath, `${section.id} level must match its parent section id.`);
    checkLocalized(section.titles, `${section.id}.titles`, catalogPath, errors, warnings, !strictLocales);
    checkLocalized(section.summaries, `${section.id}.summaries`, catalogPath, errors, warnings, !strictLocales);
    if (!checkContiguous(section.units, `${section.id}.units`, catalogPath, errors)) continue;
    for (const unit of section.units) {
      checkSlug(unit.id, "unit id", catalogPath, errors);
      checkLocalized(unit.titles, `${unit.id}.titles`, catalogPath, errors, warnings, !strictLocales);
      checkLocalized(unit.summaries, `${unit.id}.summaries`, catalogPath, errors, warnings, !strictLocales);
      if (!checkContiguous(unit.lessons, `${unit.id}.lessons`, catalogPath, errors)) continue;
      for (const lesson of unit.lessons) {
        lessonCount += 1;
        if (seenLessonIDs.has(lesson.id)) issue(errors, catalogPath, `Duplicate lesson id: ${lesson.id}.`);
        else seenLessonIDs.add(lesson.id);
        validateLesson({
          lesson, course, section, unit, courseRoot, catalogPath, strictLocales,
          errors, warnings, bodyHashes, paragraphHashes,
        });
      }
    }
  }
  return lessonCount;
}

function validateCourseIndex(coursesRoot, errors, warnings) {
  const filePath = path.join(path.dirname(coursesRoot), "courses.json");
  if (!fs.existsSync(filePath)) return;
  const index = readJSON(filePath, errors);
  if (!index) return;
  if (index.schema !== 2) issue(errors, filePath, "Course index schema must be 2.");
  if (!Number.isInteger(index.revision) || index.revision < 1) issue(errors, filePath, "Course index revision must be at least 1.");
  if (!checkContiguous(index.courses, "courses", filePath, errors)) return;
  const seen = new Set();
  for (const course of index.courses) {
    checkSlug(course.id, "indexed course id", filePath, errors);
    if (seen.has(course.id)) issue(errors, filePath, `Duplicate indexed course id: ${course.id}.`);
    seen.add(course.id);
    checkLocalized(course.titles, `${course.id}.titles`, filePath, errors, warnings);
    checkLocalized(course.summaries, `${course.id}.summaries`, filePath, errors, warnings);
    if (typeof course.theme !== "string" || !course.theme.trim()) issue(errors, filePath, `${course.id} needs a theme.`);
    if (!fs.existsSync(path.join(coursesRoot, course.id, "course.json"))) {
      issue(errors, filePath, `${course.id} does not resolve to a course directory.`);
    }
  }
}

function validateDailyRiffs(root, errors, warnings) {
  const filePath = path.join(root, "daily", "riffs.json");
  if (!fs.existsSync(filePath)) return 0;
  const catalog = readJSON(filePath, errors);
  if (!catalog) return 0;
  if (catalog.schema !== 2) issue(errors, filePath, "Daily riff schema must be 2.");
  if (!Number.isInteger(catalog.revision) || catalog.revision < 1) issue(errors, filePath, "Daily riff revision must be at least 1.");
  if (!Array.isArray(catalog.riffs)) {
    issue(errors, filePath, "riffs must be an array.");
    return 0;
  }
  const dates = new Set();
  const ids = new Set();
  const degreePatterns = new Map();
  const degreePatternCounts = new Map();
  const blurbValues = new Map(REQUIRED_LOCALES.map((locale) => [locale, new Map()]));
  for (const riff of catalog.riffs) {
    checkSlug(riff.id, "riff id", filePath, errors);
    if (ids.has(riff.id)) issue(errors, filePath, `Duplicate riff id: ${riff.id}.`);
    ids.add(riff.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(riff.date || "") || Number.isNaN(Date.parse(`${riff.date}T00:00:00Z`))) {
      issue(errors, filePath, `${riff.id} has an invalid ISO date.`);
    }
    if (dates.has(riff.date)) issue(errors, filePath, `Duplicate riff date: ${riff.date}.`);
    dates.add(riff.date);
    checkLocalized(riff.titles, `${riff.id}.titles`, filePath, errors, warnings);
    checkLocalized(riff.blurbs, `${riff.id}.blurbs`, filePath, errors, warnings);
    for (const locale of REQUIRED_LOCALES) {
      const value = riff.blurbs?.[locale]?.trim();
      if (!value) continue;
      const previous = blurbValues.get(locale).get(value);
      if (previous) issue(errors, filePath, `${riff.id} ${locale} blurb duplicates ${previous}.`);
      else blurbValues.get(locale).set(value, riff.id);
    }
    if (!["scale", "chord"].includes(riff.fence?.type)) {
      issue(errors, filePath, `${riff.id} fence type must be scale or chord.`);
    }
    if (typeof riff.fence?.source !== "string" || !riff.fence.source.trim()) {
      issue(errors, filePath, `${riff.id} fence source must be non-empty.`);
    } else {
      const degreeLine = riff.fence.source.match(/^degrees:\s*(.+)$/m)?.[1]?.trim();
      if (degreeLine) {
        degreePatternCounts.set(degreeLine, (degreePatternCounts.get(degreeLine) || 0) + 1);
        const previous = degreePatterns.get(degreeLine);
        if (previous) issue(errors, filePath, `${riff.id} degree pattern duplicates ${previous}.`);
        else degreePatterns.set(degreeLine, riff.id);
      }
    }
  }
  for (const [pattern, count] of degreePatternCounts) {
    if (catalog.riffs.length && count / catalog.riffs.length > 0.2) {
      issue(warnings, filePath, `More than 20% of riffs share degree pattern ${pattern}.`);
    }
  }
  return catalog.riffs.length;
}

function validateSyllabus(root, errors) {
  const filePath = path.join(root, "education", "syllabus.json");
  if (!fs.existsSync(filePath)) return;
  const syllabus = readJSON(filePath, errors);
  if (!syllabus) return;
  if (syllabus.schema !== 2) issue(errors, filePath, "Syllabus schema must be 2.");
  if (!Number.isInteger(syllabus.revision) || syllabus.revision < 1) issue(errors, filePath, "Syllabus revision must be at least 1.");
  if (!Array.isArray(syllabus.entries)) {
    issue(errors, filePath, "Syllabus entries must be an array.");
    return;
  }
  const ids = new Set();
  const allowedTypes = new Set(["lesson", "daily-riff", "translation-repair", "catalog-maintenance", "unit"]);
  const allowedStatuses = new Set(["open", "in-progress", "done"]);
  for (const entry of syllabus.entries) {
    checkSlug(entry.id, "syllabus entry id", filePath, errors);
    if (ids.has(entry.id)) issue(errors, filePath, `Duplicate syllabus id: ${entry.id}.`);
    ids.add(entry.id);
    if (!allowedTypes.has(entry.type)) issue(errors, filePath, `${entry.id} has invalid type.`);
    if (!allowedStatuses.has(entry.status)) issue(errors, filePath, `${entry.id} has invalid status.`);
    if (typeof entry.goal !== "string" || !entry.goal.trim()) issue(errors, filePath, `${entry.id} needs a goal.`);
    if (entry.status === "done" && !/^\d{4}-\d{2}-\d{2}$/.test(entry.completedAt || "")) {
      issue(errors, filePath, `${entry.id} needs an ISO completedAt date when done.`);
    }
    if (entry.status !== "done" && entry.completedAt != null) {
      issue(errors, filePath, `${entry.id} completedAt must be null until done.`);
    }
    if (entry.course) {
      const referencedCatalogPath = path.join(root, "education", "courses", entry.course, "catalog.json");
      const catalog = readJSON(referencedCatalogPath, errors);
      const section = catalog?.sections?.find((value) => value.id === entry.section);
      const unit = section?.units?.find((value) => value.id === entry.unit);
      if (!catalog || !section || !unit) issue(errors, filePath, `${entry.id} references an unknown course, section, or unit.`);
      if (entry.type === "translation-repair" && !unit?.lessons?.some((value) => value.id === entry.lesson)) {
        issue(errors, filePath, `${entry.id} references an unknown lesson.`);
      }
    }
  }
}

function validateV2(root = path.join(__dirname, "..", "v2"), options = {}) {
  const strictLocales = options.strictLocales ?? true;
  const errors = [];
  const warnings = [];
  const coursesRoot = path.join(root, "education", "courses");
  let courseDirectories = [];
  try {
    courseDirectories = fs.readdirSync(coursesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !OS_METADATA.test(entry.name))
      .map((entry) => path.join(coursesRoot, entry.name));
  } catch (error) {
    issue(errors, coursesRoot, `Unable to read courses: ${error.message}`);
  }
  const state = {
    errors,
    warnings,
    seenLessonIDs: new Set(),
    bodyHashes: new Map(),
    paragraphHashes: new Map(),
  };
  validateCourseIndex(coursesRoot, errors, warnings);
  const lessons = courseDirectories.reduce(
    (count, courseRoot) => count + validateCourse(courseRoot, { strictLocales }, state), 0);
  const riffs = validateDailyRiffs(root, errors, warnings);
  validateSyllabus(root, errors);
  return { valid: errors.length === 0, errors, warnings, lessons, courses: courseDirectories.length, riffs };
}

function printGrouped(label, entries, writer) {
  if (!entries.length) return;
  writer(`${label}:`);
  let previousPath;
  for (const entry of entries) {
    if (entry.path !== previousPath) writer(`  ${entry.path}`);
    writer(`    - ${entry.message}`);
    previousPath = entry.path;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const strictLocales = !args.includes("--no-strict-locales");
  const root = args.find((argument) => !["--strict-locales", "--no-strict-locales"].includes(argument));
  const result = validateV2(root, { strictLocales });
  printGrouped("Warnings", result.warnings, console.warn);
  if (!result.valid) {
    printGrouped("Errors", result.errors, console.error);
    console.error(`Validation failed: ${result.errors.length} error(s), ${result.warnings.length} warning(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Validated ${result.lessons} Lessons v2 Markdown files in ${result.courses} course(s) and ${result.riffs} daily riff(s); ${result.warnings.length} warning(s).`);
  }
}

module.exports = { ACCEPTED_FENCES, REQUIRED_LOCALES, validateV2 };
