const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const {
  initializeState,
  writeState,
  restoreState,
  assertState,
  assertActiveAttempt,
} = require("../scripts/editorial-state");
const { assertEquivalentRepair } = require("../scripts/equivalent-repair");
const { sha } = require("../scripts/source-inventory");
const roots = [];
function fixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "editorial-recovery-fixture-"),
  );
  roots.push(root);
  return root;
}
test.after(() => {
  for (const root of roots) {
    fs.rmSync(root, { recursive: true });
    if (fs.existsSync(root + ".recovery"))
      fs.rmSync(root + ".recovery", { recursive: true });
  }
});
test("missing publisher state fails closed; mirror restores identity and outcomes without silently reopening delivered work", () => {
  const root = fixture(),
    state = path.join(root, "state");
  initializeState(state, "Synthetic state recovery fixture");
  writeState(state, "item-outcomes.json", {
    schema: 1,
    items: { one: { status: "done", publishedCommit: "fixture" } },
  });
  fs.rmSync(state, { recursive: true });
  assert.throws(() => assertState(state), /identity is missing/);
  restoreState(state);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(state, "item-outcomes.json"))).items
      .one.status,
    "done",
  );
});
test("reselecting an old deferred key cannot hide a different uncertain active attempt", () => {
  const root = fixture();
  initializeState(root, "Synthetic active attempt fixture");
  writeState(root, "active.json", { key: "live", state: "push-confirmed" });
  assert.throws(
    () => assertActiveAttempt(root, "old-deferred"),
    /uncertain publication state/,
  );
});
test("equivalence predicate rejects stale fence proof although the outer document hash was updated", () => {
  const root = fixture(),
    source = "v2/lesson.md",
    block = "id: fixture\nsequence: C4\n";
  fs.mkdirSync(path.join(root, "v2"));
  fs.mkdirSync(path.join(root, "editorial/evidence"), { recursive: true });
  const text = "```notes\n" + block + "```\n";
  fs.writeFileSync(path.join(root, source), text);
  const item = {
    source,
    classification: "syntactic",
    contentSHA256: sha(text),
  };
  const proof = {
    path: source,
    classification: "syntactic",
    afterSHA256: item.contentSHA256,
    proseEquivalent: true,
    blockProof: [
      {
        classification: "syntactic",
        eventIntentEqual: true,
        afterType: "notes",
        afterSHA256: sha(block),
      },
    ],
  };
  const file = path.join(root, "editorial/evidence/legacy-repair.json");
  fs.writeFileSync(file, JSON.stringify({ changes: [proof] }));
  assert.doesNotThrow(() => assertEquivalentRepair(root, item));
  proof.blockProof[0].afterSHA256 = sha("sequence: D4");
  fs.writeFileSync(file, JSON.stringify({ changes: [proof] }));
  assert.throws(() => assertEquivalentRepair(root, item), /fence-byte proof/);
});
test("a terminal or stale active pointer cannot hide the authoritative uncertain batch", () => {
  const root = fixture();
  initializeState(root, "Synthetic split checkpoint fixture");
  writeState(root, "batches/new.json", { key: "new", state: "push-confirmed" });
  writeState(root, "active.json", {
    key: "old",
    state: "notification-recorded",
  });
  assert.throws(() => assertState(root), /checkpoint split|hidden/);
});
test("smoke waits for in-flight workers after first failure and never drains the remaining queue into an overlapping retry", async () => {
  const { verifyAll } = require("../scripts/smoke-pages"),
    files = Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => ["file" + i, sha("ok")]),
    );
  let starts = 0,
    active = 0;
  const fetcher = async () => {
    const current = starts++;
    active++;
    await new Promise((resolve) => setTimeout(resolve, current === 0 ? 1 : 15));
    active--;
    return {
      ok: current !== 0,
      status: 500,
      arrayBuffer: async () => Buffer.from("ok"),
    };
  };
  await assert.rejects(
    () =>
      verifyAll(
        "https://fixture.invalid",
        { files, snapshotSHA256: "fixture" },
        fetcher,
      ),
    /HTTP500|HTTP 500/,
  );
  assert.equal(active, 0);
  assert.ok(starts <= 8);
});

