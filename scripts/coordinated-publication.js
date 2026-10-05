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
  require("./path-release-approval").assertReviewApproval(a, {
    allowOwnerRelease: ["path", "paths"].includes(record.kind),
    pathIDs: record.pathIDs || (record.kind === "path" ? [record.id] : undefined),
  });
  if (record.approvalSHA256 !== sha(JSON.stringify(require("./publishing-state").canonical(a))))
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
  return require("./path-release-approval").candidateManifest(pathValue);
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
      !["legacy", "path", "paths"].includes(record.kind)
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
  if (pathValue.approval?.basis === "guided-extra-delta")
    return require("./promote-guided-gap").registeredGuidedDelta(root, pathValue);
  return promotionRecords(root).some((record) => {
    if (!["path", "paths"].includes(record.kind) || record.status !== "promoted") return false;
    try {
      const a = humanApproval(record);
      assertPathManifestApproval(pathValue);
      const ids = record.pathIDs || [record.id];
      if (!ids.includes(pathValue.id)) return false;
      const digest = sha(JSON.stringify(require("./publishing-state").canonical(pathValue)));
      if (digest !== (record.pathSHA256?.[pathValue.id] || record.primarySHA256)) return false;
      return (
        (record.kind === "paths" ? a.pathManifestsSHA256?.[pathValue.id] : a.pathManifestSHA256) === pathValue.approval?.pathManifestSHA256 &&
        a.approvedBy === pathValue.approval?.approvedBy &&
        a.approvedAt === pathValue.approval?.approvedAt &&
        (a.basis || null) === (pathValue.approval?.basis || null) &&
        (a.basis !== "owner-release" || require("./path-release-approval").same(a.releaseApproval, pathValue.approval?.releaseApproval)) &&
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
function registeredPathOwnerRelease(root, item) {
  const proof = item.reviewEvidence?.ownerRelease;
  if (proof?.status !== "approved" || proof.kind !== "human" ||
      !proof.reviewer || !proof.reviewedAt || proof.contentSHA256 !== item.contentSHA256)
    return false;
  const index = read(path.join(root, "v2/education/paths.json"));
  return promotionRecords(root).some(record => {
    if (!["path", "paths"].includes(record.kind) || record.status !== "promoted" ||
        !record.itemIDs?.includes(item.id) || record.approval?.basis !== "owner-release") return false;
    try {
      const approval = humanApproval(record), target = record.targets?.[item.id];
      if (proof.approvalSHA256 !== record.approvalSHA256 || proof.reviewer !== approval.approvedBy ||
          proof.reviewedAt !== approval.approvedAt ||
          !require("./path-release-approval").same(proof.releaseApproval, approval.releaseApproval) ||
          !require("./path-release-approval").same(target, item.target) || target.sha256 !== item.contentSHA256 ||
          sha(fs.readFileSync(path.join(root, target.path))) !== item.contentSHA256) return false;
      return index.paths.some(p => {
        if (!registeredPathPromotion(root, p)) return false;
        const baseline = p.approval?.basis === "guided-extra-delta" ? require("./guided-variation").ownerBaseline(p) : p;
        return baseline.approval?.basis === "owner-release" && baseline.humanPlaythrough === "not-claimed" &&
          registeredPathPromotion(root, baseline) && p.units.flatMap(u => u.placements).some(l =>
            "v2/education/" + l.path === target.path && baseline.approval.documentSHA256[l.contentKey] === item.contentSHA256 &&
            p.approval.documentSHA256[l.contentKey] === item.contentSHA256);
      });
    } catch { return false; }
  });
}
module.exports.registeredPathOwnerRelease = registeredPathOwnerRelease;
