#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const {
  assertNoMaintenance,
  assertWritesAllowed,
} = require("./maintenance-guard");
const {
  assertCommitClean,
  defaultStateRoot,
  publishedInventory,
  inventory,
} = require("./source-inventory");
const { sha, verifyReceipt } = require("./audit-swift-parser");
const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const PRIORITY = { repair: 0, riff: 1, review: 2, gap: 3 };
const STATES = [
  "draft",
  "validated",
  "review-pending",
  "review-approved",
  "commit-created",
  "push-confirmed",
  "deployment-confirmed",
  "notification-recorded",
  "quarantined",
];
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
function editorialDay(date = new Date()) {
  const fields = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${fields.year}-${fields.month}-${fields.day}`;
}
function requireISODay(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(value + "T00:00:00Z")) ||
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value
  )
    throw new Error("Use a real ISO calendar date for editorial replay.");
  return value;
}
function assertPublisher(root) {
  const file = path.join(root, "editorial/publisher.json");
  if (!fs.existsSync(file))
    throw new Error(
      "Publisher identity is not configured. Other hosts may author drafts.",
    );
  const publisher = read(file);
  if (publisher.host !== os.hostname() || publisher.status !== "active")
    throw new Error(
      "This host is not the single configured publisher. Preserve drafts and hand them to the publishing Mac.",
    );
}
function atomicJSON(file, value) {
  assertWritesAllowed();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  fs.renameSync(temp, file);
}
function withLock(stateRoot, operation) {
  assertWritesAllowed();
  fs.mkdirSync(stateRoot, { recursive: true });
  const directory = path.join(stateRoot, "publisher.lock");
  try {
    fs.mkdirSync(directory);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const owner = fs.existsSync(path.join(directory, "owner.json"))
      ? fs.readFileSync(path.join(directory, "owner.json"), "utf8")
      : "owner checkpoint is being written";
    throw new Error(
      `Editorial publisher is locked. Do not delete a stale lock without coordinator reconciliation. ${owner}`,
    );
  }
  const owner = {
    token: crypto.randomUUID(),
    host: os.hostname(),
    pid: process.pid,
    startedAt: new Date().toISOString(),
    state: "running",
  };
  fs.writeFileSync(path.join(directory, "owner.json"), JSON.stringify(owner));
  try {
    return operation(owner);
  } finally {
    const current = read(path.join(directory, "owner.json"));
    if (current.token === owner.token) {
      fs.unlinkSync(path.join(directory, "owner.json"));
      fs.rmdirSync(directory);
    }
  }
}
function riffHorizon(catalog, today, instrument = null) {
  const start = Date.parse(`${today}T00:00:00Z`);
  const family =
    typeof instrument === "object" ? instrument?.instrument : instrument;
  const context = typeof instrument === "object" ? instrument : null;
  const setupKey = (value) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(value || {}).sort(([a], [b]) =>
          a < b ? -1 : a > b ? 1 : 0,
        ),
      ),
    );
  const eligible = catalog.riffs.filter(
    (r) =>
      r.date &&
      (!r.instruments || !family || r.instruments.includes(family)) &&
      (!r.validUntil || r.validUntil >= today) &&
      (!context || !r.setup || setupKey(r.setup) === setupKey(context)),
  );
  const dates = new Set(eligible.map((r) => r.date));
  let days = 0;
  while (
    dates.has(new Date(start + days * 86400000).toISOString().slice(0, 10))
  )
    days++;
  return days;
}
function horizonForItem(catalog, today, item) {
  if (item.setup?.instrument && item.setup.instrument !== "adaptive")
    return riffHorizon(catalog, today, item.setup);
  if (item.instrument && item.instrument !== "adaptive")
    return riffHorizon(catalog, today, item.instrument);
  const families = item.instruments?.length
    ? item.instruments
    : ["guitar", "bass", "piano", "ukulele", "mandolin"];
  return Math.min(
    ...families.map((family) => riffHorizon(catalog, today, family)),
  );
}
function selectRiff(catalog, today, instrument, seed = 0) {
  const eligible = catalog.riffs.filter(
    (r) =>
      (!r.instruments || r.instruments.includes(instrument)) &&
      (!r.validUntil || r.validUntil >= today) &&
      r.date <= today,
  );
  const current = eligible.find((r) => r.date === today);
  if (current)
    return { riff: current, source: "dated", originalDate: current.date };
  const fallback = eligible
    .filter((r) => r.rotationApproved === true)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!fallback.length) return null;
  const day = Math.floor(Date.parse(today + "T00:00:00Z") / 86400000);
  const riff =
    fallback[
      (((day + seed) % fallback.length) + fallback.length) % fallback.length
    ];
  return { riff, source: "rotation", originalDate: riff.date };
}
function selectItems(
  queue,
  { today, horizon = 0, horizonFor = null, limit = 3 } = {},
) {
  if (!Number.isInteger(limit) || limit < 0 || limit > 3)
    throw new Error("Editorial runs handle at most three items.");
  return queue.items
    .filter(
      (item) =>
        (item.status === "open" ||
          (["blocked-human", "blocked-review"].includes(item.status) &&
            (item.contentSHA256 !== item.blockedContentSHA256 ||
              sha(JSON.stringify(item.reviewEvidence || {})) !==
                item.blockedEvidenceSHA256))) &&
        (!item.notBefore || item.notBefore <= today) &&
        require("./daily-content-policy").eligibleDailyItem(queue, item) &&
        (item.type !== "riff" ||
          (horizonFor ? horizonFor(item) : horizon) < 7) &&
        (item.type !== "gap" || item.blueprintApproved === true),
    )
    .sort(
      (a, b) =>
        (PRIORITY[a.type] ?? 99) - (PRIORITY[b.type] ?? 99) ||
        (a.createdAt || "").localeCompare(b.createdAt || "") ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
function batchKey(items) {
  return sha(
    JSON.stringify(
      items
        .map((i) => [i.id, i.blueprintVersion, i.revision, i.contentSHA256])
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ),
  );
}
function itemFingerprint(item) {
  return sha(
    JSON.stringify([
      item.id,
      item.blueprintVersion,
      item.revision,
      item.contentSHA256,
      item.source,
      item.riffID,
      item.target,
    ]),
  );
}
function outcomes(stateRoot) {
  const file = path.join(stateRoot, "item-outcomes.json");
  return fs.existsSync(file) ? read(file) : { schema: 1, items: {} };
}
function effectiveQueue(root, stateRoot) {
  const queue = read(path.join(root, "editorial/queue.json"));
  const ledger = outcomes(stateRoot);
  return {
    ...queue,
    items: queue.items.map((item) => {
      const outcome = ledger.items[item.id];
      if (!outcome) return item;
      if (outcome.fingerprint === itemFingerprint(item))
        return { ...item, ...outcome };
      return item;
    }),
  };
}
function saveBatch(stateRoot, batch) {
  require("./editorial-state").assertActiveAttempt(stateRoot, batch.key);
  require("./editorial-state").writeState(
    stateRoot,
    "batches/" + batch.key + ".json",
    batch,
  );
  require("./editorial-state").writeState(stateRoot, "active.json", batch);
  return batch;
}
function completeItems(stateRoot, batch, status = "done") {
  const ledger = outcomes(stateRoot);
  for (const item of batch.items)
    ledger.items[item.id] = {
      id: item.id,
      status,
      fingerprint: itemFingerprint(item),
      publishedCommit: batch.commit,
      verifiedSnapshot: batch.snapshotSHA256,
      verifiedSnapshotKind: "artifact-tree-with-manifest",
      completedAt: new Date().toISOString(),
      publicationAttempt: batch.key,
    };
  require("./editorial-state").writeState(
    stateRoot,
    "item-outcomes.json",
    ledger,
  );
}
function dailyItemIDs(stateRoot, day, { excludeKey = null } = {}) {
  const directory = path.join(stateRoot, "batches");
  const ids = new Set();
  if (!fs.existsSync(directory)) return ids;
  for (const file of fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".json"))) {
    const batch = read(path.join(directory, file));
    if (
      batch.key === excludeKey ||
      batch.kind === "coordinator-p0" ||
      batch.lane === "coordinator-intervention"
    )
      continue;
    const confirmedDay =
      batch.publicationDay ||
      (batch.deployment?.verifiedAt
        ? editorialDay(new Date(batch.deployment.verifiedAt))
        : null);
    const reservationDay = batch.reservationDay || batch.day;
    const reserved =
      !["deferred", "quarantined"].includes(batch.state) ||
      Boolean(batch.commit);
    if (confirmedDay === day || (reserved && reservationDay === day)) {
      for (const id of batch.itemIDs) ids.add(id);
    }
  }
  return ids;
}
function dailyUsed(stateRoot, day) {
  return dailyItemIDs(stateRoot, day).size;
}
function assertDailyPublicationBudget(stateRoot, batch, day = editorialDay()) {
  const ids = dailyItemIDs(stateRoot, day, { excludeKey: batch.key });
  for (const id of batch.itemIDs) ids.add(id);
  if (
    batch.kind !== "coordinator-p0" &&
    batch.lane !== "coordinator-intervention" &&
    ids.size > 3
  ) {
    throw new Error(
      "The actual local publication day already reserves/confirms three distinct editorial items. Preserve this attempt for reconciliation on a later day.",
    );
  }
  return day;
}
function beginBatch(root, stateRoot, today) {
  assertNoMaintenance();
  require("./editorial-state").assertState(stateRoot);
  const activeFile = path.join(stateRoot, "active.json");
  if (fs.existsSync(activeFile))
    require("./coordinated-publication").assertBatchCoordinator(
      root,
      read(activeFile),
      { uncertainOnly: true },
    );
  return withLock(stateRoot, (owner) => {
    const priorFile = path.join(stateRoot, "active.json");
    if (fs.existsSync(priorFile)) {
      const prior = read(priorFile);
      const uncertain =
        (prior.state === "quarantined" && prior.commit) ||
        !["notification-recorded", "quarantined", "deferred"].includes(
          prior.state,
        );
      if (uncertain) {
        require("./coordinated-publication").assertBatchCoordinator(
          root,
          prior,
        );
        return { ...prior, resumed: true };
      }
      if (prior.state === "notification-recorded")
        completeItems(stateRoot, prior);
      if (prior.state === "quarantined")
        completeItems(stateRoot, prior, "quarantined");
    }
    const queue = effectiveQueue(root, stateRoot);
    const riffs = read(path.join(root, "v2/daily/riffs.json"));
    const reservationDay = editorialDay();
    const limit = Math.max(0, 3 - dailyUsed(stateRoot, reservationDay));
    const items = selectItems(queue, {
      today,
      limit,
      horizonFor: (item) => horizonForItem(riffs, today, item),
    });
    const key = batchKey(items);
    const saved = path.join(stateRoot, "batches", key + ".json");
    const previous = fs.existsSync(saved) ? read(saved) : null;
    if (
      previous &&
      ["notification-recorded", "quarantined"].includes(previous.state)
    ) {
      completeItems(
        stateRoot,
        previous,
        previous.state === "quarantined" ? "quarantined" : "done",
      );
      return {
        state: "deferred",
        itemIDs: [],
        items: [],
        day: today,
        reason:
          "Terminal delivery reconciled; run selection again after reviewing its outcome.",
      };
    }
    let baseCommit = null;
    try {
      baseCommit = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim();
    } catch {}
    const batch = {
      schema: 2,
      key,
      attempt: (previous?.attempt || 0) + 1,
      day: today,
      kind: "scheduled-editorial",
      reservationDay,
      publisher: owner.host,
      selectedAt: new Date().toISOString(),
      baseCommit,
      itemIDs: items.map((i) => i.id),
      items,
      state: items.length ? "draft" : "deferred",
      history: [
        ...(previous?.history || []),
        {
          state: items.length ? "draft" : "deferred",
          at: new Date().toISOString(),
          reason: items.length
            ? null
            : "No eligible items or daily budget exhausted; zero publication.",
        },
      ],
    };
    return saveBatch(stateRoot, batch);
  });
}
function reselectBatch(root, stateRoot, key) {
  assertNoMaintenance();
  require("./coordinated-publication").assertBatchCoordinator(
    root,
    read(path.join(stateRoot, "batches", key + ".json")),
  );
  return withLock(stateRoot, () => {
    require("./editorial-state").assertActiveAttempt(stateRoot, key);
    const batch = read(path.join(stateRoot, "batches", key + ".json"));
    require("./coordinated-publication").assertBatchCoordinator(root, batch);
    if (
      ![
        "draft",
        "validated",
        "review-pending",
        "review-approved",
        "deferred",
      ].includes(batch.state)
    )
      throw new Error("Reconcile commit/push/deployment first.");
    const queue = effectiveQueue(root, stateRoot);
    const items = batch.itemIDs.map((id) =>
      queue.items.find((i) => i.id === id),
    );
    if (items.some((i) => !i))
      throw new Error("Selected identity disappeared.");
    for (const item of items)
      if (
        item.contentSHA256 &&
        require("./editorial-item").authoredDigest(root, item) !==
          item.contentSHA256
      )
        throw new Error(
          "Update the authored item's revision/digest before reselecting.",
        );
    batch.items = items;
    batch.state = "draft";
    delete batch.commit;
    delete batch.snapshotSHA256;
    delete batch.contentSnapshotSHA256;
    batch.publicationKey = batchKey(items);
    batch.history.push({
      state: "draft",
      at: new Date().toISOString(),
      reason:
        "Same selected identities rebound to their authored revisions/digests.",
    });
    return saveBatch(stateRoot, batch);
  });
}
function updateItem(root, stateRoot, id, record) {
  return withLock(stateRoot, () => {
    const queueFile = path.join(root, "editorial/queue.json");
    const queue = read(queueFile);
    const item = queue.items.find((i) => i.id === id);
    if (!item) throw new Error("Unknown editorial item.");
    const allowed = ["source", "revision", "riffID", "setup", "objective"];
    if (Object.keys(record).some((key) => !allowed.includes(key)))
      throw new Error("Unsupported authored-item update field.");
    const source = path.resolve(root, record.source || item.source);
    if (!source.startsWith(path.resolve(root) + path.sep))
      throw new Error("Authored source escapes repository.");
    const next = { ...item, ...record };
    next.contentSHA256 = require("./editorial-item").authoredDigest(root, next);
    next.status = "open";
    next.reviewEvidence = {};
    Object.assign(item, next);
    if (item.status === "review-pending" && record.status === "approved")
      item.status = "open";
    queue.revision += 1;
    atomicJSON(queueFile, queue);
    return item;
  });
}
function gateItem(item, { root, receipt }) {
  if (
    !item.id ||
    !Object.hasOwn(PRIORITY, item.type) ||
    !item.objective ||
    !item.setup ||
    !item.source ||
    !item.blueprintVersion ||
    !item.owner
  )
    throw new Error("Editorial item is incomplete.");
  if (LOCALES.some((locale) => !item.locales?.includes(locale)))
    throw new Error("All six locales are required.");
  if (!item.contentSHA256)
    throw new Error("Item needs a content digest before review.");
  const source = path.resolve(root, item.source);
  if (
    !source.startsWith(path.resolve(root) + path.sep) ||
    !fs.existsSync(source) ||
    require("./editorial-item").authoredDigest(root, item) !==
      item.contentSHA256
  )
    throw new Error(
      "Item review digest does not match its current content bytes.",
    );
  const evidence = item.reviewEvidence || {};
  let equivalent = false;
  if (["syntactic", "editorial-equivalent"].includes(item.classification)) {
    require("./equivalent-repair").assertEquivalentRepair(root, item);
    equivalent = true;
  }
  if (
    evidence.parser?.status !== "approved" ||
    !evidence.parser?.reviewer ||
    !evidence.parser?.reviewedAt ||
    evidence.parser?.contentSHA256 !== item.contentSHA256
  )
    throw new Error("Real parser approval must match this item revision.");
  if (
    evidence.languages?.status !== "approved" ||
    !evidence.languages?.reviewer ||
    !evidence.languages?.reviewedAt ||
    evidence.languages?.contentSHA256 !== item.contentSHA256
  )
    throw new Error("Language review must match the authored content.");
  if (
    evidence.independent?.status !== "approved" ||
    !evidence.independent?.reviewer ||
    !evidence.independent?.reviewedAt ||
    evidence.independent?.reviewer === item.owner ||
    evidence.independent?.contentSHA256 !== item.contentSHA256
  )
    throw new Error("Independent content review is required.");
  const approvedPattern = item.approvedPattern
    ? require("./guided-variation").assertApprovedGuidedVariation(root, item)
    : false;
  const integral =
    !equivalent && !approvedPattern &&
    (item.role === "core" ||
      item.role === "transfer" ||
      item.classification === "musical" ||
      !item.approvedRecipe);
  if (
    integral &&
    !require("./coordinated-publication").registeredPathOwnerRelease(root, item) &&
    (evidence.playthrough?.status !== "approved" ||
      evidence.playthrough?.kind !== "human" ||
      !evidence.playthrough?.reviewer ||
      !evidence.playthrough?.reviewedAt ||
      evidence.playthrough?.contentSHA256 !== item.contentSHA256)
  )
    throw new Error(
      "Core and new physical patterns require a completed human playthrough or the exact registered owner-approved guided release.",
    );
  if (!integral && !equivalent && !approvedPattern) {
    const recipes = read(path.join(root, "editorial/recipes.json")).recipes;
    const recipe = recipes.find((r) => r.id === item.approvedRecipe);
    const digest = recipe ? sha(JSON.stringify(recipe.definition)) : null;
    if (
      !recipe ||
      recipe.status !== "approved" ||
      recipe.approval?.recipeSHA256 !== digest ||
      !recipe.approval?.reviewedBy ||
      !recipe.approval?.reviewedAt ||
      recipe.approval?.playthrough?.kind !== "human" ||
      recipe.approval?.playthrough?.status !== "approved" ||
      recipe.approval?.playthrough?.recipeSHA256 !== digest ||
      !recipe.approval?.playthrough?.reviewedBy ||
      !recipe.approval?.playthrough?.reviewedAt ||
      evidence.approvedRecipeDigest !== digest ||
      !evidence.samplingPlan ||
      evidence.recipeSampling?.kind !== "human" ||
      evidence.recipeSampling?.status !== "approved" ||
      evidence.recipeSampling?.contentSHA256 !== item.contentSHA256 ||
      !evidence.recipeSampling?.reviewer ||
      !evidence.recipeSampling?.reviewedAt
    )
      throw new Error(
        "Variation needs a real approved recipe, matching recipe digest and human sampling plan.",
      );
  }
  verifyReceipt(root, receipt);
  return true;
}
function transition(batch, next, evidence = {}) {
  const index = STATES.indexOf(batch.state),
    destination = STATES.indexOf(next);
  if (destination < 0 || (next !== "quarantined" && destination !== index + 1))
    throw new Error(`Invalid editorial transition ${batch.state} -> ${next}`);
  if (
    next === "commit-created" &&
    !/^[0-9a-f]{40}$/.test(evidence.commit || "")
  )
    throw new Error("A concrete commit is required.");
  if (next === "push-confirmed" && evidence.remoteCommit !== batch.commit)
    throw new Error("Published remote commit must match the prepared commit.");
  if (
    next === "deployment-confirmed" &&
    (!evidence.snapshotSHA256 ||
      evidence.snapshotSHA256 !== batch.snapshotSHA256 ||
      evidence.contentVerified !== true)
  )
    throw new Error(
      "Deployment status and served bytes must match the snapshot.",
    );
  if (
    next === "notification-recorded" &&
    !evidence.notificationID &&
    !evidence.notificationSkipped
  )
    throw new Error("Notification reconciliation is required.");
  return {
    ...batch,
    ...evidence,
    state: next,
    history: [
      ...batch.history,
      { state: next, at: new Date().toISOString(), evidence },
    ],
  };
}
function deferBatch(root, stateRoot, key, reason, explicitIDs = null) {
  assertNoMaintenance();
  require("./coordinated-publication").assertBatchCoordinator(
    root,
    read(path.join(stateRoot, "batches", key + ".json")),
  );
  if (!reason?.trim())
    throw new Error("A concrete deferral reason is required.");
  return withLock(stateRoot, () => {
    require("./editorial-state").assertActiveAttempt(stateRoot, key);
    const batch = read(path.join(stateRoot, "batches", key + ".json"));
    require("./coordinated-publication").assertBatchCoordinator(root, batch);
    if (
      !["draft", "validated", "review-pending", "review-approved"].includes(
        batch.state,
      )
    )
      throw new Error(
        "Commit/push/deploy/notification uncertainty must be reconciled in the same batch.",
      );
    const queue = effectiveQueue(root, stateRoot);
    const ledger = outcomes(stateRoot);
    const blocked = [];
    const ready = [];
    const receipt = explicitIDs
      ? null
      : read(path.join(root, "editorial/evidence/swift-parser.json"));
    if (!explicitIDs) verifyReceipt(root, receipt);
    if (explicitIDs?.some((id) => !batch.itemIDs.includes(id)))
      throw new Error("Deferral ID was not selected in this batch.");
    for (const selected of batch.items) {
      const item = queue.items.find((i) => i.id === selected.id) || selected;
      let fail = false;
      if (explicitIDs) fail = explicitIDs.includes(item.id);
      else
        try {
          gateItem(item, {
            root,
            receipt: read(
              path.join(root, "editorial/evidence/swift-parser.json"),
            ),
          });
        } catch {
          fail = true;
        }
      if (!fail) {
        ready.push(item.id);
        continue;
      }
      blocked.push(item.id);
      ledger.items[item.id] = {
        id: item.id,
        status:
          item.classification === "syntactic"
            ? "blocked-review"
            : "blocked-human",
        fingerprint: itemFingerprint(item),
        blockedReason: reason,
        blockedContentSHA256: selected.contentSHA256,
        blockedEvidenceSHA256: sha(
          JSON.stringify(selected.reviewEvidence || {}),
        ),
      };
    }
    require("./editorial-state").writeState(
      stateRoot,
      "item-outcomes.json",
      ledger,
    );
    batch.state = "deferred";
    batch.blockedIDs = blocked;
    batch.readyIDs = ready;
    batch.history.push({
      state: "deferred",
      at: new Date().toISOString(),
      reason,
      blockedIDs: blocked,
      readyIDs: ready,
    });
    return saveBatch(stateRoot, batch);
  });
}
function recordReview(root, stateRoot, id, record) {
  return withLock(stateRoot, () => {
    const queueFile = path.join(root, "editorial/queue.json");
    const queue = read(queueFile);
    const item = queue.items.find((i) => i.id === id);
    if (
      !item ||
      ![
        "parser",
        "languages",
        "independent",
        "playthrough",
        "recipe-sampling",
      ].includes(record.gate)
    )
      throw new Error("Unknown item or review gate.");
    const source = fs.readFileSync(path.join(root, item.source));
    if (
      record.contentSHA256 !==
        require("./editorial-item").itemContentDigest(item, source) ||
      record.contentSHA256 !== item.contentSHA256
    )
      throw new Error("Review is for different content bytes.");
    if (record.gate === "independent" && record.reviewer === item.owner)
      throw new Error("Author cannot supply their independent review.");
    if (record.gate === "playthrough" && record.kind !== "human")
      throw new Error("Physical playthrough cannot be supplied by a model.");
    if (!record.reviewer || !record.reviewedAt)
      throw new Error("Review records require reviewer and reviewedAt.");
    if (record.gate === "recipe-sampling" && record.kind !== "human")
      throw new Error(
        "Recipe sampling must record the identified human sampler.",
      );
    if (record.gate === "recipe-sampling") {
      item.reviewEvidence.approvedRecipeDigest = record.recipeSHA256;
      item.reviewEvidence.samplingPlan = record.plan;
      item.reviewEvidence.recipeSampling = record;
    } else item.reviewEvidence[record.gate] = record;
    if (item.status === "review-pending" && record.status === "approved")
      item.status = "open";
    queue.revision += 1;
    atomicJSON(queueFile, queue);
    return item;
  });
}
function checkpoint(...args) {
  return require("./publishing-state").checkpoint(...args);
}
function rebindCommit(...args) {
  return require("./publishing-state").rebindCommit(...args);
}
function confirmDeployment(...args) {
  return require("./publishing-state").confirmDeployment(...args);
}
function reconcileP0(...args) {
  return require("./publishing-state").reconcileP0(...args);
}
function finalizeSnapshot(
  root,
  stateRoot,
  key,
  dist = path.join(root, "dist"),
) {
  return withLock(stateRoot, () => {
    const file = path.join(stateRoot, "batches", key + ".json");
    const batch = read(file);
    if (batch.lane === "coordinator-intervention")
      require("./coordinated-publication").assertCoordinator(root);
    if (batch.state !== "commit-created")
      throw new Error(
        "The actual commit must exist before finalizing the publishing snapshot.",
      );
    batch.reservationDay = assertDailyPublicationBudget(stateRoot, batch);
    const manifest = read(path.join(dist, "snapshot.json"));
    if (
      manifest.commit !== batch.commit ||
      manifest.publicationStatus !== "approved" ||
      manifest.snapshotSHA256 !== batch.contentSnapshotSHA256
    )
      throw new Error(
        "Final snapshot commit/content does not match the reviewed batch.",
      );
    const actual = treeManifest(dist);
    delete actual["snapshot.json"];
    if (
      JSON.stringify(actual) !== JSON.stringify(manifest.files) ||
      sha(JSON.stringify(actual)) !== manifest.snapshotSHA256
    )
      throw new Error("Final snapshot files changed after the build.");
    for (const [file, digest] of Object.entries(manifest.files))
      if (
        file !== ".nojekyll" &&
        sha(
          execFileSync(
            "git",
            [
              "show",
              `${batch.commit}:${file.startsWith("instrument-scales/") ? "site/" + file : file}`,
            ],
            { cwd: root, maxBuffer: 16 * 1024 * 1024 },
          ),
        ) !== digest
      )
        throw new Error(
          "Final snapshot includes uncommitted or different bytes: " + file,
        );
    const snapshot = saveSnapshot(dist, stateRoot);
    batch.snapshotSHA256 = snapshot.key;
    batch.history.push({
      state: "snapshot-finalized",
      at: new Date().toISOString(),
      snapshotSHA256: snapshot.key,
      commit: batch.commit,
    });
    return saveBatch(stateRoot, batch);
  });
}
function treeManifest(directory) {
  const files = {};
  function walk(dir) {
    for (const entry of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files[path.relative(directory, full)] = sha(fs.readFileSync(full));
    }
  }
  walk(directory);
  return Object.fromEntries(
    Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}
function saveSnapshot(dist, stateRoot) {
  const files = treeManifest(dist),
    key = sha(JSON.stringify(files)),
    dir = path.join(stateRoot, "snapshots", key),
    marker = dir + ".json";
  assertWritesAllowed();
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  if (fs.existsSync(dir) && fs.existsSync(marker)) {
    if (
      JSON.stringify(treeManifest(dir)) !== JSON.stringify(files) ||
      read(marker).key !== key
    )
      throw new Error("Immutable snapshot drift; preserve it.");
    return { key, files, directory: dir };
  }
  if (fs.existsSync(dir)) {
    if (JSON.stringify(treeManifest(dir)) !== JSON.stringify(files))
      throw new Error("Partial snapshot differs; preserve and reconcile it.");
    const manifestFile = path.join(dir, "snapshot.json");
    require("./editorial-state").writeState(
      stateRoot,
      "snapshots/" + key + ".json",
      {
        schema: 1,
        key,
        files,
        manifestJSON: fs.existsSync(manifestFile)
          ? fs.readFileSync(manifestFile, "utf8")
          : null,
      },
    );
    return { key, files, directory: dir, resumed: true };
  }
  const temp = dir + ".partial-" + crypto.randomUUID();
  fs.cpSync(dist, temp, { recursive: true });
  if (JSON.stringify(treeManifest(temp)) !== JSON.stringify(files))
    throw new Error("Snapshot copy incomplete; checkpoint preserved.");
  fs.renameSync(temp, dir);
  const manifestFile = path.join(dist, "snapshot.json");
  require("./editorial-state").writeState(
    stateRoot,
    "snapshots/" + key + ".json",
    {
      schema: 1,
      key,
      files,
      manifestJSON: fs.existsSync(manifestFile)
        ? fs.readFileSync(manifestFile, "utf8")
        : null,
    },
  );
  return { key, files, directory: dir };
}
function quarantineSnapshot(stateRoot, key, reason) {
  if (!reason?.trim()) throw new Error("A quarantine reason is required.");
  const snapshot = read(path.join(stateRoot, "snapshots", key + ".json"));
  atomicJSON(path.join(stateRoot, "quarantine", key + ".json"), {
    snapshot,
    reason,
    at: new Date().toISOString(),
    recovery:
      "Publish a new corrective commit using a previously validated snapshot. Preserve Git history, all identities and learner records.",
  });
}
async function verifyDeployment(
  baseURL,
  snapshot,
  fetcher = fetch,
  onProgress = () => {},
  {
    expectedBaseURL = "https://thiagoam.github.io/InstrumentScalesOnlineData",
    allowLocalFixture = false,
    concurrency = 8,
    retries = 3,
  } = {},
) {
  const actual = new URL(baseURL),
    expected = new URL(expectedBaseURL);
  const local =
    allowLocalFixture &&
    actual.protocol === "http:" &&
    ["127.0.0.1", "localhost"].includes(actual.hostname);
  if (
    !local &&
    (actual.origin !== expected.origin ||
      actual.pathname.replace(/\/$/, "") !==
        expected.pathname.replace(/\/$/, ""))
  )
    throw new Error(
      "Deployment URL differs from the configured production Pages URL.",
    );
  if (actual.search || actual.hash)
    throw new Error(
      "Use the canonical deployment base URL without query or fragment.",
    );
  const entries = Object.entries(snapshot.files);
  let next = 0,
    verified = 0,
    failed = false;
  const results = await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, entries.length) }, async () => {
      while (!failed && next < entries.length) {
        const [file, digest] = entries[next++];
        let failure;
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            const response = await fetcher(
              `${baseURL.replace(/\/$/, "")}/${file}?snapshot=${snapshot.key}`,
              {
                headers: { "Cache-Control": "no-cache" },
                signal: AbortSignal.timeout(15000),
              },
            );
            if (
              !response.ok ||
              sha(Buffer.from(await response.arrayBuffer())) !== digest
            )
              throw new Error(`Deployment mismatch: ${file}`);
            failure = null;
            break;
          } catch (error) {
            failure = error;
            if (attempt + 1 < retries)
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * (attempt + 1)),
              );
          }
        }
        if (failure) {
          failed = true;
          throw failure;
        }
        verified++;
        if (verified % 100 === 0)
          onProgress({ verified, total: entries.length });
      }
    }),
  );
  const failure = results.find((result) => result.status === "rejected");
  if (failure) throw failure.reason;
  return {
    snapshotSHA256: snapshot.key,
    contentVerified: true,
    verifiedFiles: verified,
  };
}
module.exports = {
  atomicJSON,
  saveBatch,
  withLock,
  assertPublisher,
  editorialDay,
  requireISODay,
  selectItems,
  batchKey,
  itemFingerprint,
  beginBatch,
  effectiveQueue,
  reselectBatch,
  updateItem,
  rebindCommit,
  dailyUsed,
  dailyItemIDs,
  assertDailyPublicationBudget,
  gateItem,
  transition,
  checkpoint,
  deferBatch,
  recordReview,
  finalizeSnapshot,
  confirmDeployment,
  reconcileP0,
  riffHorizon,
  horizonForItem,
  selectRiff,
  saveSnapshot,
  quarantineSnapshot,
  verifyDeployment,
  treeManifest,
};

if (require.main === module) {
  const root =
      process.env.EDITORIAL_REPOSITORY_ROOT || path.join(__dirname, ".."),
    stateRoot = defaultStateRoot(root);
  try {
    assertWritesAllowed();
    const [command, arg] = process.argv.slice(2);
    if (command !== "dry-run") assertPublisher(root);
    if (command === "prune-outputs")
      console.log(
        JSON.stringify(
          require("./owned-output-retention").pruneOwnedOutputs(
            root,
            stateRoot,
            {
              keep: process.argv.includes("--keep")
                ? Number(process.argv[process.argv.indexOf("--keep") + 1])
                : 2,
              reason: process.argv.includes("--reason")
                ? process.argv[process.argv.indexOf("--reason") + 1]
                : undefined,
              execute: process.argv.includes("--execute"),
            },
          ),
          null,
          2,
        ),
      );
    else if (command === "reconcile-active")
      console.log(
        JSON.stringify(
          require("./reconcile-active").reconcileActive(
            root,
            stateRoot,
            arg,
            process.argv[4],
          ),
          null,
          2,
        ),
      );
    else if (command === "start-coordinated-promotion")
      console.log(
        JSON.stringify(
          require("./coordinated-publication").startCoordinatedPromotion(
            root,
            stateRoot,
            path.resolve(arg),
          ),
          null,
          2,
        ),
      );
    else if (command === "state-init") {
      require("./coordinated-publication").assertCoordinator(root);
      if (
        read(path.join(root, "editorial/evidence/independent-review.json"))
          .status === "approved"
      )
        throw new Error(
          "An approved repository requires restore-state or actual coordinator deployment reconciliation, never an empty state reset.",
        );
      console.log(
        JSON.stringify(
          withLock(stateRoot, () =>
            require("./editorial-state").initializeState(stateRoot, arg),
          ),
          null,
          2,
        ),
      );
    } else if (command === "restore-state") {
      require("./coordinated-publication").assertCoordinator(root);
      console.log(
        JSON.stringify(
          require("./editorial-state").restoreState(stateRoot),
          null,
          2,
        ),
      );
    } else if (command === "select")
      console.log(
        JSON.stringify(
          beginBatch(root, stateRoot, requireISODay(arg || editorialDay())),
          null,
          2,
        ),
      );
    else if (command === "dry-run") {
      assertNoMaintenance();
      require("./editorial-state").assertState(stateRoot);
      const today = requireISODay(arg || editorialDay());
      const queue = effectiveQueue(root, stateRoot);
      const riffs = read(path.join(root, "v2/daily/riffs.json"));
      const horizons = Object.fromEntries(
        ["guitar", "bass", "piano", "ukulele", "mandolin"].map((i) => [
          i,
          riffHorizon(riffs, today, i),
        ]),
      );
      console.log(
        JSON.stringify(
          {
            today,
            horizons,
            selected: selectItems(queue, {
              today,
              limit: Math.max(0, 3 - dailyUsed(stateRoot, editorialDay())),
              horizonFor: (item) => horizonForItem(riffs, today, item),
            }),
            readOnly: true,
          },
          null,
          2,
        ),
      );
    } else if (command === "reselect")
      console.log(JSON.stringify(reselectBatch(root, stateRoot, arg), null, 2));
    else if (command === "update-item")
      console.log(
        JSON.stringify(
          updateItem(root, stateRoot, arg, read(process.argv[4])),
          null,
          2,
        ),
      );
    else if (command === "rebind")
      console.log(
        JSON.stringify(
          rebindCommit(
            root,
            stateRoot,
            arg,
            process.argv[4],
            process.argv.includes("--content-changed"),
          ),
          null,
          2,
        ),
      );
    else if (command === "resume") {
      assertNoMaintenance();
      const file = arg
        ? path.join(stateRoot, "batches", arg + ".json")
        : path.join(stateRoot, "active.json");
      console.log(JSON.stringify(read(file), null, 2));
    } else if (command === "snapshot")
      console.log(
        JSON.stringify(
          saveSnapshot(path.join(root, "dist"), stateRoot),
          null,
          2,
        ),
      );
    else if (command === "finalize-snapshot")
      console.log(
        JSON.stringify(finalizeSnapshot(root, stateRoot, arg), null, 2),
      );
    else if (command === "quarantine")
      quarantineSnapshot(stateRoot, arg, process.argv[4]);
    else if (command === "checkpoint")
      console.log(
        JSON.stringify(
          checkpoint(
            root,
            stateRoot,
            arg,
            process.argv[4],
            read(process.argv[5]),
          ),
          null,
          2,
        ),
      );
    else if (command === "defer")
      console.log(
        JSON.stringify(
          deferBatch(
            root,
            stateRoot,
            arg,
            process.argv[4],
            process.argv.includes("--ids")
              ? process.argv[process.argv.indexOf("--ids") + 1].split(",")
              : null,
          ),
          null,
          2,
        ),
      );
    else if (command === "record-publication-review")
      console.log(
        JSON.stringify(
          require("./publication-review").recordPublicationReview(
            root,
            stateRoot,
            read(arg),
          ),
          null,
          2,
        ),
      );
    else if (command === "record-review")
      console.log(
        JSON.stringify(
          recordReview(root, stateRoot, arg, read(process.argv[4])),
          null,
          2,
        ),
      );
    else if (command === "gate") {
      const queue = read(path.join(root, "editorial/queue.json"));
      const item = queue.items.find((i) => i.id === arg);
      if (!item) throw new Error("Unknown editorial item.");
      gateItem(item, {
        root,
        receipt: read(path.join(root, "editorial/evidence/swift-parser.json")),
      });
      console.log("All hash-bound item gates passed.");
    } else if (command === "verify-deployment")
      confirmDeployment(root, stateRoot, arg, process.argv[4], fetch, {
        allowLocalFixture: process.argv.includes("--allow-local-fixture"),
      })
        .then((result) => console.log(JSON.stringify(result, null, 2)))
        .catch((error) => {
          console.error(error.message);
          process.exitCode = 1;
        });
    else if (command === "reconcile-p0")
      reconcileP0(root, stateRoot, arg, process.argv[4], {
        allowLocalFixture: process.argv.includes("--allow-local-fixture"),
      })
        .then((result) => console.log(JSON.stringify(result, null, 2)))
        .catch((error) => {
          console.error(error.message);
          process.exitCode = 1;
        });
    else
      throw new Error(
        [
          "Commands:",
          "dry-run [date]; select [date]; resume [batch]; reselect <batch>;",
          "update-item <item> <record.json>; gate <item>; record-review <item> <record.json>;",
          "defer <batch> <reason> [--ids id,id]; record-publication-review <record.json>;",
          "snapshot; finalize-snapshot <batch>; checkpoint <batch> <next-state> <evidence.json>;",
          "rebind <batch> <commit> [--content-changed]; verify-deployment <batch> <baseURL>;",
          "start-coordinated-promotion <record.json>; reconcile-p0 <commit> <baseURL>;",
          "reconcile-active <batch> <reason>; quarantine <snapshot> <reason>;",
          "state-init <reason>; restore-state; prune-outputs --keep 2 --reason <reason> [--execute].",
          "Commit, push, deployment and notification are separate reconciled transitions.",
        ].join("\n"),
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
