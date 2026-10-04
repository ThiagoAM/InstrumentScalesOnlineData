const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { sha } = require("./source-inventory");
function reconcileActive(root, stateRoot, key, reason) {
  require("./coordinated-publication").assertCoordinator(root);
  if (!/^[a-z0-9-]{1,64}$/.test(key || "") || !reason?.trim())
    throw new Error(
      "Reconciliation requires a safe known batch key and concrete reason.",
    );
  return require("./editorial-pipeline").withLock(stateRoot, () => {
    const identity = JSON.parse(
      fs.readFileSync(path.join(stateRoot, "identity.json")),
    );
    if (
      identity.repositoryID !== require("./editorial-state").REPOSITORY_ID ||
      !fs.existsSync(path.join(stateRoot, "item-outcomes.json"))
    )
      throw new Error(
        "Identity/outcomes missing; recover the known state before repairing its pointer.",
      );
    const file = path.join(stateRoot, "batches", key + ".json"),
      batch = JSON.parse(fs.readFileSync(file));
    const states = [
      "draft",
      "validated",
      "review-pending",
      "review-approved",
      "commit-created",
      "push-confirmed",
      "deployment-confirmed",
      "notification-recorded",
      "deferred",
      "quarantined",
    ];
    const history = batch.history?.filter(
      (entry) => entry.state !== "snapshot-finalized",
    );
    if (
      batch.key !== key ||
      !states.includes(batch.state) ||
      !Array.isArray(batch.items) ||
      !Array.isArray(batch.itemIDs) ||
      batch.items.length !== batch.itemIDs.length ||
      new Set(batch.itemIDs).size !== batch.itemIDs.length ||
      !history?.length ||
      history.at(-1).state !== batch.state ||
      history.some(
        (entry) =>
          !states.includes(entry.state) || Number.isNaN(Date.parse(entry.at)),
      )
    )
      throw new Error(
        "Authoritative batch identity/history is invalid; preserve all copies.",
      );
    for (const other of fs
      .readdirSync(path.join(stateRoot, "batches"))
      .filter((f) => f.endsWith(".json"))) {
      const value = JSON.parse(
        fs.readFileSync(path.join(stateRoot, "batches", other)),
      );
      if (
        value.key !== key &&
        (!["notification-recorded", "deferred", "quarantined"].includes(
          value.state,
        ) ||
          (value.state === "quarantined" && value.commit))
      )
        throw new Error(
          "Another uncertain attempt must be reconciled explicitly; never hide it.",
        );
    }
    if (batch.commit) {
      if (!/^[a-f0-9]{40}$/.test(batch.commit))
        throw new Error("Invalid authoritative commit.");
      execFileSync("git", ["cat-file", "-e", batch.commit + "^{commit}"], {
        cwd: root,
        timeout: 20000,
      });
      for (const item of batch.items)
        require("./publishing-state").assertDelivered(root, item, batch.commit);
    }
    const activeFile = path.join(stateRoot, "active.json"),
      before = fs.existsSync(activeFile)
        ? JSON.parse(fs.readFileSync(activeFile))
        : null;
    require("./editorial-state").writeState(
      stateRoot,
      "reconciliations/" + Date.now() + "-" + key + ".json",
      {
        reason,
        at: new Date().toISOString(),
        authoritativeSHA256: sha(fs.readFileSync(file)),
        before,
        after: batch,
        scope:
          "Pointer repair only; no publication/approval/quota transition fabricated.",
      },
    );
    require("./editorial-state").writeState(stateRoot, "active.json", batch);
    require("./editorial-state").assertState(stateRoot);
    return {
      key,
      state: batch.state,
      reconciled: true,
      next: "Resume this same known attempt and reconcile Git/Pages before another publication.",
    };
  });
}
module.exports = { reconcileActive };
