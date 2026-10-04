const fs = require("node:fs");
const path = require("node:path");

// Count archive source files independently of the catalog walkers. Guided paths
// have their own index/validator and must not increase this legacy denominator.
function countLegacyLessonFiles(v2Root) {
  const coursesRoot = path.join(v2Root, "education", "courses");
  return fs.readdirSync(coursesRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name === "lesson.md").length;
}

function countDailyRiffs(v2Root) {
  const catalog = JSON.parse(fs.readFileSync(path.join(v2Root, "daily", "riffs.json"), "utf8"));
  return catalog.riffs.length;
}

module.exports = { countLegacyLessonFiles, countDailyRiffs };
