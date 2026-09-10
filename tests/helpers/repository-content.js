const fs = require("node:fs");

// Count the actual source files independently of the catalog walkers under test.
function countLessonFiles(root) {
  return fs.readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name === "lesson.md").length;
}

module.exports = { countLessonFiles };
