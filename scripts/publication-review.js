const fs = require("node:fs");
const path = require("node:path");
const { sha, digestFiles, verifyReceipt } = require("./audit-swift-parser");
const { publishedInventory } = require("./source-inventory");
function recordPublicationReview(root, stateRoot, record) {
  return require("./editorial-pipeline").withLock(stateRoot, () => {
    if (
      record.status !== "approved" ||
      !record.reviewer ||
      !record.reviewedAt ||
      !record.reviewReference
    ) {
      throw new Error(
        "Publication review requires the real reviewer, date and completed review reference.",
      );
    }
    const receipt = JSON.parse(
      fs.readFileSync(path.join(root, "editorial/evidence/swift-parser.json")),
    );
    verifyReceipt(root, receipt);
    const files = digestFiles(root),
      servedFiles = publishedInventory(root);
    const changes = JSON.parse(
      fs.readFileSync(path.join(root, "editorial/evidence/legacy-repair.json")),
    ).changes;
    const result = {
      ...record,
      kind: "independent-editorial-review",
      reviewRecordSHA256: sha(JSON.stringify(record)),
      publishedFiles: files,
      snapshotSHA256: sha(JSON.stringify(files)),
      servedFiles,
      servedSHA256: sha(JSON.stringify(servedFiles)),
      documentSHA256: Object.fromEntries(
        changes.map((change) => [change.path, files[change.path]]),
      ),
    };
    require("./editorial-pipeline").atomicJSON(
      path.join(root, "editorial/evidence/independent-review.json"),
      result,
    );
    return result;
  });
}
module.exports = { recordPublicationReview };
