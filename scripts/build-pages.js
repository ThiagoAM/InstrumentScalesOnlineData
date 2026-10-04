#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { assertWritesAllowed } = require("./maintenance-guard");
const { validateEditorial } = require("./validate-editorial");
const {
  publishedInventory,
  defaultStateRoot,
  sha,
} = require("./source-inventory");
function buildPages(
  root,
  {
    reviewSnapshot = false,
    stateRoot = defaultStateRoot(root),
    commit = null,
    resume = false,
  } = {},
) {
  assertWritesAllowed();
  require("./education-format-policy").assertCurrentEducationOnly(root);
  const gate = validateEditorial(root, {
    requirePublicationApproval: !reviewSnapshot,
  });
  if (!gate.valid) throw new Error(gate.errors.join("\n"));
  if (!commit)
    try {
      commit = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim();
    } catch {}
  const files = publishedInventory(root, { previewSite: reviewSnapshot });
  const dist = path.join(root, "dist");
  if (!reviewSnapshot)
    require("./source-inventory").assertCommitClean(root, commit);
  const manifest = {
    schema: 1,
    commit,
    snapshotSHA256: sha(JSON.stringify(files)),
    publicationStatus: reviewSnapshot ? "review-pending" : "approved",
    files,
  };
  const buildRoot = path.join(stateRoot, "builds");
  const journal = path.join(buildRoot, "active.json");
  let stage = path.join(buildRoot, "stage-" + crypto.randomUUID());
  let backup = path.join(buildRoot, "previous-" + crypto.randomUUID());
  if (fs.existsSync(journal)) {
    const previous = JSON.parse(fs.readFileSync(journal));
    if (previous.state !== "complete") {
      if (!resume)
        throw new Error(
          "Partial build preserved; use --resume-build for the same reviewed bytes and commit.",
        );
      if (
        JSON.stringify(previous.manifest) !== JSON.stringify(manifest) ||
        previous.dist !== dist
      )
        throw new Error(
          "Partial build belongs to different bytes or commit. Preserve and reconcile it.",
        );
      for (const [key, prefix] of [
        ["stage", "stage-"],
        ["backup", "previous-"],
      ]) {
        if (
          path.dirname(previous[key] || "") !== buildRoot ||
          !path.basename(previous[key]).startsWith(prefix)
        )
          throw new Error("Unknown partial build path preserved.");
      }
      stage = previous.stage;
      backup = previous.backup;
      if (
        !fs.existsSync(stage) &&
        fs.existsSync(path.join(dist, "snapshot.json")) &&
        JSON.stringify(
          JSON.parse(fs.readFileSync(path.join(dist, "snapshot.json"))),
        ) === JSON.stringify(manifest) &&
        JSON.stringify(
          Object.fromEntries(
            Object.entries(
              require("./editorial-pipeline").treeManifest(dist),
            ).filter(([file]) => file !== "snapshot.json"),
          ),
        ) === JSON.stringify(files)
      ) {
        require("./editorial-pipeline").atomicJSON(journal, {
          dist,
          backup,
          state: "complete",
          manifest,
        });
        return manifest;
      }
      if (!fs.existsSync(stage))
        throw new Error(
          "Partial stage missing; preserve prior dist and checkpoint.",
        );
      const partial = require("./editorial-pipeline").treeManifest(stage);
      delete partial["snapshot.json"];
      for (const [file, digest] of Object.entries(partial)) {
        if (files[file] !== digest)
          throw new Error(
            "Partial build has unknown or modified bytes: " + file,
          );
      }
    }
  }
  fs.mkdirSync(stage, { recursive: true });
  require("./editorial-pipeline").atomicJSON(journal, {
    stage,
    backup,
    dist,
    state: "copying",
    manifest,
  });
  for (const [file, digest] of Object.entries(files)) {
    const target = path.join(stage, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (file === ".nojekyll") fs.writeFileSync(target, "");
    else
      fs.copyFileSync(
        path.join(
          root,
          file.startsWith("instrument-scales/") ? "site/" + file : file,
        ),
        target,
      );
    if (sha(fs.readFileSync(target)) !== digest)
      throw new Error("Build source drift: " + file);
  }
  fs.writeFileSync(
    path.join(stage, "snapshot.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  require("./editorial-pipeline").atomicJSON(journal, {
    stage,
    backup,
    dist,
    state: "ready",
    manifest,
  });
  assertWritesAllowed();
  try {
    if (fs.existsSync(dist)) fs.renameSync(dist, backup);
    fs.renameSync(stage, dist);
    require("./editorial-pipeline").atomicJSON(journal, {
      dist,
      backup,
      state: "complete",
      manifest,
    });
  } catch (error) {
    if (!fs.existsSync(dist) && fs.existsSync(backup))
      fs.renameSync(backup, dist);
    throw error;
  }
  return manifest;
}
if (require.main === module)
  try {
    const root =
      process.env.EDITORIAL_REPOSITORY_ROOT || path.join(__dirname, "..");
    if (process.argv.includes("--discard-partial")) {
      const reason =
        process.argv[process.argv.indexOf("--discard-partial") + 1];
      console.log(
        JSON.stringify(
          discardPartialBuild(root, defaultStateRoot(root), reason),
          null,
          2,
        ),
      );
      process.exit(0);
    }
    const result = buildPages(root, {
      commit: process.env.GITHUB_SHA || null,
      reviewSnapshot: process.argv.includes("--review-snapshot"),
      resume: process.argv.includes("--resume-build"),
    });
    console.log(
      "Built complete " +
        result.publicationStatus +
        " snapshot. Prepared site appears only in local review preview; production respects explicit site enablement.",
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
function discardPartialBuild(root, stateRoot, reason) {
  assertWritesAllowed();
  if (!reason)
    throw new Error(
      "A concrete partial-build reconciliation reason is required.",
    );
  const buildRoot = path.join(stateRoot, "builds"),
    journal = path.join(buildRoot, "active.json");
  if (!fs.existsSync(journal)) return { discarded: false };
  const previous = JSON.parse(fs.readFileSync(journal));
  if (previous.state === "complete")
    throw new Error("Completed build is not a partial checkpoint.");
  for (const [key, prefix] of [
    ["stage", "stage-"],
    ["backup", "previous-"],
  ])
    if (
      path.dirname(previous[key] || "") !== buildRoot ||
      !path.basename(previous[key]).startsWith(prefix)
    )
      throw new Error("Unknown partial paths preserved.");
  const archive = path.join(buildRoot, "discarded-" + crypto.randomUUID());
  fs.mkdirSync(archive);
  for (const key of ["stage", "backup"])
    if (fs.existsSync(previous[key]))
      fs.renameSync(previous[key], path.join(archive, key));
  fs.renameSync(journal, path.join(archive, "journal.json"));
  require("./editorial-pipeline").atomicJSON(
    path.join(archive, "reconciliation.json"),
    { reason, at: new Date().toISOString(), previous },
  );
  return {
    discarded: true,
    preserved: archive,
    next: "Prepare a new reviewed build. No partial source or prior dist was deleted.",
  };
}
module.exports = { buildPages, discardPartialBuild };
