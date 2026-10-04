const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function assertNoMaintenance() {
  const realRecord = path.join(
    os.homedir(),
    "Library/Application Support/MacMiniServer/scheduled-jobs/disk-maintenance/active.json",
  );
  const records = [realRecord];
  // Tests may add a second fixture record, never replace or bypass the owner's record.
  if (
    process.env.INSTRUMENT_SCALES_MAINTENANCE_RECORD &&
    process.env.INSTRUMENT_SCALES_MAINTENANCE_RECORD !== realRecord
  )
    records.push(process.env.INSTRUMENT_SCALES_MAINTENANCE_RECORD);
  for (const record of records) {
    if (fs.existsSync(record))
      throw new Error(
        `Disk maintenance is active. Preserve the current checkpoint and await coordinator release. ${record}\n${fs.readFileSync(record, "utf8")}`,
      );
  }
}
module.exports = { assertNoMaintenance };
function assertImplementationAccess() {
  const record = path.join(
    os.homedir(),
    "Library/Application Support/MacMiniServer/scheduled-jobs/instrument-lessons/implementation-lock.json",
  );
  if (!fs.existsSync(record)) return;
  const state = JSON.parse(fs.readFileSync(record, "utf8"));
  if (
    state.status === "active" &&
    (!state.coordinator_thread ||
      !process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR ||
      process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR !==
        state.coordinator_thread)
  )
    throw new Error(
      "Editorial implementation lock is active. Preserve the checkpoint; only the explicitly authorized coordinator identity may run implementation commands.",
    );
}
function assertWritesAllowed() {
  assertNoMaintenance();
  assertImplementationAccess();
}
module.exports = {
  assertNoMaintenance,
  assertImplementationAccess,
  assertWritesAllowed,
};
