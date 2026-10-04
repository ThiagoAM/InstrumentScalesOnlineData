const fs = require("node:fs");
const path = require("node:path");
const { sha } = require("./source-inventory");
function assertEquivalentRepair(root, item) {
  const proof = JSON.parse(
    fs.readFileSync(path.join(root, "editorial/evidence/legacy-repair.json")),
  ).changes.find((c) => c.path === item.source);
  const text = fs.readFileSync(path.join(root, item.source), "utf8");
  const fences = [...text.matchAll(/```([^\n]+)\n([\s\S]*?)```/g)];
  if (
    !proof ||
    proof.classification !== item.classification ||
    proof.afterSHA256 !== item.contentSHA256 ||
    sha(text) !== item.contentSHA256 ||
    !(
      proof.proseEquivalent === true ||
      (item.classification === "editorial-equivalent" &&
        proof.editorialCorrection?.kind === "incorrect-key-name" &&
        text.includes(proof.editorialCorrection.after) &&
        !text.includes(proof.editorialCorrection.before))
    ) ||
    fences.length !== proof.blockProof.length ||
    proof.blockProof.some(
      (block, index) =>
        block.classification !== "syntactic" ||
        block.eventIntentEqual !== true ||
        block.afterType !== fences[index][1] ||
        block.afterSHA256 !== sha(fences[index][2]),
    )
  ) {
    throw new Error(
      "Equivalent repair lacks complete current event/prose/fence-byte proof.",
    );
  }
  return true;
}
module.exports = { assertEquivalentRepair };
