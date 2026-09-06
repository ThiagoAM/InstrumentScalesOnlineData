const fs = require("node:fs");
const path = require("node:path");

/** Reject retired lesson sources before a generator or publisher writes anything. */
function assertCurrentEducationOnly(root) {
  for (const retired of ["legacy", "v1/education", "api/education", "education"]) {
    if (fs.existsSync(path.join(root, retired))) {
      throw new Error(`Retired education source: ${retired}. Only V2 Markdown lessons are supported.`);
    }
  }
  const compatibility = path.join(root, "v1");
  if (fs.existsSync(compatibility)) {
    for (const entry of fs.readdirSync(compatibility)) {
      if (!["home", "toggles"].includes(entry)) {
        throw new Error(`Unsupported V1 payload: ${entry}`);
      }
    }
  }
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (["lesson-content.json", "lessonIDs.json", "lessons.json", "sections.json", "units.json"].includes(entry.name)) {
        throw new Error(`Retired JSON lesson source: ${path.relative(root, file)}`);
      }
    }
  }
  visit(path.join(root, "v2"));
}

module.exports = { assertCurrentEducationOnly };
