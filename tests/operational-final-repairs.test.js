const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { fixtureCoordinator } = require("./helpers/fixture-coordinator");
const { codeUnitCompare } = require("../scripts/source-inventory");
const {
  initializeState,
  writeState,
  assertState,
} = require("../scripts/editorial-state");
const { reconcileActive } = require("../scripts/reconcile-active");
const roots = [];
test.after(() => {
  for (const dir of roots) fs.rmSync(dir, { recursive: true });
});
test("CI-shaped empty environment gets a synthetic fixture coordinator without changing host HOME or guards", () => {
  assert.equal(fixtureCoordinator({}), "synthetic-fixture-coordinator");
  assert.equal(
    fixtureCoordinator({
      INSTRUMENT_SCALES_EDITORIAL_COORDINATOR: "fixture-id",
    }),
    "fixture-id",
  );
});
test("inventory comparison uses code units for ASCII case, underscore and accent", () => {
  assert.deepEqual(["é", "z", "_", "a", "A"].sort(codeUnitCompare), [
    "A",
    "_",
    "a",
    "z",
    "é",
  ]);
});
test("coordinator repairs a validated split pointer without changing the authoritative batch or creating approval", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "active-reconcile-fixture-"),
  );
  roots.push(root);
  const state = path.join(root, "state"),
    coordinator = fixtureCoordinator(process.env);
  initializeState(state, "Synthetic pointer recovery fixture");
  fs.mkdirSync(path.join(root, "editorial"));
  fs.writeFileSync(
    path.join(root, "editorial/publisher.json"),
    JSON.stringify({ coordinatorThread: coordinator }),
  );
  const batch = {
    schema: 2,
    key: "known",
    state: "review-pending",
    items: [],
    itemIDs: [],
    history: [{ state: "review-pending", at: "2026-10-04T00:00:00Z" }],
  };
  writeState(state, "batches/known.json", batch);
  writeState(state, "active.json", { ...batch, state: "draft" });
  assert.throws(() => assertState(state), /split/);
  const before = fs.readFileSync(path.join(state, "batches/known.json"));
  const old = process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
  process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR = coordinator;
  try {
    assert.equal(
      reconcileActive(
        root,
        state,
        "known",
        "Synthetic crash between batch and active",
      ).state,
      "review-pending",
    );
    assert.doesNotThrow(() => assertState(state));
    assert.deepEqual(
      fs.readFileSync(path.join(state, "batches/known.json")),
      before,
    );
  } finally {
    if (old === undefined)
      delete process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
    else process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR = old;
  }
});
test("retention keeps pending copies and two verified complete copies, preserving an exact manifest before removing owned reconstructible data", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "retention-fixture-"));
  roots.push(root);
  const state = path.join(root, "state"),
    coordinator = fixtureCoordinator(process.env);
  initializeState(state, "Synthetic retention fixture");
  fs.mkdirSync(path.join(root, "editorial"));
  fs.writeFileSync(
    path.join(root, "editorial/publisher.json"),
    JSON.stringify({ coordinatorThread: coordinator }),
  );
  const { sha } = require("../scripts/source-inventory"),
    { treeManifest } = require("../scripts/editorial-pipeline");
  const items = {};
  const git = (...args) =>
    require("node:child_process")
      .execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" })
      .trim();
  git("init", "-b", "main");
  git("config", "user.name", "Synthetic retention fixture");
  git("config", "user.email", "fixture@example.invalid");
  for (let i = 0; i < 4; i++) {
    const dir = path.join(state, "builds", "previous-fixture-" + i);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "example.txt"), "owned fixture" + i);
    fs.writeFileSync(path.join(root, "example.txt"), "owned fixture" + i);
    git("add", "example.txt");
    git("commit", "-m", "Synthetic reconstructible snapshot" + i);
    const files = { "example.txt": sha("owned fixture" + i) },
      manifest = {
        publicationStatus: i === 3 ? "review-pending" : "approved",
        commit: git("rev-parse", "HEAD"),
        files,
      };
    fs.writeFileSync(path.join(dir, "snapshot.json"), JSON.stringify(manifest));
    items[i] = {
      status: "done",
      publishedCommit: manifest.commit,
      verifiedSnapshot: sha(JSON.stringify(treeManifest(dir))),
    };
  }
  writeState(state, "item-outcomes.json", { items });
  const old = process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
  process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR = coordinator;
  try {
    const fn = require("../scripts/owned-output-retention").pruneOwnedOutputs;
    const preview = fn(root, state, { reason: "Synthetic retention proof" });
    assert.equal(preview.prunable.length, 1);
    assert.equal(fs.existsSync(preview.prunable[0]), true);
    const applied = fn(root, state, {
      reason: "Synthetic retention proof",
      execute: true,
    });
    assert.equal(fs.existsSync(applied.prunable[0]), false);
    assert.equal(
      fs.existsSync(path.join(state, "builds/previous-fixture-3")),
      true,
    );
    assert.equal(
      fs.readdirSync(path.join(state, "retained-manifests")).length,
      1,
    );
  } finally {
    if (old === undefined)
      delete process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
    else process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR = old;
  }
});

