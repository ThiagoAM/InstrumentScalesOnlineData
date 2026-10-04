const fs = require("node:fs");
const path = require("node:path");
const { sha } = require("./source-inventory");

function verifyRuntime(runtime, { allowReview = false } = {}) {
  if (
    !runtime?.binary ||
    !runtime.sourceRoot ||
    !runtime.sourceFiles ||
    !runtime.sourceSHA256 ||
    sha(fs.readFileSync(runtime.binary)) !== runtime.binarySHA256
  ) {
    throw new Error("Parser binary or source provenance mismatch.");
  }
  if (!allowReview && !/^[a-f0-9]{40}$/.test(runtime.commit || "")) {
    throw new Error(
      "Production requires a parser prepared from a committed app SHA.",
    );
  }
  if (sha(JSON.stringify(runtime.sourceFiles)) !== runtime.sourceSHA256) {
    throw new Error("Parser source inventory digest mismatch.");
  }
  const sourceRoot = path.resolve(runtime.sourceRoot);
  for (const [file, digest] of Object.entries(runtime.sourceFiles)) {
    const source = path.resolve(sourceRoot, file);
    if (
      !source.startsWith(sourceRoot + path.sep) ||
      sha(fs.readFileSync(source)) !== digest
    ) {
      throw new Error("Parser source drift: " + file);
    }
  }
  return runtime;
}

function loadRuntimeConfig(file, { allowReview = false } = {}) {
  if (!file)
    throw new Error(
      "Use --runtime-config or EDITORIAL_RUNTIME_CONFIG with pinned persistent parser provenance.",
    );
  const config = JSON.parse(fs.readFileSync(file));
  if (config.reviewOnly === true && !allowReview) {
    throw new Error(
      "Review-only runtime cannot authorize candidate promotion or production.",
    );
  }
  for (const kind of ["baseline", "current"])
    verifyRuntime(config[kind], {
      allowReview: allowReview && config.reviewOnly === true,
    });
  return config;
}

function runCurrentParser(
  args,
  configurationFile = process.env.EDITORIAL_RUNTIME_CONFIG,
) {
  const config = loadRuntimeConfig(configurationFile);
  const run = require("node:child_process").spawnSync(
    config.current.binary,
    ["--all-locales", "--strict", ...args],
    {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (run.error) throw run.error;
  if (run.status !== 0)
    throw new Error((run.stdout || "") + (run.stderr || ""));
  return run.stdout;
}
module.exports = { loadRuntimeConfig, verifyRuntime, runCurrentParser };
