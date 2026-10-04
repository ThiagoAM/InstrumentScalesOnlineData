const fs = require("node:fs");
const path = require("node:path");
const { sha } = require("./source-inventory");
function itemContentDigest(item, bytes) {
  if (item.type === "riff" && item.riffID) {
    const riff = JSON.parse(bytes).riffs.filter((r) => r.id === item.riffID);
    if (riff.length !== 1)
      throw new Error(
        "Selected riff is missing or duplicated in its authored source.",
      );
    return require("./publishing-state").riffHash(riff[0]);
  }
  return sha(bytes);
}
function authoredDigest(root, item) {
  const file = path.resolve(root, item.source);
  if (!file.startsWith(path.resolve(root) + path.sep))
    throw new Error("Authored source escapes repository.");
  return itemContentDigest(item, fs.readFileSync(file));
}
function targetDelivered(root, item, ref = null) {
  if (!item.target) return false;
  if (
    item.target.kind === "riff-list" &&
    item.target.riffHashes?.[item.riffID] !== item.contentSHA256
  )
    return false;
  if (
    item.target.kind !== "riff-list" &&
    item.target.sha256 !== item.contentSHA256
  )
    return false;
  try {
    require("./publishing-state").assertDelivered(root, item, ref);
    return true;
  } catch {
    return false;
  }
}
module.exports = { itemContentDigest, authoredDigest, targetDelivered };
