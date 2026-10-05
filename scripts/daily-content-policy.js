const fs = require("node:fs");
const path = require("node:path");

function guidedOnly(queue) {
  return queue.newContentModel === "guided-only";
}
function eligibleDailyItem(queue, item) {
  if (!guidedOnly(queue)) return true;
  if (item.type === "repair" || item.type === "review") return true;
  return item.type === "gap" && item.guidedTarget?.role === "extra";
}
function assertLegacyCreationAllowed(root) {
  const file = path.join(root, "editorial/queue.json");
  if (fs.existsSync(file) && guidedOnly(JSON.parse(fs.readFileSync(file))))
    throw new Error(
      "New legacy lessons and dated riffs are retired from daily authoring. Use scripts/create-guided-lesson.js for a guided optional extra.",
    );
}
module.exports = { guidedOnly, eligibleDailyItem, assertLegacyCreationAllowed };
