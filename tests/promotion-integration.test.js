const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const {
  sha,
  digestFiles,
  candidateDigests,
} = require("../scripts/audit-swift-parser");
const { promoteQueueItem } = require("../scripts/promote-queue-item");
const { assertDelivered } = require("../scripts/publishing-state");
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

const runtimeConfig =
  process.env.EDITORIAL_TEST_RUNTIME_CONFIG ||
  path.join(
    os.homedir(),
    "Library/Application Support/InstrumentScalesEditorial/parsers/active-runtimes.json",
  );
const realParserAvailable = fs.existsSync(runtimeConfig);
function fixture() {
  const repo = fs.mkdtempSync(
    path.join(os.tmpdir(), "instrument-scales-promotion-"),
  );
  for (const name of ["v2", "editorial", "scripts", ".gitignore"])
    fs.cpSync(path.join(root, name), path.join(repo, name), {
      recursive: true,
    });
  execFileSync("git", ["init", "-b", "main"], { cwd: repo, stdio: "pipe" });
  const config = realParserAvailable
    ? JSON.parse(fs.readFileSync(runtimeConfig))
    : { current: {} };
  // Synthetic transaction evidence, local fixture only. The committed source-pinned Swift binary
  // parses copied sources; synthetic item reviews never authorize production.
  // Real promotion cases are enabled only after the coordinator prepares the
  // committed current runtime. No invented app SHA or review-only bypass.
  if (realParserAvailable)
    require("../scripts/parser-runtime").loadRuntimeConfig(runtimeConfig);
  const configFile = path.join(repo, "synthetic-fixture-runtimes.json");
  fs.writeFileSync(configFile, JSON.stringify(config));
  const previous = process.env.EDITORIAL_RUNTIME_CONFIG;
  process.env.EDITORIAL_RUNTIME_CONFIG = configFile;
  return {
    repo,
    state: path.join(repo, "private-state"),
    restore: () =>
      previous === undefined
        ? delete process.env.EDITORIAL_RUNTIME_CONFIG
        : (process.env.EDITORIAL_RUNTIME_CONFIG = previous),
  };
}
function stage(f, item) {
  const digest = require("../scripts/editorial-item").authoredDigest(
    f.repo,
    item,
  );
  item.contentSHA256 = digest;
  item.reviewEvidence = {};
  for (const gate of ["parser", "languages", "independent", "playthrough"])
    item.reviewEvidence[gate] = {
      status: "approved",
      kind: "human",
      reviewer: "Synthetic test reviewer, never production approval",
      reviewedAt: "2026-10-04T00:00:00Z",
      contentSHA256: digest,
    };
  fs.writeFileSync(
    path.join(f.repo, "editorial/queue.json"),
    JSON.stringify({ schema: 1, revision: 1, dailyLimit: 3, items: [item] }),
  );
  const receiptFile = path.join(f.repo, "editorial/evidence/swift-parser.json");
  const receipt = JSON.parse(fs.readFileSync(receiptFile));
  receipt.reviewOnly = false;
  receipt.scope = "Synthetic transaction fixture. Not publication approval.";
  receipt.files = digestFiles(f.repo);
  receipt.candidateFiles = candidateDigests(f.repo);
  fs.writeFileSync(receiptFile, JSON.stringify(receipt));
  return item;
}
function refresh(f) {
  const file = path.join(f.repo, "editorial/evidence/swift-parser.json"),
    receipt = JSON.parse(fs.readFileSync(file));
  receipt.files = digestFiles(f.repo);
  receipt.candidateFiles = candidateDigests(f.repo);
  fs.writeFileSync(file, JSON.stringify(receipt));
}
const base = {
  status: "open",
  owner: "Synthetic test author",
  objective: "Fixture verifies promotion of exact authored bytes.",
  setup: { instrument: "adaptive" },
  locales: ["en", "pt-BR", "es", "de", "ja", "zh-Hans"],
  blueprintVersion: 1,
  revision: 1,
};
test(
  "riff promotion parses real candidate and binds all delivered entries; repeating it changes no catalog or queue bytes",
  { skip: !realParserAvailable },
  () => {
    const f = fixture();
    try {
      const item = stage(f, {
        ...base,
        id: "fixture-riff-horizon",
        type: "riff",
        riffID: JSON.parse(
          fs.readFileSync(path.join(f.repo, "editorial/candidates/riffs.json")),
        ).riffs[0].id,
        source: "editorial/candidates/riffs.json",
      });
      const result = promoteQueueItem(f.repo, f.state, item.id);
      const queue = JSON.parse(
        fs.readFileSync(path.join(f.repo, "editorial/queue.json")),
      );
      assert.doesNotThrow(() => assertDelivered(f.repo, queue.items[0]));
      assert.equal(Object.keys(result.target.riffHashes).length, 1);
      refresh(f);
      const before = digestFiles(f.repo),
        beforeQueue = fs.readFileSync(
          path.join(f.repo, "editorial/queue.json"),
        );
      promoteQueueItem(f.repo, f.state, item.id);
      assert.deepEqual(digestFiles(f.repo), before);
      assert.deepEqual(
        fs.readFileSync(path.join(f.repo, "editorial/queue.json")),
        beforeQueue,
      );
      const catalogFile = path.join(f.repo, "v2/daily/riffs.json"),
        catalog = JSON.parse(fs.readFileSync(catalogFile));
      catalog.riffs.find(
        (r) => r.id === Object.keys(result.target.riffHashes)[0],
      ).fence.source += "\n# changed fixture";
      fs.writeFileSync(catalogFile, JSON.stringify(catalog));
      assert.throws(
        () => assertDelivered(f.repo, queue.items[0]),
        /riff.*digest|different|hash|target|not delivered/i,
      );
    } finally {
      f.restore();
    }
  },
);
test(
  "approved gap copies exact schema2 draft into an existing optional unit and repeats idempotently",
  { skip: !realParserAvailable },
  () => {
    const f = fixture();
    try {
      const catalog = JSON.parse(
        fs.readFileSync(
          path.join(
            f.repo,
            "v2/education/courses/instrument-scales/catalog.json",
          ),
        ),
      );
      const receipt = JSON.parse(
        fs.readFileSync(
          path.join(f.repo, "editorial/evidence/swift-parser.json"),
        ),
      );
      const original = receipt.rows.find(
        (row) =>
          row.parser === "current" &&
          row.source === "legacy" &&
          !row.diagnostics.length &&
          row.file.includes("/instrument-scales/"),
      ).file;
      const originalText = fs.readFileSync(path.join(f.repo, original), "utf8");
      const sectionID = originalText.match(/^section: (.+)$/m)[1],
        unitID = originalText.match(/^unit: (.+)$/m)[1];
      const unit = catalog.sections
        .find((s) => s.id === sectionID)
        .units.find((u) => u.id === unitID);
      let markdown = originalText
        .replace(/^id: .+$/m, "id: fixture-reviewed-gap")
        .replace(/^order: \d+$/m, "order: " + (unit.lessons.length + 1));
      const source = "editorial/candidates/fixture-gap/lesson.md";
      fs.mkdirSync(path.dirname(path.join(f.repo, source)), {
        recursive: true,
      });
      fs.writeFileSync(path.join(f.repo, source), markdown);
      const item = stage(f, {
        ...base,
        id: "fixture-reviewed-gap",
        type: "gap",
        blueprintApproved: true,
        source,
      });
      const result = promoteQueueItem(f.repo, f.state, item.id),
        queue = JSON.parse(
          fs.readFileSync(path.join(f.repo, "editorial/queue.json")),
        );
      assert.doesNotThrow(() => assertDelivered(f.repo, queue.items[0]));
      assert.equal(
        fs.readFileSync(path.join(f.repo, result.target.path), "utf8"),
        markdown,
      );
      const published = JSON.parse(
        fs.readFileSync(
          path.join(
            f.repo,
            "v2/education/courses/instrument-scales/catalog.json",
          ),
        ),
      )
        .sections.find((s) => s.id === sectionID)
        .units.find((u) => u.id === unitID)
        .lessons.at(-1);
      assert.equal(published.optional, true);
      assert.equal(published.order, unit.lessons.length + 1);
      refresh(f);
      const before = digestFiles(f.repo);
      promoteQueueItem(f.repo, f.state, item.id);
      assert.deepEqual(digestFiles(f.repo), before);
    } finally {
      f.restore();
    }
  },
);
test("promotion rejects absent persistent provenance before changing a target", () => {
  const f = fixture();
  try {
    const item = stage(f, {
      ...base,
      id: "fixture-riff-horizon",
      type: "riff",
      riffID: JSON.parse(
        fs.readFileSync(path.join(f.repo, "editorial/candidates/riffs.json")),
      ).riffs[0].id,
      source: "editorial/candidates/riffs.json",
    });
    delete process.env.EDITORIAL_RUNTIME_CONFIG;
    const before = digestFiles(f.repo);
    assert.throws(
      () => promoteQueueItem(f.repo, f.state, item.id),
      /runtime-config/,
    );
    assert.deepEqual(digestFiles(f.repo), before);
  } finally {
    f.restore();
  }
});
test("recipe variation must identify a genuinely approved definition and hash-bound human sampling record", () => {
  const f = fixture();
  try {
    const item = stage(f, {
      ...base,
      id: "fixture-variation",
      type: "review",
      approvedRecipe: "fixture-recipe",
      source: "editorial/candidates/riffs.json",
    });
    delete item.reviewEvidence.playthrough;
    const receipt = JSON.parse(
      fs.readFileSync(
        path.join(f.repo, "editorial/evidence/swift-parser.json"),
      ),
    );
    const gate = () =>
      require("../scripts/editorial-pipeline").gateItem(item, {
        root: f.repo,
        receipt,
      });
    assert.throws(gate, /real approved recipe/);
    const definition = {
        fixture: true,
        pattern: "Previously reviewed scale cell, synthetic test only",
      },
      digest = sha(JSON.stringify(definition));
    const recipe = {
      id: item.approvedRecipe,
      definition,
      status: "approved",
      approval: {
        recipeSHA256: digest,
        reviewedBy: "Synthetic independent reviewer",
        reviewedAt: "2026-10-04",
        playthrough: {
          kind: "human",
          status: "approved",
          recipeSHA256: digest,
          reviewedBy: "Synthetic human sampler",
          reviewedAt: "2026-10-04",
        },
      },
    };
    fs.writeFileSync(
      path.join(f.repo, "editorial/recipes.json"),
      JSON.stringify({ recipes: [recipe] }),
    );
    item.reviewEvidence.approvedRecipeDigest = digest;
    item.reviewEvidence.samplingPlan =
      "Synthetic fixture: replay one representative cell and its register boundary.";
    item.reviewEvidence.recipeSampling = {
      kind: "human",
      status: "approved",
      contentSHA256: item.contentSHA256,
      reviewer: "Synthetic sampler",
      reviewedAt: "2026-10-04",
    };
    assert.doesNotThrow(gate);
    item.reviewEvidence.approvedRecipeDigest = "0".repeat(64);
    assert.throws(gate, /real approved recipe/);
  } finally {
    f.restore();
  }
});

test("one dated riff is one editorial item even when the reviewed source holds a seven-day horizon", () => {
  const riffs = [{ id: "synthetic-one" }, { id: "synthetic-two" }];
  const select = require("../scripts/promote-queue-item").selectRiffCandidate;
  assert.throws(() => select(riffs), /exactly one riffID/);
  assert.equal(select(riffs, riffs[0].id).length, 1);
  assert.throws(() => select(riffs, "unknown-fixture"), /missing/);
  assert.throws(() => select([...riffs, riffs[0]], riffs[0].id), /duplicated/);
});
