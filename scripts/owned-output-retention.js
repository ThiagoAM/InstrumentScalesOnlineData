const fs = require("node:fs"),
  path = require("node:path");
const { sha, codeUnitCompare } = require("./source-inventory");
function pruneOwnedOutputs(
  root,
  stateRoot,
  { keep = 2, reason, execute = false } = {},
) {
  require("./coordinated-publication").assertCoordinator(root);
  if (!Number.isInteger(keep) || keep < 2 || !reason)
    throw new Error(
      "Keep at least two verified copies and provide a concrete retention reason.",
    );
  return require("./editorial-pipeline").withLock(stateRoot, () => {
    require("./editorial-state").assertState(stateRoot);
    const outcomes = JSON.parse(
      fs.readFileSync(path.join(stateRoot, "item-outcomes.json")),
    ).items;
    const receipts = Object.values(outcomes).filter(
      (item) =>
        item.status === "done" && item.publishedCommit && item.verifiedSnapshot,
    );
    const activeFile = path.join(stateRoot, "active.json"),
      active = fs.existsSync(activeFile)
        ? JSON.parse(fs.readFileSync(activeFile))
        : null;
    const quarantined = path.join(stateRoot, "quarantine");
    const candidates = [];
    for (const [directory, prefix] of [
      ["builds", "previous-"],
      ["snapshots", ""],
    ]) {
      const parent = path.join(stateRoot, directory);
      if (!fs.existsSync(parent)) continue;
      for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith(prefix)) continue;
        const full = path.join(parent, entry.name),
          manifestFile = path.join(full, "snapshot.json");
        if (fs.lstatSync(full).isSymbolicLink() || !fs.existsSync(manifestFile))
          continue;
        const text = fs.readFileSync(manifestFile, "utf8"),
          manifest = JSON.parse(text),
          files = require("./editorial-pipeline").treeManifest(full),
          key = sha(JSON.stringify(files));
        const content = Object.fromEntries(
          Object.entries(files)
            .filter(([file]) => file !== "snapshot.json")
            .sort(([a], [b]) => codeUnitCompare(a, b)),
        );
        if (
          manifest.publicationStatus !== "approved" ||
          JSON.stringify(content) !== JSON.stringify(manifest.files) ||
          !receipts.some(
            (receipt) =>
              receipt.publishedCommit === manifest.commit &&
              receipt.verifiedSnapshot === key,
          ) ||
          active?.snapshotSHA256 === key ||
          fs.existsSync(path.join(quarantined, key + ".json"))
        )
          continue;
        try {
          if (!/^[a-f0-9]{40}$/.test(manifest.commit)) continue;
          const git = require("node:child_process").execFileSync;
          git("git", ["cat-file", "-e", manifest.commit + "^{commit}"], {
            cwd: root,
            timeout: 20000,
            stdio: ["ignore", "pipe", "pipe"],
          });
          let reconstructible = true;
          for (const [file, digest] of Object.entries(content)) {
            if (file === ".nojekyll") {
              if (digest !== sha("")) reconstructible = false;
              continue;
            }
            const source = file.startsWith("instrument-scales/")
              ? "site/" + file
              : file;
            const bytes = git("git", ["show", manifest.commit + ":" + source], {
              cwd: root,
              timeout: 20000,
              maxBuffer: 32 * 1024 * 1024,
              stdio: ["ignore", "pipe", "pipe"],
            });
            if (sha(bytes) !== digest) reconstructible = false;
          }
          if (!reconstructible) continue;
        } catch {
          continue;
        }
        candidates.push({
          directory: full,
          key,
          manifestJSON: text,
          modified: fs.statSync(full).mtimeMs,
        });
      }
    }
    candidates.sort(
      (a, b) =>
        b.modified - a.modified || codeUnitCompare(a.directory, b.directory),
    );
    const prune = candidates.slice(keep),
      archive = path.join(stateRoot, "retained-manifests");
    if (execute)
      for (const candidate of prune) {
        require("./editorial-state").writeState(
          stateRoot,
          "retained-manifests/" + candidate.key + ".json",
          {
            ...candidate,
            reason,
            at: new Date().toISOString(),
            scope:
              "Exact manifest preserved; full content is reconstructible from the verified published commit. Pending/uncommitted/quarantined/active copies never pruned.",
          },
        );
        fs.rmSync(candidate.directory, { recursive: true });
      }
    return {
      dryRun: !execute,
      retained: Math.min(keep, candidates.length),
      prunable: prune.map((candidate) => candidate.directory),
      preservedMetadata: archive,
    };
  });
}
module.exports = { pruneOwnedOutputs };
