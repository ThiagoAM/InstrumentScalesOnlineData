const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { execFileSync } = require("node:child_process");
const {
  sha,
  digestFiles,
  candidateDigests,
} = require("../scripts/audit-swift-parser");
const { publishedInventory } = require("../scripts/source-inventory");
const {
  beginBatch,
  itemFingerprint,
} = require("../scripts/editorial-pipeline");
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

const git = (directory, ...args) =>
  execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
function fixture() {
  const coordinator =
    require("./helpers/fixture-coordinator").fixtureCoordinator(process.env);
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "instrument-scales-git-lane-"),
  );
  const repo = path.join(directory, "repo"),
    remote = path.join(directory, "remote.git"),
    state = path.join(directory, "state");
  fs.mkdirSync(repo);
  require("../scripts/editorial-state").initializeState(
    state,
    "Synthetic isolated Git/HTTP transaction fixture",
  );
  for (const name of [
    "v1",
    "v2",
    "editorial",
    "scripts",
    "README.md",
    "OPENCLAW.md",
    "create-lesson.js",
    ".gitignore",
    "site",
  ])
    fs.cpSync(path.join(root, name), path.join(repo, name), {
      recursive: true,
    });
  // The transaction fixture owns a copied snapshot; keep pending proposal byte
  // receipts self-consistent even while another worker authors those candidates.
  const fallbackFile = path.join(
      repo,
      "editorial/evidence/legacy-fallbacks.json",
    ),
    fallbacks = JSON.parse(fs.readFileSync(fallbackFile));
  for (const fallback of fallbacks.lessons)
    fallback.proposalSHA256 = sha(
      fs.readFileSync(path.join(repo, fallback.proposalPath)),
    );
  fs.writeFileSync(fallbackFile, JSON.stringify(fallbacks));
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.name", "Synthetic integration fixture");
  git(repo, "config", "user.email", "fixture@example.invalid");
  git(directory, "init", "--bare", remote);
  git(repo, "remote", "add", "origin", remote);
  const definitions = JSON.parse(
    fs.readFileSync(path.join(repo, "editorial/queue.json")),
  );
  const item = definitions.items.find((i) =>
    ["syntactic", "editorial-equivalent"].includes(i.classification),
  );
  assert.ok(
    item,
    "Integration fixture requires one independently reviewable equivalent; use a synthetic fixture if the archive has none.",
  );
  item.status = "open";
  item.target = {
    kind: "file",
    path: item.source,
    sha256: item.contentSHA256,
    files: [item.source],
  };
  for (const gate of ["parser", "languages", "independent"])
    item.reviewEvidence[gate] = {
      status: "approved",
      reviewer: "Synthetic fixture reviewer; not a production review",
      reviewedAt: "2026-10-04T00:00:00Z",
      contentSHA256: item.contentSHA256,
    };
  fs.writeFileSync(
    path.join(repo, "editorial/queue.json"),
    JSON.stringify({ ...definitions, items: [item] }),
  );
  fs.writeFileSync(
    path.join(repo, "editorial/publisher.json"),
    JSON.stringify({
      status: "active",
      host: os.hostname(),
      fixture: true,
      coordinatorThread: coordinator,
      publicBaseURL: "https://thiagoam.github.io/InstrumentScalesOnlineData",
    }),
  );
  const receipt = JSON.parse(
    fs.readFileSync(path.join(repo, "editorial/evidence/swift-parser.json")),
  );
  receipt.reviewOnly = false;
  receipt.scope =
    "Synthetic Git/HTTP transaction fixture using source-tested parser evidence; never publication approval.";
  receipt.files = digestFiles(repo);
  receipt.candidateFiles = candidateDigests(repo);
  fs.writeFileSync(
    path.join(repo, "editorial/evidence/swift-parser.json"),
    JSON.stringify(receipt),
  );
  const files = digestFiles(repo);
  const changes = JSON.parse(
    fs.readFileSync(path.join(repo, "editorial/evidence/legacy-repair.json")),
  ).changes;
  const review = {
    status: "approved",
    reviewer: "Synthetic fixture reviewer; not production approval",
    reviewedAt: "2026-10-04T00:00:00Z",
    publishedFiles: files,
    snapshotSHA256: sha(JSON.stringify(files)),
    servedFiles: publishedInventory(repo),
    servedSHA256: sha(JSON.stringify(publishedInventory(repo))),
    documentSHA256: Object.fromEntries(
      changes.map((c) => [
        c.path,
        sha(fs.readFileSync(path.join(repo, c.path))),
      ]),
    ),
  };
  fs.writeFileSync(
    path.join(repo, "editorial/evidence/independent-review.json"),
    JSON.stringify(review),
  );
  git(repo, "add", ".");
  git(repo, "commit", "-m", "Fixture baseline with reviewed static content");
  git(repo, "push", "-u", "origin", "main");
  const environment = {
    ...process.env,
    INSTRUMENT_SCALES_EDITORIAL_COORDINATOR: coordinator,
    EDITORIAL_REPOSITORY_ROOT: repo,
    EDITORIAL_STATE_ROOT: state,
  };
  const cli = (...args) =>
    execFileSync(
      process.execPath,
      [path.join(repo, "scripts/editorial-pipeline.js"), ...args],
      { env: environment, encoding: "utf8", stdio: "pipe" },
    );
  const evidence = path.join(directory, "evidence.json");
  const checkpoint = (key, next, value = {}) => {
    fs.writeFileSync(evidence, JSON.stringify(value));
    return JSON.parse(cli("checkpoint", key, next, evidence));
  };
  return { directory, repo, remote, state, item, environment, cli, checkpoint };
}
async function serve(directory) {
  const server = http.createServer((request, response) => {
    const relative = new URL(request.url, "http://localhost").pathname.slice(1);
    const file = path.resolve(directory, relative);
    if (
      !file.startsWith(path.resolve(directory) + path.sep) ||
      !fs.existsSync(file)
    ) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: "http://127.0.0.1:" + server.address().port };
}
test("real Git rejected push and corrective descendant resume one attempt, deploy actual bytes and leave definitions clean", async () => {
  const f = fixture();
  const batch = JSON.parse(f.cli("select", "2026-10-04"));
  f.checkpoint(batch.key, "validated");
  f.checkpoint(batch.key, "review-pending");
  f.checkpoint(batch.key, "review-approved");
  fs.appendFileSync(
    path.join(f.repo, "README.md"),
    "\nFixture publisher implementation change.\n",
  );
  git(f.repo, "add", "README.md");
  git(f.repo, "commit", "-m", "Fixture C1");
  const c1 = git(f.repo, "rev-parse", "HEAD");
  f.checkpoint(batch.key, "commit-created", { commit: c1 });
  const other = path.join(f.directory, "other");
  git(f.directory, "clone", f.remote, other);
  git(other, "checkout", "main");
  git(other, "config", "user.name", "Other fixture");
  git(other, "config", "user.email", "other@example.invalid");
  fs.writeFileSync(
    path.join(other, "fixture-concurrent.txt"),
    "concurrent non-content fixture",
  );
  git(other, "add", ".");
  git(other, "commit", "-m", "Fixture competing publisher");
  git(other, "push", "origin", "main");
  assert.throws(() => git(f.repo, "push", "origin", "main"), /rejected/);
  git(f.repo, "fetch", "origin", "main");
  git(f.repo, "merge", "--no-edit", "origin/main");
  const c2 = git(f.repo, "rev-parse", "HEAD");
  assert.notEqual(c1, c2);
  const rebound = JSON.parse(f.cli("rebind", batch.key, c2));
  assert.equal(rebound.state, "commit-created");
  assert.equal(rebound.snapshotSHA256, undefined);
  execFileSync(
    process.execPath,
    [path.join(f.repo, "scripts/build-pages.js")],
    { cwd: f.repo, env: { ...f.environment, GITHUB_SHA: c2 }, stdio: "pipe" },
  );
  JSON.parse(f.cli("finalize-snapshot", batch.key));
  assert.equal(
    fs.existsSync(path.join(f.repo, "dist/instrument-scales")),
    false,
    "Prepared commercial site is disabled in production.",
  );
  git(f.repo, "push", "origin", "main");
  f.checkpoint(batch.key, "push-confirmed");
  // A real CI failure asks for a descendant correction with identical published content.
  fs.appendFileSync(
    path.join(f.repo, "README.md"),
    "\nFixture CI correction.\n",
  );
  git(f.repo, "add", "README.md");
  git(f.repo, "commit", "-m", "Fixture CI correction C3");
  const c3 = git(f.repo, "rev-parse", "HEAD");
  JSON.parse(f.cli("rebind", batch.key, c3));
  execFileSync(
    process.execPath,
    [path.join(f.repo, "scripts/build-pages.js")],
    { cwd: f.repo, env: { ...f.environment, GITHUB_SHA: c3 }, stdio: "pipe" },
  );
  f.cli("finalize-snapshot", batch.key);
  git(f.repo, "push", "origin", "main");
  f.checkpoint(batch.key, "push-confirmed");
  const service = await serve(path.join(f.repo, "dist"));
  try {
    // Async subprocess keeps this loopback HTTP server able to answer actual verifier requests.
    const { spawn } = require("node:child_process");
    const output = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          path.join(f.repo, "scripts/editorial-pipeline.js"),
          "verify-deployment",
          batch.key,
          service.url,
          "--allow-local-fixture",
        ],
        { env: f.environment },
      );
      let stdout = "",
        stderr = "";
      child.stdout.on("data", (data) => (stdout += data));
      child.stderr.on("data", (data) => (stderr += data));
      child.on("exit", (code) =>
        code === 0 ? resolve(stdout) : reject(new Error(stderr)),
      );
    });
    assert.equal(JSON.parse(output).state, "deployment-confirmed");
    f.checkpoint(batch.key, "notification-recorded", {
      notificationSkipped: "Synthetic fixture, no messaging authorization",
    });
    const p0 = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          path.join(f.repo, "scripts/editorial-pipeline.js"),
          "reconcile-p0",
          c3,
          service.url,
          "--allow-local-fixture",
        ],
        { env: f.environment },
      );
      let stdout = "",
        stderr = "";
      child.stdout.on("data", (data) => (stdout += data));
      child.stderr.on("data", (data) => (stderr += data));
      child.on("exit", (code) =>
        code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(stderr)),
      );
    });
    assert.equal(p0.equivalentRepairsReconciled, 1);
  } finally {
    await new Promise((resolve) => service.server.close(resolve));
  }
  assert.equal(git(f.repo, "status", "--porcelain"), "");
  const repeat = JSON.parse(f.cli("select", "2026-10-04"));
  assert.equal(repeat.itemIDs.length, 0);
  const outcomes = JSON.parse(
    fs.readFileSync(path.join(f.state, "item-outcomes.json")),
  );
  assert.equal(outcomes.items[f.item.id].publishedCommit, c3);
});
test("mixed deferral preserves approved items and daily successful-item budget never exceeds three", () => {
  const f = fixture();
  const queueFile = path.join(f.repo, "editorial/queue.json"),
    queue = JSON.parse(fs.readFileSync(queueFile));
  const ready = queue.items[0];
  const pending = {
    ...ready,
    id: "pending-physical-fixture",
    classification: "musical",
    status: "open",
    reviewEvidence: {},
  };
  const riff = {
    ...ready,
    id: "riff-fixture",
    type: "riff",
    status: "open",
    reviewEvidence: {},
  };
  queue.items.push(pending, riff);
  fs.writeFileSync(queueFile, JSON.stringify(queue));
  const batch = JSON.parse(f.cli("select", "2026-10-04"));
  f.cli("defer", batch.key, "Waiting only on the missing evidence");
  const next = JSON.parse(f.cli("select", "2026-10-04"));
  assert.deepEqual(next.itemIDs, [ready.id]);
  assert.ok(fs.existsSync(path.join(f.state, "item-outcomes.json")));
  const saved = JSON.parse(fs.readFileSync(path.join(f.state, "active.json")));
  saved.items = [ready, { ...ready, id: "two" }, { ...ready, id: "three" }];
  saved.itemIDs = saved.items.map((i) => i.id);
  saved.state = "notification-recorded";
  saved.commit = git(f.repo, "rev-parse", "HEAD");
  fs.writeFileSync(
    path.join(f.state, "batches", saved.key + ".json"),
    JSON.stringify(saved),
  );
  fs.writeFileSync(path.join(f.state, "active.json"), JSON.stringify(saved));
  const repeated = JSON.parse(f.cli("select", "2026-10-04"));
  assert.equal(repeated.itemIDs.length, 0);
});
test("new unselected V2 bytes invalidate independent review and cannot be smuggled into a selected commit", () => {
  const f = fixture();
  const batch = JSON.parse(f.cli("select", "2026-10-04"));
  f.checkpoint(batch.key, "validated");
  f.checkpoint(batch.key, "review-pending");
  f.checkpoint(batch.key, "review-approved");
  fs.appendFileSync(path.join(f.repo, "v2/daily/riffs.json"), "\n");
  git(f.repo, "add", ".");
  git(f.repo, "commit", "-m", "Fixture unexpected content delta");
  assert.throws(
    () =>
      f.checkpoint(batch.key, "commit-created", {
        commit: git(f.repo, "rev-parse", "HEAD"),
      }),
    /unselected targets/,
  );
});
test("partial build is explicitly resumable and source inventories refuse ignored or uncommitted drafts", () => {
  const f = fixture();
  const build = require("../scripts/build-pages").buildPages;
  const manifest = build(f.repo, { stateRoot: f.state });
  const buildRoot = path.join(f.state, "builds"),
    stage = path.join(buildRoot, "stage-fixture-resume"),
    backup = path.join(buildRoot, "previous-fixture-resume");
  fs.mkdirSync(stage);
  fs.writeFileSync(path.join(stage, ".nojekyll"), "");
  fs.writeFileSync(
    path.join(buildRoot, "active.json"),
    JSON.stringify({
      stage,
      backup,
      dist: path.join(f.repo, "dist"),
      state: "copying",
      manifest,
    }),
  );
  assert.throws(
    () => build(f.repo, { stateRoot: f.state }),
    /Partial build preserved/,
  );
  assert.deepEqual(
    build(f.repo, { stateRoot: f.state, resume: true }),
    manifest,
  );
  assert.deepEqual(
    require("../scripts/editorial-pipeline").treeManifest(
      path.join(f.repo, "dist"),
    )["v2/education/courses.json"],
    manifest.files["v2/education/courses.json"],
  );
  fs.writeFileSync(
    path.join(f.repo, "editorial/valuable-draft.swp"),
    "Synthetic ignored fixture draft",
  );
  assert.throws(
    () =>
      require("../scripts/source-inventory").assertCommitClean(
        f.repo,
        git(f.repo, "rev-parse", "HEAD"),
      ),
    /ignored files/,
  );
});
test("checkpoint does not accept injected commit or pretend deployment evidence", () => {
  const f = fixture(),
    batch = JSON.parse(f.cli("select", "2026-10-04"));
  assert.throws(
    () => f.checkpoint(batch.key, "validated", { commit: "f".repeat(40) }),
    /evidence|allowed|Unsupported/i,
  );
  assert.throws(
    () =>
      f.checkpoint(batch.key, "deployment-confirmed", {
        contentVerified: true,
      }),
    /deployment|verif|Unsupported/i,
  );
});
test("prepared site is disabled, and historical inventories use the policy from their own commit", () => {
  const f = fixture(),
    original = git(f.repo, "rev-parse", "HEAD");
  assert.equal(
    Object.keys(publishedInventory(f.repo)).some((file) =>
      file.startsWith("instrument-scales/"),
    ),
    false,
  );
  fs.writeFileSync(
    path.join(f.repo, "editorial/site-publication.json"),
    JSON.stringify({
      schema: 1,
      enabled: true,
      status: "enabled",
      enabledAt: "2026-10-04",
      intervention: "Synthetic fixture only; no production authorization",
    }),
  );
  assert.equal(
    Object.keys(publishedInventory(f.repo)).some((file) =>
      file.startsWith("instrument-scales/"),
    ),
    true,
  );
  assert.equal(
    Object.keys(
      publishedInventory(f.repo, { committed: true, ref: original }),
    ).some((file) => file.startsWith("instrument-scales/")),
    false,
  );
});

