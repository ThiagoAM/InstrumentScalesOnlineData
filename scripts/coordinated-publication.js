const fs = require("node:fs");
const path = require("node:path");
const { sha } = require("./source-inventory");
const read = (file) => JSON.parse(fs.readFileSync(file));
function assertCoordinator(root) {
  const publisher = read(path.join(root, "editorial/publisher.json"));
  if (
    !publisher.coordinatorThread ||
    !process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR ||
    publisher.coordinatorThread !==
      process.env.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR
  )
    throw new Error(
      "A coordinated intervention requires the explicitly authorized coordinator identity.",
    );
}
function assertBatchCoordinator(root, batch, { uncertainOnly = false } = {}) {
  const terminal =
    ["notification-recorded", "quarantined", "deferred"].includes(
      batch.state,
    ) && !(batch.state === "quarantined" && batch.commit);
  if (
    batch.lane === "coordinator-intervention" &&
    (!uncertainOnly || !terminal)
  )
    assertCoordinator(root);
}
function humanApproval(record) {
  const a = record.approval;
  if (
    !a ||
    a.kind !== "human" ||
    a.playthrough !== "completed" ||
    !a.approvedBy ||
    !a.approvedAt ||
    a.independentReview?.status !== "approved" ||
    !a.independentReview.reviewer ||
    !a.independentReview.reviewedAt ||
    a.languages?.status !== "approved" ||
    !a.languages.reviewer ||
    !a.languages.reviewedAt ||
    record.approvalSHA256 !==
      sha(JSON.stringify(require("./publishing-state").canonical(a)))
  )
    throw new Error(
      "Promotion lacks integral hash-bound human/independent/language approval.",
    );
  return a;
}
function promotionRecords(root) {
  const directory = path.join(root, "editorial/promotions");
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      ...read(path.join(directory, f)),
      recordPath: "editorial/promotions/" + f,
    }));
}
function validLegacyPromotion(root, relative, bytes) {
  const digest = sha(bytes);
  for (const record of promotionRecords(root)) {
    if (
      record.kind !== "legacy" ||
      record.status !== "promoted" ||
      record.publishedContentSHA256?.[relative] !== digest
    )
      continue;
    try {
      const a = humanApproval(record);
      if (a.documentSHA256?.[relative] !== digest) continue;
      require("./approved-assets").approvedAssets(
        bytes.toString("utf8"),
        path.dirname(path.join(root, relative)),
        relative,
        a,
      );
      return true;
    } catch {}
  }
  return false;
}
function candidateManifest(pathValue) {
  const candidate = structuredClone(pathValue);
  delete candidate.approval;
  candidate.publicationStatus = "review-pending";
  candidate.humanPlaythrough = "pending";
  return candidate;
}
function assertPathManifestApproval(pathValue) {
  if (
    pathValue.approval?.pathManifestSHA256 !==
    sha(
      JSON.stringify(
        require("./publishing-state").canonical(candidateManifest(pathValue)),
      ),
    )
  )
    throw new Error(
      "Human path approval does not bind the exact setup, prerequisites, roles and spine manifest.",
    );
}
function startCoordinatedPromotion(root, stateRoot, recordFile) {
  assertCoordinator(root);
  return require("./editorial-pipeline").withLock(stateRoot, () => {
    const record = read(recordFile);
    if (
      record.status !== "promoted" ||
      !["legacy", "path"].includes(record.kind)
    )
      throw new Error(
        "Only a complete promoted human-reviewed transaction can begin coordinated publication.",
      );
    humanApproval(record);
    const items = read(path.join(root, "editorial/queue.json")).items.filter(
      (i) => record.itemIDs.includes(i.id),
    );
    if (
      items.length !== record.itemIDs.length ||
      new Set(record.itemIDs).size !== items.length
    )
      throw new Error("Promotion item identities are missing or duplicated.");
    for (const [file, digest] of Object.entries(record.targetsFiles)) {
      const target = path.resolve(root, file);
      if (
        !file.startsWith("v2/") ||
        !target.startsWith(path.resolve(root, "v2") + path.sep) ||
        sha(fs.readFileSync(target)) !== digest
      )
        throw new Error("New promotion target drift: " + file);
    }
    const api = require("./editorial-pipeline"),
      receipt = read(path.join(root, "editorial/evidence/swift-parser.json"));
    for (const item of items) {
      api.gateItem(item, { root, receipt });
      require("./publishing-state").assertDelivered(root, item);
    }
    require("./editorial-state").assertState(stateRoot);
    const key = sha(
      JSON.stringify([
        "coordinator-promotion",
        recordFile,
        sha(fs.readFileSync(recordFile)),
      ]),
    );
    require("./editorial-state").assertActiveAttempt(stateRoot, key);
    const previous = path.join(stateRoot, "batches", key + ".json");
    if (fs.existsSync(previous)) return read(previous);
    const batch = {
      schema: 2,
      key,
      kind: "coordinator-promotion",
      lane: "coordinator-intervention",
      promotionRecord: path.relative(root, recordFile),
      promotionSHA256: sha(fs.readFileSync(recordFile)),
      day: api.editorialDay(),
      selectedAt: new Date().toISOString(),
      baseCommit: require("node:child_process")
        .execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: root,
          encoding: "utf8",
        })
        .trim(),
      itemIDs: items.map((i) => i.id),
      items,
      state: "draft",
      history: [
        {
          state: "draft",
          at: new Date().toISOString(),
          reason:
            "Explicit coordinated human-approved curriculum/legacy promotion; not a scheduled daily batch.",
        },
      ],
    };
    return api.saveBatch(stateRoot, batch);
  });
}
module.exports = {
  assertCoordinator,
  assertBatchCoordinator,
  humanApproval,
  promotionRecords,
  validLegacyPromotion,
  assertPathManifestApproval,
  startCoordinatedPromotion,
};

function registeredPathPromotion(root, pathValue) {
  return promotionRecords(root).some((record) => {
    if (record.kind !== "path" || record.status !== "promoted") return false;
    try {
      const a = humanApproval(record);
      return (
        a.pathManifestSHA256 === pathValue.approval?.pathManifestSHA256 &&
        a.approvedBy === pathValue.approval?.approvedBy &&
        Object.entries(pathValue.approval?.documentSHA256 || {}).every(
          ([key, value]) => a.documentSHA256?.[key] === value,
        )
      );
    } catch {
      return false;
    }
  });
}
module.exports.registeredPathPromotion = registeredPathPromotion;