test("coordinator lane API rejects missing/wrong identity before the global lock, while terminal selection returns to scheduled work", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "coordinator-lane-guard-"),
  );
  roots.push(root);
  const state = path.join(root, "state");
  const coordinator = fixtureCoordinator(process.env);
  fs.mkdirSync(path.join(root, "editorial"));
  fs.mkdirSync(path.join(root, "v2/daily"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "editorial/publisher.json"),
    JSON.stringify({ coordinatorThread: coordinator }),
  );
  fs.writeFileSync(
    path.join(root, "editorial/queue.json"),
    JSON.stringify({ items: [] }),
  );
  fs.writeFileSync(
    path.join(root, "v2/daily/riffs.json"),
    JSON.stringify({ riffs: [] }),
  );
  initializeState(state, "Synthetic coordinator lane guard fixture");
  const batch = {
    schema: 2,
    key: "known-lane",
    lane: "coordinator-intervention",
    state: "review-pending",
    items: [],
    itemIDs: [],
    history: [],
  };
  const api = require("../scripts/editorial-pipeline");
  const {
    assertBatchCoordinator,
  } = require("../scripts/coordinated-publication");
  writeState(state, "batches/known-lane.json", batch);
  writeState(state, "active.json", batch);
  const before = fs.readFileSync(path.join(state, "active.json"));
  const old = process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
  try {
    for (const identity of [undefined, "wrong-fixture-coordinator"]) {
      if (identity === undefined)
        delete process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
      else process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR = identity;
      for (const operation of [
        () => api.beginBatch(root, state, "2026-10-04"),
        () => api.reselectBatch(root, state, batch.key),
        () =>
          api.deferBatch(
            root,
            state,
            batch.key,
            "Synthetic pending review",
            [],
          ),
      ])
        assert.throws(operation, /explicitly authorized coordinator identity/);
      assert.deepEqual(
        fs.readFileSync(path.join(state, "active.json")),
        before,
      );
      assert.equal(fs.existsSync(path.join(state, "publisher.lock")), false);
      for (const state of ["notification-recorded", "deferred", "quarantined"])
        assert.doesNotThrow(() =>
          assertBatchCoordinator(
            root,
            { ...batch, state },
            { uncertainOnly: true },
          ),
        );
      assert.throws(
        () =>
          assertBatchCoordinator(
            root,
            { ...batch, state: "quarantined", commit: "uncertain" },
            { uncertainOnly: true },
          ),
        /explicitly authorized coordinator identity/,
      );
    }
    process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR = coordinator;
    const terminal = { ...batch, state: "notification-recorded" };
    writeState(state, "batches/known-lane.json", terminal);
    writeState(state, "active.json", terminal);
    const scheduled = api.beginBatch(root, state, "2026-10-04");
    assert.equal(scheduled.kind, "scheduled-editorial");
    assert.equal(scheduled.lane, undefined);
    assert.equal(scheduled.resumed, undefined);
  } finally {
    if (old === undefined)
      delete process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
    else process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR = old;
  }
});

test("Git inventory handles an index above the former buffer limit and never hides invalid Git references with a disk walk", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "large-git-inventory-"));
  roots.push(root);
  const { sourcePaths } = require("../scripts/source-inventory");
  const { execFileSync } = require("node:child_process");
  const git = (args, options = {}) =>
    execFileSync("git", args, {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
      ...options,
    });
  fs.mkdirSync(path.join(root, "v2"));
  fs.writeFileSync(
    path.join(root, "v2/disk-only.md"),
    "Synthetic non-Git fixture",
  );
  assert.deepEqual(sourcePaths(root, ["v2"]), ["v2/disk-only.md"]);
  assert.throws(
    () => sourcePaths(root, ["v2"], { committed: true, ref: "missing" }),
    /git/,
  );
  git(["init", "-b", "main"]);
  const blob = git(["hash-object", "-w", "--stdin"], {
    input: "Synthetic indexed file",
  })
    .toString()
    .trim();
  const entries = Array.from(
    { length: 6500 },
    (_, i) =>
      `100644 ${blob}\tv2/${String(i).padStart(5, "0")}/${"x".repeat(170)}.md\n`,
  ).join("");
  git(["update-index", "--index-info"], { input: entries });
  const paths = sourcePaths(root, ["v2"]);
  assert.equal(paths.length, 6501);
  assert.ok(Buffer.byteLength(paths.join("\0")) > 1024 * 1024);
  assert.throws(
    () => sourcePaths(root, ["v2"], { committed: true, ref: "missing" }),
    /git/,
  );
});
