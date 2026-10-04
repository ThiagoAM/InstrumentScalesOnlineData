const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { assertPathDocumentCompatible } = require("../scripts/approved-assets");
const {
  promotePath,
  pendingManifest,
  canonicalSHA,
} = require("../scripts/promote-approved");

test("current path contract rejects local, HTTPS, reference and typed images across every locale but keeps ordinary links", () => {
  for (const image of [
    "![Diagram](images/map.png)",
    "Text with ![Diagram](https://example.invalid/map.png)",
    "![Diagram][map]\n[map]: images/map.png",
    '<img src="map.png">',
    "```image\nsource: map.png\n```",
  ])
    assert.throws(
      () => assertPathDocumentCompatible(":::locale zh-Hans\n" + image),
      /current APP approval contract/,
    );
  assert.doesNotThrow(() =>
    assertPathDocumentCompatible(
      "[Support](https://example.invalid) and [download](map.png)",
    ),
  );
});

test("even a supplied synthetic hash approval cannot prepare or promote an image-bearing path", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "unsupported-path-image-"),
  );
  try {
    const relative = "guided/guitar/synthetic/lesson.md",
      source = path.join(root, "editorial/candidates", relative);
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(
      source,
      ":::localized\n:::locale ja\n![Synthetic diagram](images/map.png)\n:::endlocalized\n",
    );
    const selected = {
      id: "synthetic-image-contract",
      publicationStatus: "review-pending",
      humanPlaythrough: "pending",
      units: [
        {
          placements: [
            {
              source: "guided",
              path: relative,
              contentKey: "guided:synthetic-image",
            },
          ],
        },
      ],
    };
    fs.writeFileSync(
      path.join(root, "editorial/candidates/paths.json"),
      JSON.stringify({ paths: [selected] }),
    );
    fs.writeFileSync(
      path.join(root, "editorial/publisher.json"),
      JSON.stringify({ status: "active", host: os.hostname(), fixture: true }),
    );
    const stateRoot = path.join(root, "private-state");
    const approval = {
      kind: "human",
      approvedBy: "Synthetic fixture only",
      approvedAt: "2026-10-04T00:00:00Z",
      playthrough: "completed",
      assetSHA256: { "guided:synthetic-image:images/map.png": "0".repeat(64) },
      pathManifestSHA256: canonicalSHA(pendingManifest(selected)),
    };
    assert.throws(
      () => promotePath(selected.id, approval, { root, stateRoot }),
      /current APP approval contract/,
    );
    assert.equal(fs.existsSync(path.join(stateRoot, "promotions")), false);
    assert.equal(fs.existsSync(path.join(root, "v2")), false);
    assert.equal(fs.existsSync(path.join(root, "editorial/promotions")), false);
    assert.equal(fs.existsSync(path.join(stateRoot, "publisher.lock")), false);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});

test("publication validation also refuses a manually inserted image-bearing path", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "unsupported-published-path-image-"),
  );
  try {
    const repository = path.join(__dirname, "..");
    for (const name of ["v2", "editorial"])
      fs.cpSync(path.join(repository, name), path.join(root, name), {
        recursive: true,
      });
    const candidate = JSON.parse(
      fs.readFileSync(path.join(root, "editorial/candidates/paths.json")),
    ).paths[0];
    const p = structuredClone(candidate);
    p.publicationStatus = "approved";
    p.humanPlaythrough = "approved";
    p.approval = {
      approvedBy: "Synthetic fixture; never production approval",
      approvedAt: "2026-10-04T00:00:00Z",
      documentSHA256: {},
    };
    for (const placement of p.units.flatMap((unit) => unit.placements)) {
      const source = path.join(root, "editorial/candidates", placement.path),
        destination = path.join(root, "v2/education", placement.path);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
    const first = p.units[0].placements[0],
      target = path.join(root, "v2/education", first.path);
    fs.appendFileSync(
      target,
      "\n![Synthetic unsupported image](https://example.invalid/map.png)\n",
    );
    fs.writeFileSync(
      path.join(root, "v2/education/paths.json"),
      JSON.stringify({ schema: 2, format: 2, revision: 2, paths: [p] }),
    );
    const result = require("../scripts/validate-editorial").validateEditorial(
      root,
      { requireReceipt: false },
    );
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((error) =>
        error.includes("current APP approval contract"),
      ),
    );
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});
