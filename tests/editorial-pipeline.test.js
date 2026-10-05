const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { approvalFor } = require("../scripts/promote-approved");
const {
  selectItems,
  batchKey,
  withLock,
  transition,
  riffHorizon,
  horizonForItem,
  selectRiff,
  saveSnapshot,
  quarantineSnapshot,
  beginBatch,
  deferBatch,
  editorialDay,
  requireISODay,
  finalizeSnapshot,
  treeManifest,
} = require("../scripts/editorial-pipeline");
const {
  approvedAssets,
  copyApprovedAssets,
} = require("../scripts/approved-assets");
const {
  verifyReceipt,
  digestFiles,
  candidateDigests,
  sha,
} = require("../scripts/audit-swift-parser");
const { smokePages } = require("../scripts/smoke-pages");
const { validateEditorial } = require("../scripts/validate-editorial");
const root = path.join(__dirname, "..");
const ownedTestDirectories = new Set();
const originalMkdtemp = fs.mkdtempSync;
fs.mkdtempSync = (...args) => {
  const directory = originalMkdtemp(...args);
  ownedTestDirectories.add(directory);
  return directory;
};
test.after(() => {
  for (const directory of ownedTestDirectories) {
    if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true });
    const recovery = directory + ".recovery";
    if (fs.existsSync(recovery)) fs.rmSync(recovery, { recursive: true });
  }
});