test("review-approved may defer explicit unready targets without treating a stale global parser receipt as a human failure", () => {
  const f = fixture(),
    batch = JSON.parse(f.cli("select", "2026-10-04"));
  f.checkpoint(batch.key, "validated");
  f.checkpoint(batch.key, "review-pending");
  f.checkpoint(batch.key, "review-approved");
  fs.appendFileSync(path.join(f.repo, "v2/daily/riffs.json"), "\n");
  assert.throws(
    () => f.cli("defer", batch.key, "Global receipt is stale"),
    /receipt does not match/,
  );
  const deferred = JSON.parse(
    f.cli(
      "defer",
      batch.key,
      "Explicit target is awaiting correction",
      "--ids",
      f.item.id,
    ),
  );
  assert.deepEqual(deferred.blockedIDs, [f.item.id]);
});
test("author update cannot approve a blueprint, assign a recipe or expand publication targets", () => {
  const f = fixture(),
    file = path.join(f.directory, "update.json");
  for (const forbidden of ["blueprintApproved", "approvedRecipe", "target"]) {
    fs.writeFileSync(file, JSON.stringify({ [forbidden]: true }));
    assert.throws(
      () => f.cli("update-item", f.item.id, file),
      /Unsupported authored-item update/,
    );
  }
});
test("content-changing descendant rebind reopens review for the same identities and discards stale snapshot approval", () => {
  const f = fixture(),
    batch = JSON.parse(f.cli("select", "2026-10-04"));
  f.checkpoint(batch.key, "validated");
  f.checkpoint(batch.key, "review-pending");
  f.checkpoint(batch.key, "review-approved");
  fs.appendFileSync(
    path.join(f.repo, "README.md"),
    "\nSynthetic initial publication attempt.\n",
  );
  git(f.repo, "add", ".");
  git(f.repo, "commit", "-m", "Synthetic initial commit");
  const first = git(f.repo, "rev-parse", "HEAD");
  f.checkpoint(batch.key, "commit-created", { commit: first });
  fs.appendFileSync(
    path.join(f.repo, f.item.source),
    "\nSynthetic content correction, not production teaching.\n",
  );
  git(f.repo, "add", ".");
  git(f.repo, "commit", "-m", "Synthetic changed content descendant");
  const second = git(f.repo, "rev-parse", "HEAD");
  assert.throws(() => f.cli("rebind", batch.key, second), /Content changed/);
  const rebound = JSON.parse(
    f.cli("rebind", batch.key, second, "--content-changed"),
  );
  assert.equal(rebound.state, "review-pending");
  assert.deepEqual(rebound.itemIDs, batch.itemIDs);
  assert.equal(rebound.commit, undefined);
  assert.equal(rebound.contentSnapshotSHA256, undefined);
});
test("ready partial with manifest resumes; obsolete partial is preserved by explicit discard before another build", () => {
  const f = fixture(),
    { buildPages, discardPartialBuild } = require("../scripts/build-pages"),
    manifest = buildPages(f.repo, { stateRoot: f.state }),
    dir = path.join(f.state, "builds"),
    stage = path.join(dir, "stage-ready-fixture"),
    backup = path.join(dir, "previous-ready-fixture");
  fs.cpSync(path.join(f.repo, "dist"), stage, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "active.json"),
    JSON.stringify({
      stage,
      backup,
      dist: path.join(f.repo, "dist"),
      state: "ready",
      manifest,
    }),
  );
  assert.deepEqual(
    buildPages(f.repo, { stateRoot: f.state, resume: true }),
    manifest,
  );
  // Crash after the stage was renamed to dist but before the complete journal.
  assert.equal(fs.existsSync(stage), false);
  fs.writeFileSync(
    path.join(dir, "active.json"),
    JSON.stringify({
      stage,
      backup,
      dist: path.join(f.repo, "dist"),
      state: "ready",
      manifest,
    }),
  );
  assert.deepEqual(
    buildPages(f.repo, { stateRoot: f.state, resume: true }),
    manifest,
  );
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(dir, "active.json"))).state,
    "complete",
  );
  const obsolete = path.join(dir, "stage-obsolete-fixture");
  fs.mkdirSync(obsolete);
  fs.writeFileSync(
    path.join(obsolete, "unique.txt"),
    "Unique fixture work must be preserved",
  );
  fs.writeFileSync(
    path.join(dir, "active.json"),
    JSON.stringify({
      stage: obsolete,
      backup: path.join(dir, "previous-obsolete-fixture"),
      dist: path.join(f.repo, "dist"),
      state: "copying",
      manifest,
    }),
  );
  const result = discardPartialBuild(
    f.repo,
    f.state,
    "Synthetic changed review; preserve partial source",
  );
  assert.equal(
    fs.readFileSync(path.join(result.preserved, "stage/unique.txt"), "utf8"),
    "Unique fixture work must be preserved",
  );
  assert.equal(fs.existsSync(path.join(dir, "active.json")), false);
});

