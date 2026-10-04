const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { sha, verifyReceipt } = require("./audit-swift-parser");
const {
  assertCommitClean,
  publishedInventory,
  inventory,
} = require("./source-inventory");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const api = () => require("./editorial-pipeline");
const EVIDENCE_KEYS = {
  validated: ["receiptPath"],
  "review-pending": ["reason", "reviewRequest"],
  "review-approved": ["reviewReference"],
  "commit-created": ["commit"],
  "push-confirmed": ["remoteCommit"],
  "notification-recorded": ["notificationID", "notificationSkipped"],
  quarantined: ["reason"],
};
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
function riffHash(riff) {
  return sha(
    JSON.stringify(
      canonical(
        Object.fromEntries(
          [
            "id",
            "date",
            "titles",
            "blurbs",
            "fence",
            "instruments",
            "requiredCapabilities",
            "validUntil",
            "originalDate",
            "rotationApproved",
          ]
            .filter((key) => riff[key] !== undefined)
            .map((key) => [key, riff[key]]),
        ),
      ),
    ),
  );
}
function targetFor(item) {
  return (
    item.target || {
      kind: "file",
      path: item.source,
      sha256: item.contentSHA256,
      files: [item.source],
    }
  );
}
function readTarget(root, file, ref) {
  if (!file.startsWith("v2/"))
    throw new Error("Delivery target must be inside published V2.");
  return ref
    ? execFileSync("git", ["show", ref + ":" + file], {
        cwd: root,
        maxBuffer: 32 * 1024 * 1024,
      })
    : fs.readFileSync(path.join(root, file));
}
function assertDelivered(root, item, ref = null) {
  const target = targetFor(item),
    bytes = readTarget(root, target.path, ref);
  if (target.kind === "riff-list") {
    const catalog = JSON.parse(bytes);
    if (!Object.keys(target.riffHashes || {}).length)
      throw new Error("Riff target has no approved entries.");
    for (const [id, digest] of Object.entries(target.riffHashes)) {
      const riff = catalog.riffs.find((r) => r.id === id);
      if (!riff || riffHash(riff) !== digest)
        throw new Error("Approved riff was not delivered: " + id);
    }
  } else if (sha(bytes) !== (target.sha256 || item.contentSHA256))
    throw new Error("Reviewed delivery target differs: " + target.path);
  return true;
}
function assertDelta(root, batch, commit) {
  if (!batch.baseCommit) return;
  const changed = execFileSync(
    "git",
    ["diff", "--name-only", batch.baseCommit, commit, "--", "v2"],
    { cwd: root, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  const allowed = new Set(
    batch.items.flatMap(
      (item) => targetFor(item).files || [targetFor(item).path],
    ),
  );
  const extra = changed.filter((file) => !allowed.has(file));
  if (extra.length)
    throw new Error(
      "Published delta contains unselected targets: " + extra.join(", "),
    );
}
function save(stateRoot, batch) {
  return api().saveBatch(stateRoot, batch);
}
function complete(stateRoot, batch, status = "done") {
  const file = path.join(stateRoot, "item-outcomes.json"),
    ledger = fs.existsSync(file) ? read(file) : { schema: 1, items: {} };
  for (const item of batch.items)
    ledger.items[item.id] = {
      id: item.id,
      status,
      fingerprint: api().itemFingerprint(item),
      publishedCommit: batch.commit,
      completedAt: new Date().toISOString(),
      verifiedSnapshot: batch.snapshotSHA256,
      verifiedSnapshotKind: "artifact-tree-with-manifest",
      publicationAttempt: batch.key,
    };
  require("./editorial-state").writeState(
    stateRoot,
    "item-outcomes.json",
    ledger,
  );
}
function checkpoint(root, stateRoot, key, next, evidence = {}) {
  const allowed = EVIDENCE_KEYS[next];
  if (
    !allowed ||
    Object.keys(evidence).some((field) => !allowed.includes(field))
  )
    throw new Error(
      "Unsupported evidence keys/state. Deployment must be verified from actual served bytes.",
    );
  return api().withLock(stateRoot, () => {
    require("./editorial-state").assertActiveAttempt(stateRoot, key);
    const before = read(path.join(stateRoot, "batches", key + ".json"));
    if (before.lane === "coordinator-intervention")
      require("./coordinated-publication").assertCoordinator(root);
    if (next === "validated")
      verifyReceipt(
        root,
        read(path.join(root, "editorial/evidence/swift-parser.json")),
      );
    if (next === "review-approved") {
      const queue = api().effectiveQueue(root, stateRoot);
      before.items = before.items.map((selected) => {
        const current = queue.items.find((i) => i.id === selected.id);
        if (
          !current ||
          api().itemFingerprint(current) !== api().itemFingerprint(selected)
        )
          throw new Error(
            "Selected identity/revision/content changed; use reselect before commit.",
          );
        api().gateItem(current, {
          root,
          receipt: read(
            path.join(root, "editorial/evidence/swift-parser.json"),
          ),
        });
        assertDelivered(root, current);
        return current;
      });
      const result = require("./validate-editorial").validateEditorial(root, {
        requirePublicationApproval: true,
      });
      if (!result.valid) throw new Error(result.errors.join("\n"));
      before.contentSnapshotSHA256 = sha(
        JSON.stringify(publishedInventory(root)),
      );
      before.reviewedV2 = inventory(root, ["v2"]);
    }
    if (next === "commit-created") {
      if (!/^[0-9a-f]{40}$/.test(evidence.commit || ""))
        throw new Error("A real commit SHA is required.");
      before.reservationDay = api().assertDailyPublicationBudget(
        stateRoot,
        before,
      );
      assertCommitClean(root, evidence.commit);
      for (const item of before.items) {
        if (
          require("./editorial-item").itemContentDigest(
            item,
            execFileSync("git", ["show", evidence.commit + ":" + item.source], {
              cwd: root,
              maxBuffer: 32 * 1024 * 1024,
            }),
          ) !== item.contentSHA256
        )
          throw new Error("Commit lost authored/reviewed candidate bytes.");
        assertDelivered(root, item, evidence.commit);
      }
      assertDelta(root, before, evidence.commit);
      if (
        sha(
          JSON.stringify(
            publishedInventory(root, { committed: true, ref: evidence.commit }),
          ),
        ) !== before.contentSnapshotSHA256
      )
        throw new Error(
          "Committed content differs from the reviewed snapshot.",
        );
    }
    if (next === "push-confirmed") {
      const snapshot = read(
          path.join(stateRoot, "snapshots", before.snapshotSHA256 + ".json"),
        ),
        manifest = read(
          path.join(stateRoot, "snapshots", snapshot.key, "snapshot.json"),
        );
      if (
        manifest.commit !== before.commit ||
        manifest.snapshotSHA256 !== before.contentSnapshotSHA256
      )
        throw new Error("Finalize this commit snapshot first.");
      const actual = execFileSync(
        "git",
        ["ls-remote", "origin", "refs/heads/main"],
        { cwd: root, encoding: "utf8", timeout: 20000 },
      ).split(/\s+/)[0];
      if (actual !== before.commit)
        throw new Error(
          "Remote main differs; rebind to its descendant/corrective commit after reconciliation.",
        );
      evidence = { remoteCommit: actual };
    }
    return save(stateRoot, api().transition(before, next, evidence));
  });
}
function rebindCommit(root, stateRoot, key, commit, contentChanged = false) {
  return api().withLock(stateRoot, () => {
    require("./editorial-state").assertActiveAttempt(stateRoot, key);
    const batch = read(path.join(stateRoot, "batches", key + ".json"));
    if (batch.lane === "coordinator-intervention")
      require("./coordinated-publication").assertCoordinator(root);
    if (
      !["commit-created", "push-confirmed", "quarantined"].includes(
        batch.state,
      ) ||
      !batch.commit
    )
      throw new Error("Only a committed/pushed attempt may be rebound.");
    execFileSync("git", ["merge-base", "--is-ancestor", batch.commit, commit], {
      cwd: root,
      stdio: "pipe",
    });
    assertCommitClean(root, commit);
    const digest = sha(
      JSON.stringify(
        publishedInventory(root, { committed: true, ref: commit }),
      ),
    );
    if (digest !== batch.contentSnapshotSHA256 && !contentChanged)
      throw new Error("Content changed; reopen review explicitly.");
    const previous = batch.commit;
    delete batch.snapshotSHA256;
    if (contentChanged) {
      batch.previousCommit = previous;
      delete batch.commit;
      delete batch.contentSnapshotSHA256;
      batch.state = "review-pending";
      batch.items = api()
        .effectiveQueue(root, stateRoot)
        .items.filter((item) => batch.itemIDs.includes(item.id));
    } else {
      for (const item of batch.items) assertDelivered(root, item, commit);
      assertDelta(root, batch, commit);
      batch.commit = commit;
      batch.state = "commit-created";
    }
    batch.history.push({
      state: batch.state,
      at: new Date().toISOString(),
      reason: "Rebound descendant/corrective commit",
      previousCommit: previous,
      commit,
      contentChanged,
    });
    return save(stateRoot, batch);
  });
}
async function confirmDeployment(
  root,
  stateRoot,
  key,
  baseURL,
  fetcher = fetch,
  { allowLocalFixture = false } = {},
) {
  require("./editorial-state").assertActiveAttempt(stateRoot, key);
  const batch = read(path.join(stateRoot, "batches", key + ".json"));
  if (batch.lane === "coordinator-intervention")
    require("./coordinated-publication").assertCoordinator(root);
  if (batch.state !== "push-confirmed")
    throw new Error("Confirm the actual push first.");
  const snapshot = read(
    path.join(stateRoot, "snapshots", batch.snapshotSHA256 + ".json"),
  );
  const publisher = read(path.join(root, "editorial/publisher.json"));
  await api().verifyDeployment(baseURL, snapshot, fetcher, () => {}, {
    expectedBaseURL: publisher.publicBaseURL,
    allowLocalFixture: allowLocalFixture && publisher.fixture === true,
  });
  for (const item of batch.items) assertDelivered(root, item, batch.commit);
  return api().withLock(stateRoot, () => {
    const current = read(path.join(stateRoot, "batches", key + ".json"));
    if (current.commit !== batch.commit || current.state !== "push-confirmed")
      throw new Error("Attempt changed during deployment verification.");
    complete(stateRoot, batch);
    current.state = "deployment-confirmed";
    const verifiedAt = new Date().toISOString();
    current.publicationDay = api().editorialDay(new Date(verifiedAt));
    current.deployment = {
      baseURL,
      verifiedAt,
      snapshotSHA256: batch.snapshotSHA256,
    };
    current.history.push({
      state: current.state,
      at: new Date().toISOString(),
      evidence: current.deployment,
    });
    return save(stateRoot, current);
  });
}
async function reconcileP0(
  root,
  stateRoot,
  commit,
  baseURL,
  { allowLocalFixture = false } = {},
) {
  require("./coordinated-publication").assertCoordinator(root);
  assertCommitClean(root, commit);
  const gate = require("./validate-editorial").validateEditorial(root, {
    requirePublicationApproval: true,
  });
  if (!gate.valid) throw new Error(gate.errors.join("\n"));
  const publisher = read(path.join(root, "editorial/publisher.json"));
  const actual = new URL(baseURL),
    expected = new URL(
      publisher.publicBaseURL ||
        "https://thiagoam.github.io/InstrumentScalesOnlineData",
    );
  if (
    !(
      allowLocalFixture &&
      publisher.fixture === true &&
      actual.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(actual.hostname)
    ) &&
    (actual.origin !== expected.origin ||
      actual.pathname.replace(/\/$/, "") !==
        expected.pathname.replace(/\/$/, ""))
  )
    throw new Error(
      "Coordinator reconciliation requires the real configured Pages URL.",
    );
  const proof = await require("./smoke-pages").smokePages(baseURL, {
    files: publishedInventory(root, { committed: true, ref: commit }),
    commit,
  });
  if (!/^[a-f0-9]{64}$/.test(proof.artifactSHA256 || ""))
    throw new Error(
      "P0 reconciliation requires the exact served manifest bytes.",
    );
  return api().withLock(stateRoot, () => {
    assertCommitClean(root, commit);

    const queue = read(path.join(root, "editorial/queue.json")),
      repair = read(path.join(root, "editorial/evidence/legacy-repair.json")),
      file = path.join(stateRoot, "item-outcomes.json"),
      ledger = fs.existsSync(file) ? read(file) : { schema: 1, items: {} };
    let count = 0;
    for (const item of queue.items.filter((i) => i.type === "repair")) {
      const change = repair.changes.find(
        (c) => c.id === item.id.replace(/^repair-/, ""),
      );
      if (!change)
        throw new Error(
          "P0 repair identity is missing its audited change: " + item.id,
        );
      const bytes = execFileSync("git", ["show", commit + ":" + change.path], {
        cwd: root,
        maxBuffer: 32 * 1024 * 1024,
      });
      if (sha(bytes) !== change.servedSHA256)
        throw new Error("P0 delivered bytes differ: " + change.id);
      ledger.items[item.id] = ["syntactic", "editorial-equivalent"].includes(
        change.classification,
      )
        ? {
            id: item.id,
            status: "done",
            fingerprint: api().itemFingerprint(item),
            publishedCommit: commit,
            verifiedSnapshot: proof.artifactSHA256,
            verifiedSnapshotKind: "artifact-tree-with-manifest",
            verifiedContentSHA256: proof.snapshotSHA256,
            completedAt: new Date().toISOString(),
            lane: "coordinator-intervention",
          }
        : {
            id: item.id,
            status: "blocked-human",
            fingerprint: api().itemFingerprint(item),
            blockedContentSHA256: item.contentSHA256,
            blockedEvidenceSHA256: sha(
              JSON.stringify(item.reviewEvidence || {}),
            ),
            servedFallback: {
              commit,
              path: change.path,
              sha256: change.servedSHA256,
            },
            physicalProposal: "pending",
          };
      if (
        ["syntactic", "editorial-equivalent"].includes(change.classification)
      ) {
        require("./equivalent-repair").assertEquivalentRepair(root, item);
        count++;
      }
    }
    require("./editorial-state").initializeState(
      stateRoot,
      "Actual coordinator P0 deployment reconciled against Git and served bytes.",
      { initialOutcomes: ledger },
    );
    // initializeState may have resumed the exact original P0 ledger. Preserve
    // its first confirmation time when identity/proof/commit/fingerprint match;
    // a replay is another observation, not a new delivery.
    const initialized = read(file);
    for (const [id, outcome] of Object.entries(ledger.items)) {
      const previous = initialized.items[id];
      if (
        outcome.status === "done" &&
        outcome.lane === "coordinator-intervention" &&
        previous?.status === "done" &&
        previous.lane === outcome.lane &&
        previous.id === outcome.id &&
        previous.publishedCommit === outcome.publishedCommit &&
        previous.fingerprint === outcome.fingerprint &&
        previous.verifiedSnapshot === outcome.verifiedSnapshot &&
        previous.verifiedSnapshotKind === outcome.verifiedSnapshotKind &&
        previous.completedAt
      )
        outcome.completedAt = previous.completedAt;
    }
    require("./editorial-state").writeState(
      stateRoot,
      "item-outcomes.json",
      ledger,
    );
    require("./editorial-state").writeState(stateRoot, "p0-reconciled.json", {
      kind: "coordinator-p0",
      commit,
      count,
      proof,
      at: new Date().toISOString(),
    });
    return {
      equivalentRepairsReconciled: count,
      pendingPhysicalProposals: repair.changes.filter(
        (c) => c.classification === "musical",
      ).length,
    };
  });
}
module.exports = {
  canonical,
  checkpoint,
  rebindCommit,
  confirmDeployment,
  reconcileP0,
  targetFor,
  assertDelivered,
  riffHash,
  complete,
};

function stockHash(riff) {
  const value = canonical(
    Object.fromEntries(
      ["id", "date", "titles", "blurbs", "fence"].map((key) => [
        key,
        riff[key],
      ]),
    ),
  );
  const serialize = (value) =>
    Array.isArray(value)
      ? "[" + value.map(serialize).join(", ") + "]"
      : value && typeof value === "object"
        ? "{" +
          Object.entries(value)
            .map(([key, v]) => JSON.stringify(key) + ": " + serialize(v))
            .join(", ") +
          "}"
        : JSON.stringify(value);
  return sha(serialize(value));
}
module.exports.stockHash = stockHash;
