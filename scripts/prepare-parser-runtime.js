#!/usr/bin/env node
// Persistent source-pinned package CLIs. This never builds the app or changes its checkout.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync, execFileSync } = require("node:child_process");
const { sha } = require("./audit-swift-parser");
const { assertWritesAllowed } = require("./maintenance-guard");
const { withLock, atomicJSON } = require("./editorial-pipeline");
const PACKAGES = [
  "Packages/LessonsKit",
  "Packages/PracticeKit",
  "Packages/MusicLogicCore",
];
function argument(name) {
  const i = process.argv.indexOf(name);
  return i < 0 ? null : process.argv[i + 1];
}
function git(app, ...args) {
  return execFileSync("git", ["-C", app, ...args], {
    maxBuffer: 128 * 1024 * 1024,
  });
}
function filesIn(dir) {
  const out = [];
  function walk(d) {
    for (const e of fs
      .readdirSync(d, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else out.push(f);
    }
  }
  walk(dir);
  return out;
}
function prepare(app, ref, destination) {
  assertWritesAllowed();
  const commit = git(app, "rev-parse", `${ref}^{commit}`).toString().trim();
  const sourcePaths = git(
    app,
    "ls-tree",
    "-r",
    "--name-only",
    commit,
    "--",
    ...PACKAGES,
  )
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  if (!sourcePaths.includes("Packages/LessonsKit/Package.swift"))
    throw new Error("Selected commit does not contain LessonsKit.");
  const expected = Object.fromEntries(
    sourcePaths.map((file) => [
      file,
      sha(git(app, "show", `${commit}:${file}`)),
    ]),
  );
  const sourceSHA256 = sha(JSON.stringify(expected));
  const dir = path.join(destination, commit + "-" + sourceSHA256.slice(0, 12));
  const recordFile = path.join(dir, "provenance.json");
  if (fs.existsSync(recordFile)) {
    const p = JSON.parse(fs.readFileSync(recordFile));
    if (
      p.sourceSHA256 !== sourceSHA256 ||
      p.binarySHA256 !== sha(fs.readFileSync(p.binary))
    )
      throw new Error(
        "Persistent parser provenance mismatch. Preserve this runtime and investigate.",
      );
    for (const [file, digest] of Object.entries(expected))
      if (sha(fs.readFileSync(path.join(dir, file))) !== digest)
        throw new Error("Persistent parser source drift: " + file);
    if (!p.sourceRoot || !p.sourceFiles) {
      p.sourceRoot = dir;
      p.sourceFiles = expected;
      atomicJSON(recordFile, p);
    }
    return p;
  }
  const checkpointFile = path.join(dir, "preparation.json");
  if (fs.existsSync(dir)) {
    if (!fs.existsSync(checkpointFile))
      throw new Error(
        "Partial runtime has no known source checkpoint. Preserve it and reconcile manually.",
      );
    const checkpoint = JSON.parse(fs.readFileSync(checkpointFile));
    if (
      checkpoint.commit !== commit ||
      checkpoint.sourceSHA256 !== sourceSHA256
    )
      throw new Error(
        "Partial runtime belongs to different pinned sources; preserve it.",
      );
    for (const file of filesIn(dir).filter(
      (file) => !file.startsWith(path.join(dir, "build") + path.sep),
    )) {
      const relative = path.relative(dir, file);
      if (relative === "preparation.json") continue;
      if (
        !expected[relative] ||
        sha(fs.readFileSync(file)) !== expected[relative]
      )
        throw new Error(
          "Partial runtime has unknown or modified files: " + relative,
        );
    }
  } else fs.mkdirSync(dir, { recursive: false, mode: 0o700 });
  atomicJSON(checkpointFile, {
    schema: 1,
    commit,
    sourceSHA256,
    sourceFiles: expected,
    state: "extracting",
    updatedAt: new Date().toISOString(),
  });
  const archive = git(app, "archive", commit, ...PACKAGES);
  const extract = spawnSync("tar", ["-x", "-C", dir], {
    input: archive,
    encoding: null,
  });
  if (extract.status !== 0)
    throw new Error("Unable to extract pinned parser sources.");
  for (const [file, digest] of Object.entries(expected))
    if (sha(fs.readFileSync(path.join(dir, file))) !== digest)
      throw new Error("Archived source does not match git blob: " + file);
  const scratch = path.join(dir, "build");
  atomicJSON(checkpointFile, {
    schema: 1,
    commit,
    sourceSHA256,
    sourceFiles: expected,
    state: "building",
    updatedAt: new Date().toISOString(),
  });
  const build = spawnSync(
    "xcrun",
    [
      "swift",
      "build",
      "--package-path",
      path.join(dir, "Packages/LessonsKit"),
      "--scratch-path",
      scratch,
      "--product",
      "lessonlint",
      "--disable-sandbox",
      "--only-use-versions-from-resolved-file",
    ],
    { stdio: "inherit" },
  );
  if (build.status !== 0)
    throw new Error(
      "Package CLI build failed; pinned sources and diagnostics are preserved.",
    );
  const binary = path.join(scratch, "debug/lessonlint");
  if (!fs.existsSync(binary))
    throw new Error("The package build did not produce lessonlint.");
  for (const [file, digest] of Object.entries(expected))
    if (sha(fs.readFileSync(path.join(dir, file))) !== digest)
      throw new Error(
        "Source changed during SwiftPM build, including resolved dependencies: " +
          file +
          ". Preserve this checkpoint; no provenance is approved.",
      );
  const provenance = {
    schema: 1,
    commit,
    sourceSHA256,
    sourceRoot: dir,
    sourceFiles: expected,
    binary,
    binarySHA256: sha(fs.readFileSync(binary)),
    swiftVersion: execFileSync("xcrun", ["swift", "--version"])
      .toString()
      .trim(),
    createdAt: new Date().toISOString(),
    scope:
      "Source-pinned parser CLI, not the binary distributed by the App Store.",
  };
  atomicJSON(recordFile, provenance);
  for (const file of sourcePaths) fs.chmodSync(path.join(dir, file), 0o400);
  fs.chmodSync(binary, 0o500);
  return provenance;
}
if (require.main === module) {
  try {
    const app = argument("--app");
    const current = argument("--current-ref");
    const destination =
      argument("--runtime-root") ||
      path.join(
        os.homedir(),
        "Library/Application Support/InstrumentScalesEditorial/parsers",
      );
    if (!app || !current)
      throw new Error(
        "Usage: node scripts/prepare-parser-runtime.js --app <app checkout> --current-ref <committed app SHA> [--baseline-ref 5eab79a] [--runtime-root <private directory>]",
      );
    assertWritesAllowed();
    fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
    const result = withLock(destination, () => ({
      schema: 1,
      baseline: prepare(
        app,
        argument("--baseline-ref") || "5eab79a",
        destination,
      ),
      current: prepare(app, current, destination),
    }));
    const configuration = path.join(destination, "active-runtimes.json");
    atomicJSON(configuration, result);
    console.log(
      JSON.stringify(
        {
          configuration,
          LESSONLINT_BASELINE: result.baseline.binary,
          LESSONLINT_CURRENT: result.current.binary,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { prepare };