test("invalid P0 item leaves a fresh publisher uninitialized; actual corrected reconciliation installs the complete ledger", async () => {
  const f = fixture();
  const originalCoordinator =
    process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
  process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR =
    f.environment.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
  const file = path.join(f.repo, "editorial/evidence/legacy-repair.json");
  const repairs = JSON.parse(fs.readFileSync(file));
  const change = repairs.changes.find((c) => c.path === f.item.source);
  const correctHash = change.servedSHA256;
  change.servedSHA256 = "0".repeat(64);
  fs.writeFileSync(file, JSON.stringify(repairs));
  git(f.repo, "add", ".");
  git(f.repo, "commit", "-m", "Synthetic invalid P0 artifact record");
  const { buildPages } = require("../scripts/build-pages");
  buildPages(f.repo, { stateRoot: f.state });
  const fresh = path.join(f.directory, "fresh-p0-state");
  const service = await serve(path.join(f.repo, "dist"));
  try {
    const { reconcileP0 } = require("../scripts/publishing-state");
    await assert.rejects(
      reconcileP0(
        f.repo,
        fresh,
        git(f.repo, "rev-parse", "HEAD"),
        service.url,
        { allowLocalFixture: true },
      ),
      /P0 delivered bytes differ/,
    );
    for (const relative of [
      "identity.json",
      "item-outcomes.json",
      "p0-reconciled.json",
    ])
      assert.equal(fs.existsSync(path.join(fresh, relative)), false);
    assert.equal(fs.existsSync(fresh + ".recovery"), false);
    change.servedSHA256 = correctHash;
    fs.writeFileSync(file, JSON.stringify(repairs));
    git(f.repo, "add", ".");
    git(f.repo, "commit", "-m", "Synthetic corrected P0 artifact record");
    buildPages(f.repo, { stateRoot: f.state });
    const commit = git(f.repo, "rev-parse", "HEAD");
    const result = await reconcileP0(f.repo, fresh, commit, service.url, {
      allowLocalFixture: true,
    });
    assert.equal(result.equivalentRepairsReconciled, 1);
    const outcome = JSON.parse(
      fs.readFileSync(path.join(fresh, "item-outcomes.json")),
    ).items[f.item.id];
    assert.equal(outcome.status, "done");
    assert.equal(outcome.publishedCommit, commit);
    assert.equal(outcome.verifiedSnapshotKind, "artifact-tree-with-manifest");
    assert.equal(
      outcome.verifiedSnapshot,
      sha(
        JSON.stringify(
          require("../scripts/editorial-pipeline").treeManifest(
            path.join(f.repo, "dist"),
          ),
        ),
      ),
    );
    assert.notEqual(outcome.verifiedSnapshot, outcome.verifiedContentSHA256);
    const identityBefore = fs.readFileSync(path.join(fresh, "identity.json"));
    const journal = JSON.parse(
      fs.readFileSync(path.join(fresh, "initialization.json")),
    );
    await reconcileP0(f.repo, fresh, commit, service.url, {
      allowLocalFixture: true,
    });
    const replayed = JSON.parse(
      fs.readFileSync(path.join(fresh, "item-outcomes.json")),
    ).items[f.item.id];
    assert.equal(replayed.completedAt, outcome.completedAt);
    assert.equal(
      replayed.completedAt,
      journal.outcomes.items[f.item.id].completedAt,
    );
    assert.equal(replayed.fingerprint, outcome.fingerprint);
    assert.equal(replayed.publishedCommit, commit);
    assert.deepEqual(
      fs.readFileSync(path.join(fresh, "identity.json")),
      identityBefore,
    );
    assert.equal(
      JSON.parse(
        fs.readFileSync(
          path.join(fresh + ".recovery/current", "item-outcomes.json"),
        ),
      ).payload.items[f.item.id].completedAt,
      outcome.completedAt,
    );
    assert.doesNotThrow(() =>
      require("../scripts/editorial-state").assertState(fresh),
    );
  } finally {
    await new Promise((resolve) => service.server.close(resolve));
    if (originalCoordinator === undefined)
      delete process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR;
    else
      process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR = originalCoordinator;
  }
});
