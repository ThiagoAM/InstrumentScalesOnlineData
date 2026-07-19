#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const ACTIVITIES = ["ear-training", "fretboard", "keyboard", "rhythm", "theory", "improvisation"];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readJSON(filePath, errors) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (error) {
    errors.push({ path: filePath, message: `Invalid JSON: ${error.message}` });
    return null;
  }
}

function frontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  return Object.fromEntries(match[1].split("\n")
    .map((line) => line.match(/^([^:]+):\s*(.*)$/)).filter(Boolean)
    .map((item) => [item[1].trim(), item[2].trim()]));
}

function requireLocales(values, label, filePath, errors) {
  for (const locale of REQUIRED_LOCALES) {
    if (typeof values?.[locale] !== "string" || !values[locale].trim()) {
      errors.push({ path: filePath, message: `Missing non-empty ${label}.${locale}.` });
    }
  }
}

function validateV2(root = path.join(__dirname, "..", "v2")) {
  const errors = [];
  const courseRoot = path.join(root, "education", "courses", "instrument-scales");
  const coursePath = path.join(courseRoot, "course.json");
  const catalogPath = path.join(courseRoot, "catalog.json");
  const course = readJSON(coursePath, errors);
  const catalog = readJSON(catalogPath, errors);
  if (!course || !catalog) return { valid: false, errors, sections: 0, units: 0, lessons: 0 };

  if (course.schema !== 2 || catalog.schema !== 2) errors.push({ path: courseRoot, message: "Schema must be 2." });
  if (course.id !== catalog.course) errors.push({ path: catalogPath, message: "Catalog course must match course.json." });
  if (JSON.stringify(course.levels) !== JSON.stringify(LEVELS)) errors.push({ path: coursePath, message: "Course levels are invalid or out of order." });
  requireLocales(course.titles, "titles", coursePath, errors);
  if (!Array.isArray(catalog.sections)) errors.push({ path: catalogPath, message: "sections must be an array." });

  const seen = new Set();
  let unitCount = 0;
  let lessonCount = 0;
  for (const [sectionIndex, section] of (catalog.sections || []).entries()) {
    if (!SLUG.test(section.id || "") || section.order !== sectionIndex + 1 || section.level !== LEVELS[sectionIndex]) {
      errors.push({ path: catalogPath, message: `Invalid section identity/order/level at index ${sectionIndex}.` });
    }
    requireLocales(section.titles, "section.titles", catalogPath, errors);
    requireLocales(section.summaries, "section.summaries", catalogPath, errors);
    if (!Array.isArray(section.units) || section.units.length < 1) errors.push({ path: catalogPath, message: `${section.id} needs units.` });

    for (const [unitIndex, unit] of (section.units || []).entries()) {
      unitCount += 1;
      if (!SLUG.test(unit.id || "") || unit.order !== unitIndex + 1) errors.push({ path: catalogPath, message: `Invalid unit in ${section.id}.` });
      requireLocales(unit.titles, "unit.titles", catalogPath, errors);
      requireLocales(unit.summaries, "unit.summaries", catalogPath, errors);
      if (!Array.isArray(unit.lessons) || unit.lessons.length < 1) errors.push({ path: catalogPath, message: `${unit.id} needs lessons.` });

      for (const [lessonIndex, lesson] of (unit.lessons || []).entries()) {
        lessonCount += 1;
        if (!SLUG.test(lesson.id || "") || seen.has(lesson.id)) errors.push({ path: catalogPath, message: `Invalid or duplicate lesson id ${lesson.id}.` });
        seen.add(lesson.id);
        if (lesson.order !== lessonIndex + 1 || !Number.isInteger(lesson.estimatedMinutes) || lesson.estimatedMinutes < 3 || lesson.estimatedMinutes > 10) {
          errors.push({ path: catalogPath, message: `Invalid order or duration for ${lesson.id}.` });
        }
        if (!ACTIVITIES.includes(lesson.activity)) errors.push({ path: catalogPath, message: `Invalid activity for ${lesson.id}.` });
        requireLocales(lesson.titles, "lesson.titles", catalogPath, errors);
        requireLocales(lesson.summaries, "lesson.summaries", catalogPath, errors);
        const expectedPath = `sections/${section.id}/units/${unit.id}/lessons/${lesson.id}/lesson.md`;
        if (lesson.path !== expectedPath) errors.push({ path: catalogPath, message: `${lesson.id} must use path ${expectedPath}.` });

        const lessonPath = path.join(courseRoot, expectedPath);
        let markdown;
        try { markdown = fs.readFileSync(lessonPath, "utf8"); }
        catch (error) { errors.push({ path: lessonPath, message: `Unable to read lesson: ${error.message}` }); continue; }
        const fields = frontMatter(markdown);
        if (!fields) { errors.push({ path: lessonPath, message: "Missing front matter." }); continue; }
        for (const [key, expected] of [["schema", "2"], ["id", lesson.id], ["course", catalog.course], ["level", section.level], ["section", section.id], ["unit", unit.id], ["order", String(lesson.order)], ["estimatedMinutes", String(lesson.estimatedMinutes)]]) {
          if (fields[key] !== expected) errors.push({ path: lessonPath, message: `${key} must be ${expected}.` });
        }
        for (const locale of REQUIRED_LOCALES) {
          for (const field of ["title", "summary"]) if (!fields[`${field}.${locale}`]) errors.push({ path: lessonPath, message: `Missing ${field}.${locale}.` });
          if (!markdown.includes(`:::locale ${locale}\n`)) errors.push({ path: lessonPath, message: `Missing localized body for ${locale}.` });
        }
        if (!/```(?:notes|fretboard)\n[\s\S]*?```/.test(markdown)) errors.push({ path: lessonPath, message: "Lesson needs a playable block." });
        if ((markdown.match(/:::checkpoint /g) || []).length < REQUIRED_LOCALES.length) errors.push({ path: lessonPath, message: "Every locale needs a checkpoint." });
      }
    }
  }
  return { valid: errors.length === 0, errors, sections: (catalog.sections || []).length, units: unitCount, lessons: lessonCount };
}

if (require.main === module) {
  const result = validateV2(process.argv[2]);
  if (!result.valid) { result.errors.forEach((error) => console.error(`${error.path}: ${error.message}`)); process.exitCode = 1; }
  else console.log(`Validated ${result.sections} sections, ${result.units} units, and ${result.lessons} V2 lessons.`);
}

module.exports = { REQUIRED_LOCALES, validateV2 };