function crashInitialization(state, ledger, boundary = "ledger") {
  const { spawnSync } = require("node:child_process");
  const code = `
    const path = require("node:path");
    const api = require(${JSON.stringify(path.join(__dirname, "../scripts/editorial-pipeline"))});
    const original = api.atomicJSON;
    let ledgerWrites = 0;
    api.atomicJSON = (file, value) => {
      original(file, value);
      if (file === path.join(process.argv[1], "item-outcomes.json")) ledgerWrites++;
      const boundary = process.argv[3];
      if ((boundary === "ledger" && ledgerWrites === 1) ||
          (boundary === "identity" && file === path.join(process.argv[1], "identity.json")) ||
          (boundary === "mirrored-ledger" && ledgerWrites === 2)) process.exit(86);
    };
    require(${JSON.stringify(path.join(__dirname, "../scripts/editorial-state"))}).initializeState(
      process.argv[1], "Synthetic exact initialization crash", { initialOutcomes: JSON.parse(process.argv[2]) },
    );
  `;
  const child = spawnSync(
    process.execPath,
    ["-e", code, state, JSON.stringify(ledger), boundary],
    {
      env: process.env,
      encoding: "utf8",
    },
  );
  assert.equal(child.status, 86, child.stderr);
  return JSON.parse(fs.readFileSync(path.join(state, "initialization.json")));
}
const initializationLedger = () => ({
  schema: 1,
  items: {
    delivered: {
      id: "delivered",
      status: "done",
      fingerprint: "synthetic",
      publishedCommit: "fixture",
      verifiedSnapshot: sha("synthetic"),
      completedAt: "2026-10-04T09:00:00Z",
    },
  },
});
for (const boundary of ["ledger", "identity", "mirrored-ledger"])
  test(`real process exit at initialization ${boundary} boundary resumes the same journal without reopening delivered items`, () => {
    const root = fixture(),
      state = path.join(root, "state"),
      ledger = initializationLedger();
    const prepared = crashInitialization(state, ledger, boundary);
    assert.equal(prepared.status, "prepared");
    assert.equal(
      fs.existsSync(path.join(state, "identity.json")),
      boundary !== "ledger",
    );
    assert.throws(() => assertState(state), /initialization is incomplete/);
    const replay = structuredClone(ledger);
    replay.items.delivered.completedAt = "2026-10-04T09:05:00Z";
    const identity = initializeState(
      state,
      "Synthetic exact initialization crash",
      { initialOutcomes: replay },
    );
    const complete = JSON.parse(
      fs.readFileSync(path.join(state, "initialization.json")),
    );
    assert.equal(complete.status, "complete");
    assert.equal(complete.transactionID, prepared.transactionID);
    assert.deepEqual(identity, prepared.identity);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(state, "item-outcomes.json"))),
      ledger,
    );
    assert.doesNotThrow(() => assertState(state));
    for (const name of ["identity.json", "item-outcomes.json"])
      assert.equal(
        JSON.parse(
          fs.readFileSync(path.join(state + ".recovery/current", name)),
        ).sha256,
        sha(
          JSON.stringify(JSON.parse(fs.readFileSync(path.join(state, name)))),
        ),
      );
  });

