const fs = require("node:fs");
const path = require("node:path");

/** Reject retired lesson sources before a generator or publisher writes anything. */
function assertCurrentEducationOnly(root) {
  for (const retired of [
    "legacy",
    "v1/education",
    "api/education",
    "education",
  ]) {
    if (fs.existsSync(path.join(root, retired))) {
      throw new Error(
        `Retired education source: ${retired}. Only V2 Markdown lessons are supported.`,
      );
    }
  }
  const compatibility = path.join(root, "v1");
  if (fs.existsSync(compatibility)) {
    for (const entry of fs.readdirSync(compatibility)) {
      if (
        !["home", "toggles", ".DS_Store", "Thumbs.db", "Desktop.ini"].includes(
          entry,
        ) &&
        !entry.startsWith("._")
      ) {
        throw new Error(`Unsupported V1 payload: ${entry}`);
      }
    }
  }
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (
        [
          "lesson-content.json",
          "lessonIDs.json",
          "lessons.json",
          "sections.json",
          "units.json",
        ].includes(entry.name)
      ) {
        throw new Error(
          `Retired JSON lesson source: ${path.relative(root, file)}`,
        );
      }
    }
  }
  visit(path.join(root, "v2"));
}

function assertSeedWorkspace(root) {
  if (
    fs.existsSync(path.join(root, "editorial/baseline-lesson-identities.json"))
  )
    throw new Error(
      "Mature published catalog cannot be regenerated. Author an editorial candidate instead. Seed generators run only in a disposable fixture directory.",
    );
  const maintenance = path.join(
    require("node:os").homedir(),
    "Library/Application Support/MacMiniServer/scheduled-jobs/disk-maintenance/active.json",
  );
  if (fs.existsSync(maintenance))
    throw new Error(
      "Disk maintenance is active; preserve the checkpoint and wait for release.",
    );
}
module.exports = { assertCurrentEducationOnly, assertSeedWorkspace };
