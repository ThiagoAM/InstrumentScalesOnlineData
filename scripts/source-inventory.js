const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const codeUnitCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const IGNORED =
  /(^|\/)(?:\.DS_Store|\._[^/]*|Thumbs\.db|Desktop\.ini)|(?:~|\.swp|\.tmp)$/;
function sourcePaths(
  root,
  directories,
  { committed = false, ref = "HEAD" } = {},
) {
  let paths;
  try {
    paths = execFileSync(
      "git",
      committed
        ? ["ls-tree", "-r", "--name-only", "-z", ref, "--", ...directories]
        : [
            "ls-files",
            "-z",
            "--cached",
            "--others",
            "--exclude-standard",
            "--",
            ...directories,
          ],
      {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 64 * 1024 * 1024,
        timeout: 20000,
      },
    )
      .toString()
      .split("\0")
      .filter(Boolean);
  } catch (error) {
    let outside = false;
    try {
      execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 1024 * 1024,
        timeout: 20000,
      });
    } catch (probe) {
      outside =
        probe.status === 128 &&
        /not a git repository/i.test(String(probe.stderr));
    }
    if (!outside || committed) throw error;
    // Tiny non-Git unit fixtures only. Production is always verified against Git.
    paths = [];
    function walk(directory) {
      if (!fs.existsSync(directory)) return;
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(file);
        else paths.push(path.relative(root, file));
      }
    }
    for (const directory of directories) walk(path.join(root, directory));
  }
  return [...new Set(paths)].filter((file) => !IGNORED.test(file)).sort();
}
function inventory(root, directories, options = {}) {
  return Object.fromEntries(
    sourcePaths(root, directories, options).map((file) => [
      file,
      sha(
        options.committed
          ? execFileSync("git", ["show", options.ref + ":" + file], {
              cwd: root,
              maxBuffer: 32 * 1024 * 1024,
            })
          : fs.readFileSync(path.join(root, file)),
      ),
    ]),
  );
}
function siteEnabled(root, { committed = false, ref = "HEAD" } = {}) {
  const file = path.join(root, "editorial/site-publication.json");
  let policy;
  try {
    policy = JSON.parse(
      committed
        ? execFileSync(
            "git",
            ["show", ref + ":editorial/site-publication.json"],
            { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
          )
        : fs.readFileSync(file),
    );
  } catch {
    return false;
  }
  return (
    policy.enabled === true &&
    policy.status === "enabled" &&
    Boolean(policy.intervention && policy.enabledAt)
  );
}
function publishedInventory(
  root,
  { previewSite = false, committed = false, ref = "HEAD" } = {},
) {
  const directories = ["v1", "v2"];
  if (previewSite || siteEnabled(root, { committed, ref }))
    directories.push("site/instrument-scales");
  const files = inventory(root, directories, { committed, ref });
  const published = Object.fromEntries(
    Object.entries(files).map(([file, digest]) => [
      file.startsWith("site/instrument-scales/") ? file.slice(5) : file,
      digest,
    ]),
  );
  published[".nojekyll"] = sha("");
  return Object.fromEntries(
    Object.entries(published).sort(([a], [b]) => codeUnitCompare(a, b)),
  );
}
function assertCommitClean(root, commit) {
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (head !== commit)
    throw new Error("HEAD must equal the recorded publishing commit.");
  const dirty = execFileSync(
    "git",
    [
      "status",
      "--porcelain",
      "--untracked-files=all",
      "--ignored",
      "--",
      "v1",
      "v2",
      "site",
      "editorial",
      "scripts",
      "tests",
      "README.md",
      "OPENCLAW.md",
      "create-lesson.js",
      ".github",
      ".gitignore",
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (
    dirty
      .split("\n")
      .filter(
        (line) =>
          line &&
          !/(^|\/)(?:\.DS_Store|\._[^/]*|Thumbs\.db|Desktop\.ini)$/.test(
            line.slice(3),
          ),
      ).length
  )
    throw new Error(
      "Publishing scope has modified, untracked or ignored files. Preserve and reconcile them before recording the commit.\n" +
        dirty,
    );
}
function defaultStateRoot(root) {
  const namespace = sha("instrument-scales-online-data-v2").slice(0, 16);
  return (
    process.env.EDITORIAL_STATE_ROOT ||
    path.join(
      require("node:os").homedir(),
      "Library/Application Support/InstrumentScalesEditorial/state",
      namespace,
    )
  );
}
module.exports = {
  codeUnitCompare,
  sha,
  sourcePaths,
  inventory,
  publishedInventory,
  siteEnabled,
  assertCommitClean,
  defaultStateRoot,
};