test("initialization never adopts an orphan, unknown files, changed ledger, changed replay or corrupted journal", () => {
  const cases = [
    "orphan",
    "unknown",
    "ledger-drift",
    "intent-drift",
    "journal-corrupt",
    "journal-other-root",
    "recovery-drift",
  ];
  for (const kind of cases) {
    const root = fixture(),
      state = path.join(root, "state"),
      ledger = initializationLedger();
    fs.mkdirSync(state);
    if (kind === "orphan")
      fs.writeFileSync(
        path.join(state, "item-outcomes.json"),
        JSON.stringify(ledger),
      );
    else if (kind === "unknown")
      fs.writeFileSync(
        path.join(state, "unique.json"),
        "Preserve unknown data",
      );
    else {
      const j = crashInitialization(state, ledger);
      if (kind === "ledger-drift")
        fs.writeFileSync(
          path.join(state, "item-outcomes.json"),
          JSON.stringify({ schema: 1, items: {} }),
        );
      if (kind === "intent-drift")
        ledger.items.delivered.publishedCommit = "different-commit";
      if (kind === "journal-corrupt") {
        j.outcomes.items.delivered.status = "open";
        fs.writeFileSync(
          path.join(state, "initialization.json"),
          JSON.stringify(j),
        );
      }
      if (kind === "journal-other-root") {
        j.stateRoot = path.join(root, "other");
        fs.writeFileSync(
          path.join(state, "initialization.json"),
          JSON.stringify(j),
        );
      }
      if (kind === "recovery-drift") {
        fs.mkdirSync(path.join(state + ".recovery/current"), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(state + ".recovery/current", "identity.json"),
          JSON.stringify({
            schema: 1,
            repositoryID: j.repositoryID,
            relative: "identity.json",
            payload: { unknown: true },
            sha256: sha("unknown"),
          }),
        );
      }
    }
    const before = require("../scripts/editorial-pipeline").treeManifest(state);
    assert.throws(
      () =>
        initializeState(state, "Synthetic exact initialization crash", {
          initialOutcomes: ledger,
        }),
      /preserv|differs|intent|corrupt/i,
      kind,
    );
    assert.deepEqual(
      require("../scripts/editorial-pipeline").treeManifest(state),
      before,
      kind,
    );
    assert.equal(fs.existsSync(path.join(state, "identity.json")), false, kind);
  }
});

test("restore-state refuses a prepared identity-boundary initialization before moving the directory", () => {
  const root = fixture(),
    state = path.join(root, "state"),
    ledger = initializationLedger();
  crashInitialization(state, ledger, "identity");
  const before = require("../scripts/editorial-pipeline").treeManifest(state);
  const entries = fs.readdirSync(root).sort();
  assert.throws(
    () => restoreState(state),
    /prepared.*same commit and Pages URL/,
  );
  assert.deepEqual(
    require("../scripts/editorial-pipeline").treeManifest(state),
    before,
  );
  assert.deepEqual(fs.readdirSync(root).sort(), entries);
  assert.equal(
    fs.existsSync(path.join(state + ".recovery/current", "item-outcomes.json")),
    false,
  );
  assert.doesNotThrow(() =>
    initializeState(state, "Synthetic exact initialization crash", {
      initialOutcomes: ledger,
    }),
  );
});

test("dry-run CLI fails closed for missing/prepared state and suggests selection only after completed initialization", () => {
  const { spawnSync } = require("node:child_process");
  const root = fixture(),
    state = path.join(root, "state"),
    api = path.join(__dirname, "../scripts/editorial-pipeline.js");
  fs.mkdirSync(path.join(root, "editorial"));
  fs.mkdirSync(path.join(root, "v2/daily"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "editorial/queue.json"),
    JSON.stringify({
      items: [{ id: "synthetic-review", type: "review", status: "open" }],
    }),
  );
  fs.writeFileSync(
    path.join(root, "v2/daily/riffs.json"),
    JSON.stringify({ riffs: [] }),
  );
  const run = () =>
    spawnSync(process.execPath, [api, "dry-run", "2026-10-04"], {
      env: {
        ...process.env,
        EDITORIAL_REPOSITORY_ROOT: root,
        EDITORIAL_STATE_ROOT: state,
      },
      encoding: "utf8",
    });
  let result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /identity is missing/);
  assert.equal(result.stdout, "");
  crashInitialization(state, initializationLedger());
  const before = require("../scripts/editorial-pipeline").treeManifest(state);
  result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /initialization is incomplete/);
  assert.equal(result.stdout, "");
  assert.deepEqual(
    require("../scripts/editorial-pipeline").treeManifest(state),
    before,
  );
  initializeState(state, "Synthetic exact initialization crash", {
    initialOutcomes: initializationLedger(),
  });
  result = run();
  assert.equal(result.status, 0, result.stderr);
  const selection = JSON.parse(result.stdout);
  assert.equal(selection.readOnly, true);
  assert.deepEqual(
    selection.selected.map((item) => item.id),
    ["synthetic-review"],
  );
});