test("editorial selection is deterministic, repair-first and never a three-item quota", () => {
  const items = [
    { id: "gap", type: "gap", status: "open", blueprintApproved: false },
    { id: "review", type: "review", status: "open" },
    { id: "riff", type: "riff", status: "open" },
    { id: "repair-b", type: "repair", status: "open" },
    { id: "repair-a", type: "repair", status: "open" },
  ];
  assert.deepEqual(
    selectItems({ items }, { today: "2026-10-03", horizon: 0 }).map(
      (i) => i.id,
    ),
    ["repair-a", "repair-b", "riff"],
  );
  assert.deepEqual(
    selectItems({ items }, { today: "2026-10-03", horizon: 7 }).map(
      (i) => i.id,
    ),
    ["repair-a", "repair-b", "review"],
  );
  assert.equal(selectItems({ items: [] }, { today: "2026-10-03" }).length, 0);
  assert.throws(() => selectItems({ items }, { limit: 4 }), /at most three/);
  assert.equal(batchKey(items), batchKey(items.toReversed()));
  const changed = structuredClone(items);
  changed[0].revision = 2;
  assert.notEqual(batchKey(items), batchKey(changed));
});
test("locks refuse concurrent and stale owners without deleting their checkpoint", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-lock-"));
  withLock(directory, () =>
    assert.throws(() => withLock(directory, () => {}), /locked/),
  );
  const lock = path.join(directory, "publisher.lock");
  fs.mkdirSync(lock);
  fs.writeFileSync(
    path.join(lock, "owner.json"),
    JSON.stringify({ host: "other-host", pid: 1, startedAt: "2000-01-01" }),
  );
  assert.throws(() => withLock(directory, () => {}), /Do not delete/);
  assert.ok(fs.existsSync(lock));
});
test("three items awaiting humans do not block a later riff; uncertain pushes resume the same batch", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-defer-"));
  fs.mkdirSync(path.join(directory, "editorial"));
  fs.mkdirSync(path.join(directory, "v2/daily"), { recursive: true });
  const items = [1, 2, 3].map((i) => ({
    id: "repair-" + i,
    type: "repair",
    status: "open",
    contentSHA256: "same",
    revision: 1,
    blueprintVersion: 1,
    reviewEvidence: { playthrough: { status: "pending" } },
  }));
  items.push({
    id: "riff",
    type: "riff",
    status: "open",
    contentSHA256: "riff",
    revision: 1,
    blueprintVersion: 1,
  });
  const queueFile = path.join(directory, "editorial/queue.json");
  fs.writeFileSync(queueFile, JSON.stringify({ revision: 1, items }));
  fs.writeFileSync(
    path.join(directory, "v2/daily/riffs.json"),
    JSON.stringify({ riffs: [] }),
  );
  const state = path.join(directory, "state");
  require("../scripts/editorial-state").initializeState(
    state,
    "Synthetic editorial unit fixture",
  );
  const first = beginBatch(directory, state, "2026-10-03");
  assert.equal(first.itemIDs.length, 3);
  deferBatch(directory, state, first.key, "Awaiting physical playthrough", [
    "repair-1",
    "repair-2",
    "repair-3",
  ]);
  const second = beginBatch(directory, state, "2026-10-04");
  assert.deepEqual(second.itemIDs, ["riff"]);
  const uncertain = {
    ...second,
    state: "push-confirmed",
    commit: "a".repeat(40),
  };
  fs.writeFileSync(path.join(state, "active.json"), JSON.stringify(uncertain));
  fs.writeFileSync(
    path.join(state, "batches", second.key + ".json"),
    JSON.stringify(uncertain),
  );
  assert.deepEqual(beginBatch(directory, state, "2026-10-05").itemIDs, [
    "riff",
  ]);
  assert.throws(
    () => deferBatch(directory, state, second.key, "Wait"),
    /uncertainty/,
  );
  const queue = require("../scripts/editorial-pipeline").effectiveQueue(
    directory,
    state,
  );
  assert.equal(
    selectItems(queue, { today: "2026-10-04" }).filter(
      (i) => i.type === "repair",
    ).length,
    0,
  );
  queue.items[0].reviewEvidence.playthrough.status = "approved";
  assert.equal(selectItems(queue, { today: "2026-10-04" })[0].id, "repair-1");
});
test("dry-run CLI preserves initialized editorial state and promotion refuses unsigned/stale approval", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "editorial-read-only-"),
  );
  const state = path.join(directory, "state");
  require("../scripts/editorial-state").initializeState(
    state,
    "Synthetic read-only initialized fixture",
  );
  const before = treeManifest(state);
  const recoveryBefore = treeManifest(state + ".recovery");
  const output = execFileSync(
    process.execPath,
    [path.join(root, "scripts/editorial-pipeline.js"), "dry-run", "2026-10-03"],
    { env: { ...process.env, EDITORIAL_STATE_ROOT: state }, encoding: "utf8" },
  );
  assert.equal(JSON.parse(output).readOnly, true);
  assert.deepEqual(treeManifest(state), before);
  assert.deepEqual(treeManifest(state + ".recovery"), recoveryBefore);
  const bytes = Buffer.from("fixture-only document");
  assert.throws(() => approvalFor({}, "fixture", bytes), /explicit human/);
  const record = {
    kind: "human",
    approvedBy: "synthetic-fixture-owner",
    approvedAt: "2026-10-03",
    playthrough: "completed",
    documentSHA256: { fixture: sha(bytes) },
    independentReview: {
      status: "approved",
      reviewer: "synthetic-fixture-reviewer",
      reviewedAt: "2026-10-03T00:00:00Z",
    },
    languages: {
      status: "approved",
      reviewer: "synthetic-fixture-reviewer",
      reviewedAt: "2026-10-03T00:00:00Z",
    },
  };
  assert.doesNotThrow(() => approvalFor(record, "fixture", bytes));
  assert.throws(
    () => approvalFor(record, "fixture", Buffer.from("changed fixture")),
    /exact reviewed bytes/,
  );
});
test("editorial day follows Sao Paulo at 21h and at local midnight; replay remains explicit", () => {
  assert.equal(editorialDay(new Date("2026-10-04T00:00:00Z")), "2026-10-03");
  assert.equal(editorialDay(new Date("2026-10-04T02:59:59Z")), "2026-10-03");
  assert.equal(editorialDay(new Date("2026-10-04T03:00:00Z")), "2026-10-04");
  assert.equal(requireISODay("2026-10-02"), "2026-10-02");
  assert.throws(() => requireISODay("2026-02-30"), /real ISO/);
});
test("seven guitar dates do not hide missing bass stock or a different setup", () => {
  const guitar = {
    instrument: "guitar",
    tuningMIDINotes: [40, 45, 50, 55, 59, 64],
  };
  const riffs = Array.from({ length: 7 }, (_, index) => ({
    id: "g-" + index,
    date: `2026-10-${String(index + 3).padStart(2, "0")}`,
    validUntil: "2026-11-02",
    instruments: ["guitar"],
    setup: guitar,
  }));
  const catalog = { riffs };
  const items = [
    {
      id: "g",
      type: "riff",
      status: "open",
      instrument: "guitar",
      setup: guitar,
    },
    {
      id: "b",
      type: "riff",
      status: "open",
      instrument: "bass",
      setup: { instrument: "bass" },
    },
    {
      id: "adaptive",
      type: "riff",
      status: "open",
      instruments: ["guitar", "bass"],
    },
  ];
  assert.equal(horizonForItem(catalog, "2026-10-03", items[0]), 7);
  assert.equal(horizonForItem(catalog, "2026-10-03", items[1]), 0);
  assert.deepEqual(
    selectItems(
      { items },
      {
        today: "2026-10-03",
        horizonFor: (item) => horizonForItem(catalog, "2026-10-03", item),
      },
    ).map((i) => i.id),
    ["adaptive", "b"],
  );
  assert.equal(
    horizonForItem(catalog, "2026-10-03", {
      setup: {
        instrument: "guitar",
        tuningMIDINotes: [38, 45, 50, 55, 59, 64],
      },
    }),
    0,
  );
});
test("CLI selection reloads fresh review evidence for the same selected bytes", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "editorial-review-cli-"),
  );
  const state = path.join(directory, "state");
  require("../scripts/editorial-state").initializeState(
    state,
    "Synthetic review CLI fixture",
  );
  fs.mkdirSync(path.join(directory, "editorial/evidence"), { recursive: true });
  fs.mkdirSync(path.join(directory, "v2/daily"), { recursive: true });
  const source = "v2/reference.md";
  const bytes = "Fixture-only unchanged C4 reference.";
  fs.writeFileSync(path.join(directory, source), bytes);
  fs.writeFileSync(
    path.join(directory, "v2/daily/riffs.json"),
    JSON.stringify({ riffs: [] }),
  );
  const item = {
    id: "repair-fixture",
    type: "repair",
    classification: "syntactic",
    objective: "Fixture-only review state integration",
    owner: "fixture-author",
    setup: { instrument: "piano" },
    source,
    blueprintVersion: 1,
    revision: 1,
    locales: ["en", "pt-BR", "es", "de", "ja", "zh-Hans"],
    status: "open",
    contentSHA256: sha(bytes),
    reviewEvidence: {
      parser: { status: "pending" },
      languages: { status: "pending" },
      independent: { status: "pending" },
    },
  };
  fs.writeFileSync(
    path.join(directory, "editorial/queue.json"),
    JSON.stringify({ revision: 1, items: [item] }),
  );
  fs.writeFileSync(
    path.join(directory, "editorial/publisher.json"),
    JSON.stringify({ status: "active", host: os.hostname() }),
  );
  fs.writeFileSync(
    path.join(directory, "editorial/evidence/legacy-repair.json"),
    JSON.stringify({
      changes: [
        {
          path: source,
          classification: "syntactic",
          afterSHA256: sha(bytes),
          proseEquivalent: true,
          blockProof: [],
        },
      ],
    }),
  );
  fs.writeFileSync(
    path.join(directory, "editorial/evidence/swift-parser.json"),
    JSON.stringify({
      scope:
        "Synthetic receipt solely for state-machine fixture; never production approval.",
      valid: true,
      currentBinarySHA256: "fixture-only",
      baselineSourceCommit: "5eab79a24efff87423d026784d06b503afb0184f",
      runtimeProvenance: {
        baselineCommit: "5eab79a24efff87423d026784d06b503afb0184f",
        baselineSourceSHA256: sha("fixture-baseline"),
        currentSourceSHA256: sha("fixture-current"),
      },
      counts: { guided: 0 },
      files: digestFiles(directory),
      candidateFiles: {},
    }),
  );
  const cli = (...args) =>
    execFileSync(
      process.execPath,
      [path.join(root, "scripts/editorial-pipeline.js"), ...args],
      {
        env: {
          ...process.env,
          EDITORIAL_REPOSITORY_ROOT: directory,
          EDITORIAL_STATE_ROOT: state,
        },
        encoding: "utf8",
      },
    );
  const batch = JSON.parse(cli("select", "2026-10-03"));
  assert.equal(batch.items[0].reviewEvidence.independent.status, "pending");
  for (const gate of ["parser", "languages", "independent"]) {
    const file = path.join(directory, gate + ".json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        gate,
        status: "approved",
        reviewer: "fixture-independent-reviewer",
        reviewedAt: "2026-10-03T23:00:00Z",
        contentSHA256: sha(bytes),
      }),
    );
    cli("record-review", item.id, file);
  }
  assert.match(cli("gate", item.id), /passed/);
  const evidence = path.join(directory, "evidence.json");
  fs.writeFileSync(
    evidence,
    JSON.stringify({ contentSnapshotSHA256: "fixture-only-content" }),
  );
  const updated = JSON.parse(cli("resume", batch.key));
  assert.equal(updated.items[0].reviewEvidence.independent.status, "pending");
  const queue = JSON.parse(
    fs.readFileSync(path.join(directory, "editorial/queue.json")),
  );
  queue.items[0].revision = 2;
  fs.writeFileSync(
    path.join(directory, "editorial/queue.json"),
    JSON.stringify(queue),
  );
  const rebound = JSON.parse(cli("reselect", batch.key));
  assert.equal(rebound.items[0].revision, 2);
  assert.equal(rebound.items[0].reviewEvidence.independent.status, "approved");
});
test("post-commit snapshot keeps reviewed content hash and verifies real committed bytes", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "editorial-post-commit-"),
  );
  const dist = path.join(directory, "dist"),
    state = path.join(directory, "state");
  fs.mkdirSync(path.join(dist, "v1/home"), { recursive: true });
  require("../scripts/editorial-state").initializeState(
    state,
    "Synthetic snapshot unit fixture",
  );
  fs.mkdirSync(path.join(state, "batches"), { recursive: true });
  const file = "v1/home/home.json";
  fs.writeFileSync(
    path.join(dist, file),
    fs.readFileSync(path.join(root, file)),
  );
  fs.writeFileSync(path.join(dist, ".nojekyll"), "");
  const files = treeManifest(dist);
  const content = sha(JSON.stringify(files));
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  fs.writeFileSync(
    path.join(dist, "snapshot.json"),
    JSON.stringify({
      commit: null,
      publicationStatus: "review-pending",
      snapshotSHA256: content,
      files,
    }),
  );
  const review = saveSnapshot(dist, state);
  fs.writeFileSync(
    path.join(state, "batches/fixture.json"),
    JSON.stringify({
      key: "fixture",
      itemIDs: [],
      items: [],
      day: editorialDay(),
      state: "commit-created",
      commit,
      contentSnapshotSHA256: content,
      history: [],
    }),
  );
  fs.copyFileSync(
    path.join(state, "batches/fixture.json"),
    path.join(state, "active.json"),
  );
  assert.throws(
    () => finalizeSnapshot(root, state, "fixture", dist),
    /commit\/content/,
  );
  fs.writeFileSync(
    path.join(dist, "snapshot.json"),
    JSON.stringify({
      commit,
      publicationStatus: "approved",
      snapshotSHA256: content,
      files,
    }),
  );
  const finalized = finalizeSnapshot(root, state, "fixture", dist);
  assert.notEqual(finalized.snapshotSHA256, review.key);
  assert.equal(finalized.contentSnapshotSHA256, content);
  assert.equal(
    JSON.parse(
      fs.readFileSync(
        path.join(
          state,
          "snapshots",
          finalized.snapshotSHA256,
          "snapshot.json",
        ),
      ),
    ).commit,
    commit,
  );
});
test("visual approval copies a fixture image and rejects absence, drift and traversal", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-visual-"));
  fs.mkdirSync(path.join(directory, "images"));
  const file = path.join(directory, "images/chart.png");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5f8AAAAASUVORK5CYII=",
    "base64",
  );
  fs.writeFileSync(file, png);
  const markdown = "![Fixture chart](images/chart.png)";
  const approval = {
    assetSHA256: { "guided:fixture:images/chart.png": sha(png) },
  };
  const assets = approvedAssets(
    markdown,
    directory,
    "guided:fixture",
    approval,
  );
  const target = path.join(directory, "target");
  copyApprovedAssets(assets, target);
  assert.equal(
    sha(fs.readFileSync(path.join(target, "images/chart.png"))),
    sha(png),
  );
  fs.writeFileSync(file, "changed");
  assert.throws(
    () => approvedAssets(markdown, directory, "guided:fixture", approval),
    /changed after review/,
  );
  fs.unlinkSync(file);
  assert.throws(
    () => approvedAssets(markdown, directory, "guided:fixture", approval),
    /Missing/,
  );
  assert.throws(
    () =>
      approvedAssets(
        "![Unsafe](../image.png)",
        directory,
        "guided:fixture",
        approval,
      ),
    /escapes/,
  );
  assert.throws(
    () =>
      approvedAssets(
        "![Remote](https://example.invalid/image.png)",
        directory,
        "guided:fixture",
        approval,
      ),
    /local relative/,
  );
});
test("commit, push, deploy and notification are distinct reconciled transitions", () => {
  let batch = {
    state: "review-approved",
    history: [],
    snapshotSHA256: "snapshot",
  };
  assert.throws(
    () => transition(batch, "deployment-confirmed"),
    /Invalid editorial transition/,
  );
  batch = transition(batch, "commit-created", { commit: "a".repeat(40) });
  assert.throws(
    () => transition(batch, "push-confirmed", { remoteCommit: "b".repeat(40) }),
    /match/,
  );
  batch = transition(batch, "push-confirmed", { remoteCommit: "a".repeat(40) });
  assert.throws(
    () =>
      transition(batch, "deployment-confirmed", {
        snapshotSHA256: "different",
        contentVerified: true,
      }),
    /served bytes/,
  );
  batch = transition(batch, "deployment-confirmed", {
    snapshotSHA256: "snapshot",
    contentVerified: true,
  });
  assert.throws(
    () => transition(batch, "notification-recorded", {}),
    /Notification/,
  );
  assert.equal(
    transition(batch, "notification-recorded", {
      notificationSkipped: "No authorized destination",
    }).state,
    "notification-recorded",
  );
});
test("dated riff horizon and expired/contextual rotation are explicit", () => {
  const catalog = {
    riffs: [
      {
        id: "a",
        date: "2026-10-03",
        validUntil: "2026-10-05",
        instruments: ["guitar"],
        rotationApproved: true,
      },
      {
        id: "b",
        date: "2026-10-04",
        validUntil: "2026-10-05",
        instruments: ["guitar"],
        rotationApproved: true,
      },
    ],
  };
  assert.equal(riffHorizon(catalog, "2026-10-03", "guitar"), 2);
  assert.equal(selectRiff(catalog, "2026-10-03", "guitar").source, "dated");
  const rotated = selectRiff(catalog, "2026-10-05", "guitar");
  assert.equal(rotated.source, "rotation");
  assert.ok(rotated.originalDate < "2026-10-05");
  assert.equal(selectRiff(catalog, "2026-10-06", "guitar"), null);
  assert.equal(selectRiff(catalog, "2026-10-05", "bass"), null);
});
test("Swift receipt rejects changed or newly added bytes", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "editorial-receipt-"),
  );
  fs.mkdirSync(path.join(directory, "v2"));
  fs.writeFileSync(path.join(directory, "v2/x"), "original");
  const receipt = {
    valid: true,
    currentBinarySHA256: "binary",
    counts: { guided: 0 },
    files: digestFiles(directory),
    candidateFiles: candidateDigests(directory),
  };
  receipt.baselineSourceCommit = "5eab79a24efff87423d026784d06b503afb0184f";
  receipt.runtimeProvenance = {
    baselineCommit: "5eab79a24efff87423d026784d06b503afb0184f",
    baselineSourceSHA256: sha("fixture-baseline"),
    currentSourceSHA256: sha("fixture-current"),
  };
  assert.equal(verifyReceipt(directory, receipt), true);
  fs.writeFileSync(path.join(directory, "v2/x"), "edited");
  assert.throws(() => verifyReceipt(directory, receipt), /snapshot/);
  fs.writeFileSync(path.join(directory, "v2/x"), "original");
  fs.writeFileSync(path.join(directory, "v2/new"), "extra");
  assert.throws(() => verifyReceipt(directory, receipt), /snapshot/);
});
test("rollback keeps immutable previous snapshots and records quarantine", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "editorial-snapshot-"),
  );
  const dist = path.join(directory, "dist"),
    state = path.join(directory, "state");
  fs.mkdirSync(dist);
  require("../scripts/editorial-state").initializeState(
    state,
    "Synthetic rollback unit fixture",
  );
  fs.writeFileSync(path.join(dist, "lesson.md"), "before");
  const first = saveSnapshot(dist, state);
  fs.writeFileSync(path.join(dist, "lesson.md"), "after");
  const second = saveSnapshot(dist, state);
  assert.notEqual(first.key, second.key);
  quarantineSnapshot(state, second.key, "Failed physical review");
  assert.equal(
    fs.readFileSync(path.join(first.directory, "lesson.md"), "utf8"),
    "before",
  );
  assert.equal(
    fs.readFileSync(path.join(second.directory, "lesson.md"), "utf8"),
    "after",
  );
  assert.ok(
    fs.existsSync(path.join(state, "quarantine", second.key + ".json")),
  );
});
test("CDN smoke verifies committed bytes and retries a mixed deployment", async () => {
  const bytes = Buffer.from("correct");
  const files = { "v2/lesson.md": sha(bytes) };
  let reads = 0;
  const fetcher = async (url) =>
    url.includes("snapshot.json")
      ? {
          ok: true,
          json: async () => ({
            publicationStatus: "approved",
            commit: "commit",
            snapshotSHA256: "snapshot",
            files,
          }),
        }
      : {
          ok: true,
          arrayBuffer: async () => (reads++ ? bytes : Buffer.from("stale")),
        };
  const result = await smokePages("https://example.invalid", {
    files,
    commit: "commit",
    fetcher,
    retries: 2,
    delayMs: 0,
    onRetry: () => {},
  });
  assert.equal(result.verifiedFiles, 1);
  assert.equal(reads, 2);
});
test("all pilot candidates remain finite, six-locale and retain their review provenance", () => {
  const result = validateEditorial(root, { requireReceipt: false });
  assert.equal(result.valid, true, result.errors.join("\n"));
  const published = JSON.parse(
    fs.readFileSync(path.join(root, "v2/education/paths.json"), "utf8"),
  );
  for (const p of published.paths) {
    assert.equal(p.publicationStatus, "approved");
    assert.ok(p.humanPlaythrough === "approved" ||
      (p.humanPlaythrough === "not-claimed" && p.approval.basis === "owner-release"));
    assert.ok(p.approval);
  }
  const candidates = JSON.parse(
    fs.readFileSync(path.join(root, "editorial/candidates/paths.json"), "utf8"),
  );
  for (const candidate of candidates.paths) {
    assert.ok(candidate.units.length > 0);
    for (const unit of candidate.units)
      assert.deepEqual(
        unit.placements.map((l) => l.role),
        ["core", "core", "core", "core", "transfer", "extra"],
      );
  }
  assert.ok(
    candidates.paths.every(
      (p) =>
        p.publicationStatus === "review-pending" &&
        p.humanPlaythrough === "pending" &&
        !p.approval,
    ),
  );
});
test("every pending physical repair is isolated and its original remains traceable", () => {
  const fallbacks = JSON.parse(
    fs.readFileSync(
      path.join(root, "editorial/evidence/legacy-fallbacks.json"),
      "utf8",
    ),
  );
  assert.equal(
    fallbacks.lessons.length,
    Object.values(fallbacks.counts).reduce((sum, count) => sum + count, 0),
  );
  for (const kind of [
    "original-listening-reference",
    "concept-only-no-invented-audio",
  ])
    assert.equal(
      fallbacks.counts[kind],
      fallbacks.lessons.filter((l) => l.fallbackKind === kind).length,
    );
  for (const entry of fallbacks.lessons) {
    const served = fs.readFileSync(path.join(root, entry.path), "utf8");
    assert.equal(sha(served), entry.fallbackSHA256);
    assert.notEqual(entry.fallbackSHA256, entry.proposalSHA256);
    assert.equal(
      sha(fs.readFileSync(path.join(root, entry.proposalPath))),
      entry.proposalSHA256,
    );
    assert.equal(
      sha(fs.readFileSync(path.join(root, entry.originalPath))),
      entry.originalSHA256,
    );
    assert.match(served, /^contentStatus: quarantined$/m);
    assert.doesNotMatch(served, /```fretboard/);
    if (entry.fallbackKind === "concept-only-no-invented-audio")
      assert.doesNotMatch(served, /```(?:notes|scale|chord|progression)/);
    else
      assert.ok(entry.originalAudioProof.every((p) => p.equivalent === true));
  }
});

test("smoke preserves its content hash and exposes the exact manifest-bound artifact hash", async () => {
  const bytes = Buffer.from("Synthetic served file");
  const files = { "v2/fixture.txt": sha(bytes) };
  const contentHash = sha(JSON.stringify(files));
  const raw =
    JSON.stringify(
      {
        publicationStatus: "approved",
        commit: "synthetic",
        snapshotSHA256: contentHash,
        files,
      },
      null,
      2,
    ) + "\n";
  const result = await smokePages("https://example.invalid", {
    files,
    commit: "synthetic",
    retries: 1,
    fetcher: async (url) =>
      url.includes("snapshot.json")
        ? { ok: true, text: async () => raw }
        : { ok: true, arrayBuffer: async () => bytes },
  });
  assert.equal(result.snapshotSHA256, contentHash);
  assert.equal(
    result.artifactSHA256,
    sha(JSON.stringify({ "snapshot.json": sha(raw), ...files })),
  );
  assert.equal(
    result.snapshotHashKinds.artifactSHA256,
    "artifact-tree-with-manifest",
  );
});
