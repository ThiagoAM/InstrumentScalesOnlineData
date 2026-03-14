const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const REQUIRED_LOCALE_KEY = [...REQUIRED_LOCALES].sort().join("|");
const EXPECTED_TIERS = ["free", "max"];
const LEVEL_OPTIONS = ["beginner", "intermediate"];
const DIFFICULTY_OPTIONS = ["easy", "medium"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function defaultEducationRoot() {
  return path.join(__dirname, "..", "v1", "education");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function makeUtcTimestamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function educationPath(rootDir, ...segments) {
  return path.join(rootDir, ...segments);
}

function tierDir(rootDir, tierName) {
  return educationPath(rootDir, tierName);
}

function tierCoursesFile(rootDir, tierName) {
  return educationPath(rootDir, tierName, "courses.json");
}

function courseDir(rootDir, tierName, courseId) {
  return educationPath(rootDir, tierName, "courses", courseId);
}

function courseSectionsFile(rootDir, tierName, courseId) {
  return educationPath(courseDir(rootDir, tierName, courseId), "sections.json");
}

function courseLessonIdsFile(rootDir, tierName, courseId) {
  return educationPath(courseDir(rootDir, tierName, courseId), "lessonIDs.json");
}

function sectionDir(rootDir, tierName, courseId, sectionId) {
  return educationPath(courseDir(rootDir, tierName, courseId), "sections", sectionId);
}

function sectionUnitsFile(rootDir, tierName, courseId, sectionId) {
  return educationPath(sectionDir(rootDir, tierName, courseId, sectionId), "units.json");
}

function unitDir(rootDir, tierName, courseId, sectionId, unitId) {
  return educationPath(sectionDir(rootDir, tierName, courseId, sectionId), "units", unitId);
}

function unitLessonsFile(rootDir, tierName, courseId, sectionId, unitId) {
  return educationPath(unitDir(rootDir, tierName, courseId, sectionId, unitId), "lessons.json");
}

function lessonDir(rootDir, tierName, courseId, sectionId, unitId, lessonId) {
  return educationPath(unitDir(rootDir, tierName, courseId, sectionId, unitId), "lessons", lessonId);
}

function lessonContentFile(rootDir, tierName, courseId, sectionId, unitId, lessonId) {
  return educationPath(
    lessonDir(rootDir, tierName, courseId, sectionId, unitId, lessonId),
    "lesson-content.json"
  );
}

function listExistingTiers(rootDir) {
  return EXPECTED_TIERS.filter((tierName) => fs.existsSync(tierDir(rootDir, tierName)));
}

function loadCourses(rootDir, tierName) {
  const data = readJson(tierCoursesFile(rootDir, tierName));
  return Array.isArray(data.courses) ? data.courses : [];
}

function loadSections(rootDir, tierName, courseId) {
  const data = readJson(courseSectionsFile(rootDir, tierName, courseId));
  return Array.isArray(data) ? data : [];
}

function loadUnits(rootDir, tierName, courseId, sectionId) {
  const data = readJson(sectionUnitsFile(rootDir, tierName, courseId, sectionId));
  return Array.isArray(data) ? data : [];
}

function loadLessons(rootDir, tierName, courseId, sectionId, unitId) {
  const data = readJson(unitLessonsFile(rootDir, tierName, courseId, sectionId, unitId));
  return Array.isArray(data) ? data : [];
}

function generateCourseLessonIds(rootDir, tierName, courseId) {
  const sections = loadSections(rootDir, tierName, courseId);
  const lessonIds = [];

  for (const section of sections) {
    const units = loadUnits(rootDir, tierName, courseId, section.id);

    for (const unit of units) {
      const lessons = loadLessons(rootDir, tierName, courseId, section.id, unit.id);

      for (const lesson of lessons) {
        lessonIds.push(`${courseId}/${section.id}/${unit.id}/${lesson.id}`);
      }
    }
  }

  return lessonIds;
}

module.exports = {
  REQUIRED_LOCALES,
  REQUIRED_LOCALE_KEY,
  EXPECTED_TIERS,
  LEVEL_OPTIONS,
  DIFFICULTY_OPTIONS,
  SLUG_PATTERN,
  ISO_UTC_PATTERN,
  defaultEducationRoot,
  isPlainObject,
  makeUtcTimestamp,
  readJson,
  writeJson,
  ensureDirectory,
  tierDir,
  tierCoursesFile,
  courseDir,
  courseSectionsFile,
  courseLessonIdsFile,
  sectionDir,
  sectionUnitsFile,
  unitDir,
  unitLessonsFile,
  lessonDir,
  lessonContentFile,
  listExistingTiers,
  loadCourses,
  loadSections,
  loadUnits,
  loadLessons,
  generateCourseLessonIds,
};
