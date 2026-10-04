const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  dailyUsed,
  assertDailyPublicationBudget,
  editorialDay,
} = require("../scripts/editorial-pipeline");

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

function fixture(batches) {
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-day-budget-"));
  fs.mkdirSync(path.join(state, "batches"));
  for (const batch of batches)
    fs.writeFileSync(
      path.join(state, "batches", batch.key + ".json"),
      JSON.stringify(batch),
    );
  return state;
}
const overnight = {
  key: "overnight",
  kind: "scheduled-editorial",
  day: "2026-10-03",
  reservationDay: "2026-10-03",
  publicationDay: "2026-10-04",
  deployment: { verifiedAt: "2026-10-04T03:00:01Z" },
  state: "notification-recorded",
  itemIDs: ["a", "b", "c"],
};
test("three items confirmed after local midnight consume today's allowance regardless of selection/replay date", () => {
  const state = fixture([overnight]);
  assert.equal(dailyUsed(state, "2026-10-04"), 3);
  assert.throws(
    () =>
      assertDailyPublicationBudget(
        state,
        { key: "next", day: "2026-10-02", itemIDs: ["d"] },
        "2026-10-04",
      ),
    /actual local publication day/,
  );
});
test("reservations and today's deliveries share one deduplicated conservative allowance", () => {
  const state = fixture([
    { ...overnight, itemIDs: ["a", "b"] },
    {
      key: "reserved",
      day: "2026-10-04",
      reservationDay: "2026-10-04",
      state: "commit-created",
      itemIDs: ["c"],
    },
  ]);
  assert.equal(dailyUsed(state, "2026-10-04"), 3);
  assert.doesNotThrow(() =>
    assertDailyPublicationBudget(
      state,
      { key: "reserved", itemIDs: ["c"] },
      "2026-10-04",
    ),
  );
  assert.throws(
    () =>
      assertDailyPublicationBudget(
        state,
        { key: "other", itemIDs: ["d"] },
        "2026-10-04",
      ),
    /actual local publication day/,
  );
});
test("old confirmed records derive Sao Paulo day; pre-publication deferral releases reservation and P0 has own exempt kind", () => {
  const old = { ...overnight };
  delete old.publicationDay;
  const state = fixture([
    old,
    { key: "deferred", day: "2026-10-04", state: "deferred", itemIDs: ["d"] },
    {
      key: "p0",
      kind: "coordinator-p0",
      day: "2026-10-04",
      publicationDay: "2026-10-04",
      state: "notification-recorded",
      itemIDs: ["e", "f", "g", "h"],
    },
  ]);
  assert.equal(dailyUsed(state, "2026-10-04"), 3);
  assert.equal(editorialDay(new Date("2026-10-04T02:59:59Z")), "2026-10-03");
});
test("quarantine cannot erase an already confirmed delivery from the effective day", () => {
  const state = fixture([{ ...overnight, state: "quarantined" }]);
  assert.equal(dailyUsed(state, "2026-10-04"), 3);
});
