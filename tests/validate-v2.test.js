const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { validateV2 } = require("../scripts/validate-v2");

test("repository V2 curriculum is internally consistent", () => {
  const result = validateV2(path.join(__dirname, "..", "v2"));
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.deepEqual([result.sections, result.units, result.lessons], [3, 6, 18]);
});
