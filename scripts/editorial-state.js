const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { sha } = require("./source-inventory");
const REPOSITORY_ID = "instrument-scales-online-data-v2";
function assertState(stateRoot) {
  const initialization = readInitialization(stateRoot);
  if (initialization?.status === "prepared")
    throw new Error(
      "Publisher initialization is incomplete. Replay the same validated coordinator initialization; preserve its journal and ledger.",
    );
  const file = path.join(stateRoot, "identity.json");
  if (!fs.existsSync(file))
    throw new Error(
      "Editorial state identity is missing. Restore its private recovery copy or explicitly reconcile the coordinator publication before selecting; never reopen all items silently.",
    );
  const identity = JSON.parse(fs.readFileSync(file));
  if (
    initialization &&
    sha(JSON.stringify(identity)) !== initialization.identitySHA256
  )
    throw new Error(
      "Publisher identity differs from its completed initialization transaction; preserve both.",
    );
  if (identity.repositoryID !== REPOSITORY_ID)
    throw new Error(
      "Editorial state belongs to another repository; preserve it.",
    );
  if (
    identity.requiresOutcomes &&
    !fs.existsSync(path.join(stateRoot, "item-outcomes.json"))
  )
    throw new Error(
      "Publisher outcome ledger is missing; restore private recovery instead of reopening delivered items.",
    );
  const batches = path.join(stateRoot, "batches"),
    activeFile = path.join(stateRoot, "active.json");
  if (fs.existsSync(batches)) {
    const uncertain = fs
      .readdirSync(batches)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(fs.readFileSync(path.join(batches, f))))
      .filter(
        (b) =>
          !["notification-recorded", "deferred", "quarantined"].includes(
            b.state,
          ) ||
          (b.state === "quarantined" && b.commit),
      );
    if (uncertain.length && !fs.existsSync(activeFile))
      throw new Error(
        "Active publisher checkpoint is missing while an attempt is uncertain. Restore/reconcile the known attempt.",
      );
    if (fs.existsSync(activeFile)) {
      const active = JSON.parse(fs.readFileSync(activeFile)),
        authoritative = path.join(batches, active.key + ".json");
      if (
        !fs.existsSync(authoritative) ||
        sha(JSON.stringify(active)) !==
          sha(JSON.stringify(JSON.parse(fs.readFileSync(authoritative))))
      )
        throw new Error(
          "Publisher batch/active checkpoint split detected. Preserve both copies and restore/reconcile the authoritative attempt.",
        );
      if (uncertain.some((batch) => batch.key !== active.key))
        throw new Error(
          "Another uncertain batch is hidden by the active checkpoint. Preserve and reconcile both identities.",
        );
    }
  }
  return identity;
}
function writeState(stateRoot, relative, value) {
  if (relative.includes("..") || path.isAbsolute(relative))
    throw new Error("Unsafe state path.");
  const identity =
    relative === "identity.json"
      ? value
      : JSON.parse(fs.readFileSync(path.join(stateRoot, "identity.json")));
  const atomic = require("./editorial-pipeline").atomicJSON;
  const recovery = stateRoot + ".recovery",
    mirror = path.join(recovery, "current", relative);
  if (fs.existsSync(mirror)) {
    const previous = path.join(recovery, "previous", relative);
    fs.mkdirSync(path.dirname(previous), { recursive: true });
    fs.copyFileSync(mirror, previous);
  }
  const record = {
    schema: 1,
    repositoryID: identity.repositoryID,
    relative,
    sha256: sha(JSON.stringify(value)),
    payload: value,
  };
  atomic(mirror, record);
  atomic(path.join(stateRoot, relative), value);
}
function outcomeIntent(ledger) {
  const intent = structuredClone(ledger);
  for (const item of Object.values(intent.items)) {
    // A P0 replay re-observes the same delivery at a later time. Keep the
    // originally journaled timestamp; every identity, fingerprint and proof
    // must still match. No other evidence field is ignored.
    if (item && typeof item === "object") delete item.completedAt;
  }
  return sha(JSON.stringify(require("./publishing-state").canonical(intent)));
}
function readInitialization(stateRoot) {
  const file = path.join(stateRoot, "initialization.json");
  if (!fs.existsSync(file)) return null;
  if (!fs.lstatSync(file).isFile())
    throw new Error("Unknown initialization journal is preserved.");
  const journal = JSON.parse(fs.readFileSync(file));
  if (
    journal.schema !== 1 ||
    journal.kind !== "editorial-state-initialization" ||
    journal.repositoryID !== REPOSITORY_ID ||
    journal.stateRoot !== path.resolve(stateRoot) ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      journal.transactionID || "",
    ) ||
    !["prepared", "complete"].includes(journal.status) ||
    (journal.status === "complete" &&
      Number.isNaN(Date.parse(journal.completedAt))) ||
    journal.identity?.schema !== 1 ||
    journal.identity.repositoryID !== REPOSITORY_ID ||
    journal.identity.requiresOutcomes !== true ||
    !journal.identity.reason ||
    Number.isNaN(Date.parse(journal.identity.initializedAt)) ||
    journal.outcomes?.schema !== 1 ||
    !journal.outcomes.items ||
    Array.isArray(journal.outcomes.items) ||
    typeof journal.outcomes.items !== "object" ||
    journal.identitySHA256 !== sha(JSON.stringify(journal.identity)) ||
    journal.outcomesSHA256 !== sha(JSON.stringify(journal.outcomes)) ||
    journal.outcomeIntentSHA256 !== outcomeIntent(journal.outcomes)
  )
    throw new Error(
      "Unknown or corrupted initialization journal is preserved.",
    );
  return journal;
}
function assertInitializationFiles(stateRoot, journal) {
  const allowed = new Set([
    "initialization.json",
    "identity.json",
    "item-outcomes.json",
    "builds",
    "publisher.lock",
  ]);
  for (const name of fs.readdirSync(stateRoot))
    if (!allowed.has(name))
      throw new Error("Ambiguous prior publisher state is preserved: " + name);
  for (const [name, expected] of [
    ["identity.json", journal.identitySHA256],
    ["item-outcomes.json", journal.outcomesSHA256],
  ]) {
    const file = path.join(stateRoot, name);
    if (
      fs.existsSync(file) &&
      (!fs.lstatSync(file).isFile() ||
        sha(JSON.stringify(JSON.parse(fs.readFileSync(file)))) !== expected)
    )
      throw new Error(
        "Initialization file differs from its known transaction: " + name,
      );
    for (const generation of ["current", "previous"]) {
      const mirror = path.join(stateRoot + ".recovery", generation, name);
      if (!fs.existsSync(mirror)) continue;
      if (!fs.lstatSync(mirror).isFile())
        throw new Error(
          "Unknown initialization recovery file is preserved: " + name,
        );
      const record = JSON.parse(fs.readFileSync(mirror));
      if (
        record.schema !== 1 ||
        record.repositoryID !== REPOSITORY_ID ||
        record.relative !== name ||
        record.sha256 !== expected ||
        sha(JSON.stringify(record.payload)) !== expected
      )
        throw new Error(
          "Initialization recovery differs from its known transaction: " + name,
        );
    }
  }
  for (const generation of ["current", "previous"]) {
    const recovery = path.join(stateRoot + ".recovery", generation);
    if (!fs.existsSync(recovery)) continue;
    for (const name of fs.readdirSync(recovery))
      if (!["identity.json", "item-outcomes.json"].includes(name))
        throw new Error("Unknown prior recovery state is preserved: " + name);
  }
}
function initializeState(
  stateRoot,
  reason,
  { initialOutcomes = { schema: 1, items: {} } } = {},
) {
  require("./maintenance-guard").assertWritesAllowed();
  if (!reason)
    throw new Error(
      "State initialization requires a concrete coordinator/fixture reason.",
    );
  let journal = readInitialization(stateRoot);
  if (
    fs.existsSync(path.join(stateRoot, "identity.json")) &&
    journal?.status !== "prepared"
  )
    return assertState(stateRoot);
  if (
    initialOutcomes.schema !== 1 ||
    !initialOutcomes.items ||
    typeof initialOutcomes.items !== "object" ||
    Array.isArray(initialOutcomes.items)
  )
    throw new Error("State initialization requires a valid outcome ledger.");
  const atomic = require("./editorial-pipeline").atomicJSON;
  const journalFile = path.join(stateRoot, "initialization.json");
  if (journal) {
    if (
      journal.status !== "prepared" ||
      journal.identity.reason !== reason ||
      journal.outcomeIntentSHA256 !== outcomeIntent(initialOutcomes)
    )
      throw new Error(
        "Initialization replay does not match its known intent; preserve the journal.",
      );
  } else {
    if (
      fs.existsSync(path.join(stateRoot, "batches")) ||
      fs.existsSync(path.join(stateRoot, "item-outcomes.json")) ||
      fs.existsSync(stateRoot + ".recovery")
    )
      throw new Error(
        "Partial prior publisher state is preserved. Restore/reconcile rather than initialize over it.",
      );
    if (fs.existsSync(stateRoot))
      for (const name of fs.readdirSync(stateRoot))
        if (!["builds", "publisher.lock"].includes(name))
          throw new Error(
            "Ambiguous prior publisher state is preserved: " + name,
          );
    const identity = {
      schema: 1,
      repositoryID: REPOSITORY_ID,
      initializedAt: new Date().toISOString(),
      reason,
      requiresOutcomes: true,
    };
    journal = {
      schema: 1,
      kind: "editorial-state-initialization",
      repositoryID: REPOSITORY_ID,
      stateRoot: path.resolve(stateRoot),
      transactionID: crypto.randomUUID(),
      status: "prepared",
      identity,
      outcomes: structuredClone(initialOutcomes),
      identitySHA256: sha(JSON.stringify(identity)),
      outcomesSHA256: sha(JSON.stringify(initialOutcomes)),
      outcomeIntentSHA256: outcomeIntent(initialOutcomes),
    };
    atomic(journalFile, journal);
  }
  assertInitializationFiles(stateRoot, journal);
  // The durable intent precedes the ledger. A crash at the original OPS9
  // boundary is now replayable only when that exact ledger matches it.
  atomic(path.join(stateRoot, "item-outcomes.json"), journal.outcomes);
  writeState(stateRoot, "identity.json", journal.identity);
  writeState(stateRoot, "item-outcomes.json", journal.outcomes);
  atomic(journalFile, {
    ...journal,
    status: "complete",
    completedAt: new Date().toISOString(),
  });
  return assertState(stateRoot);
}
function assertActiveAttempt(stateRoot, key) {
  assertState(stateRoot);
  const file = path.join(stateRoot, "active.json");
  if (!fs.existsSync(file)) return;
  const active = JSON.parse(fs.readFileSync(file));
  if (
    active.key !== key &&
    (!["deferred", "quarantined", "notification-recorded"].includes(
      active.state,
    ) ||
      (active.state === "quarantined" && active.commit))
  )
    throw new Error(
      "Another attempt has uncertain publication state. Reconcile the same active attempt first.",
    );
}
function restoreState(stateRoot) {
  require("./maintenance-guard").assertWritesAllowed();
  if (readInitialization(stateRoot)?.status === "prepared")
    throw new Error(
      "Initialization is prepared; preserve this directory and journal. Reconcile its publisher lock, then repeat reconcile-p0 with the same commit and Pages URL (or the original draft initialization). Do not restore-state while initialization is pending.",
    );
  if (fs.existsSync(path.join(stateRoot, "publisher.lock")))
    throw new Error(
      "Publisher lock exists; preserve and reconcile its owner before state restoration.",
    );
  const recovery = path.join(stateRoot + ".recovery", "current");
  if (!fs.existsSync(path.join(recovery, "identity.json")))
    throw new Error(
      "No known private state recovery copy. Preserve everything and reconcile explicitly with the coordinator.",
    );
  const records = [];
  function visit(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) visit(f);
      else {
        const r = JSON.parse(fs.readFileSync(f));
        if (
          r.repositoryID !== REPOSITORY_ID ||
          r.relative.includes("..") ||
          path.isAbsolute(r.relative) ||
          sha(JSON.stringify(r.payload)) !== r.sha256
        )
          throw new Error("Recovery record mismatch; preserve both copies.");
        records.push(r);
      }
    }
  }
  visit(recovery);
  const preserved = stateRoot + ".preserved-" + crypto.randomUUID();
  if (fs.existsSync(stateRoot)) fs.renameSync(stateRoot, preserved);
  for (const r of records) {
    require("./editorial-pipeline").atomicJSON(
      path.join(stateRoot, r.relative),
      r.payload,
    );
    if (r.relative.startsWith("snapshots/") && r.payload.manifestJSON) {
      const dir = path.join(stateRoot, "snapshots", r.payload.key);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "snapshot.json"), r.payload.manifestJSON);
    }
  }
  return {
    restored: records.length,
    preserved,
    next: "Reconcile the restored active attempt against actual Git/Pages before another publication. Immutable snapshot metadata is preserved; rebuild a missing archive from its exact commit if needed.",
  };
}
module.exports = {
  REPOSITORY_ID,
  assertState,
  writeState,
  initializeState,
  assertActiveAttempt,
  restoreState,
};
