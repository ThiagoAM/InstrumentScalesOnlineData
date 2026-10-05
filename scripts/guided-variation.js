const fs = require("node:fs");
const path = require("node:path");
const { sha } = require("./source-inventory");
const { canonical } = require("./publishing-state");
const { isStrictISODateTime } = require("./path-release-approval");
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function fields(markdown) {
  const front = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!front) throw new Error("Guided document needs front matter.");
  return Object.fromEntries(front[1].split("\n").map((line) => line.match(/^([^:]+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
}
function patternSHA(markdown) {
  const blocks = [...markdown.matchAll(/```([^\n]+)\n([\s\S]*?)\n```/g)]
    .map((m) => [m[1], m[2].replace(/^id: .+$/gm, "id: <exercise>")]);
  if (!blocks.length) throw new Error("A reused guided pattern must contain actual musical exercises.");
  return sha(JSON.stringify(blocks));
}
function ownerBaseline(course) {
  let current = course, depth = 0;
  while (current.approval?.basis === "guided-extra-delta") {
    if (++depth > 128) throw new Error("Guided approval delta chain exceeds 128; reconcile it before authoring more extras.");
    current = current.approval.delta?.basePath;
    if (!current) throw new Error("Guided delta lacks its intact approval baseline.");
  }
  return current;
}
function approvedOrigin(root, pattern) {
  const index = JSON.parse(fs.readFileSync(path.join(root, "v2/education/paths.json")));
  const course = index.paths.find((p) => p.id === pattern.pathID);
  const unit = course?.units.find((u) => u.id === pattern.unitID);
  const placement = unit?.placements.find((p) => p.contentKey === pattern.contentKey);
  if (!placement || placement.source !== "guided") throw new Error("Approved pattern origin must be a published guided placement.");
  const file = path.resolve(root, "v2/education", placement.path);
  if (!file.startsWith(path.resolve(root, "v2/education/guided") + path.sep)) throw new Error("Unsafe approved pattern source.");
  const markdown = fs.readFileSync(file, "utf8");
  if (sha(markdown) !== pattern.documentSHA256 || patternSHA(markdown) !== pattern.patternSHA256)
    throw new Error("Approved pattern origin changed; review this proposal again.");
  const coordination = require("./coordinated-publication");
  const baseline = ownerBaseline(course);
  if (!same(course.setup, baseline.setup) || course.spineVersion !== baseline.spineVersion || course.instrument !== baseline.instrument)
    throw new Error("Approved origin instrument, setup and required spine cannot change for a variation.");
  if (sha(JSON.stringify(canonical(baseline.approval))) !== pattern.approvalSHA256)
    throw new Error("Approved pattern must bind its exact original public owner approval.");
  const registered = coordination.promotionRecords(root).find((record) => {
    if (!["path", "paths"].includes(record.kind) || record.status !== "promoted") return false;
    try {
      const approval = coordination.humanApproval(record);
      return approval.basis === "owner-release" && approval.releaseApproval?.scope === "guided-pilot-release" &&
        approval.releaseApproval.pathIDs.includes(pattern.pathID) && approval.documentSHA256?.[pattern.contentKey] === pattern.documentSHA256 &&
        record.publishedContentSHA256?.[path.relative(root, file)] === pattern.documentSHA256 &&
        (record.pathSHA256?.[pattern.pathID] || record.primarySHA256) === sha(JSON.stringify(canonical(baseline)));
    } catch { return false; }
  });
  if (!registered) throw new Error("Pattern reuse requires the registered, exact owner-approved pilot origin.");
  return { course, unit, placement, markdown };
}
function assertApprovedGuidedVariation(root, item, { authoring = false, authoredMarkdown = null } = {}) {
  if (!item.approvedPattern) return false;
  const origin = approvedOrigin(root, item.approvedPattern);
  const target = item.guidedTarget;
  if (item.type !== "gap" || item.role !== "extra" || target?.role !== "extra" || target.pathID !== origin.course.id ||
      target.unitID !== origin.unit.id || target.spineVersion !== origin.course.spineVersion || !same(item.setup, origin.course.setup))
    throw new Error("Pattern variation must preserve its instrument/setup, existing unit and required spine.");
  const markdown = authoredMarkdown || fs.readFileSync(path.join(root, item.source), "utf8"), metadata = fields(markdown), originalMetadata = fields(origin.markdown);
  if (metadata.format !== "2" || metadata.schema !== "2" || metadata.instrument !== origin.course.instrument ||
      metadata.requiredCapabilities !== originalMetadata.requiredCapabilities || patternSHA(markdown) !== item.approvedPattern.patternSHA256)
    throw new Error("New musical blocks, capabilities or physical setup require a new-pattern playthrough; they are not an approved variation.");
  if (metadata["summary.en"]?.trim() === originalMetadata["summary.en"]?.trim() || !item.objective?.trim())
    throw new Error("An optional variation needs a distinct substantive teaching objective; a repeated lesson is not a gap.");
  if (!authoring) {
    const review = item.reviewEvidence?.independent;
    if (review?.scope !== "approved-pattern-variation" || review.noNewPhysicalPattern !== true || review.substantiveObjective !== true ||
        review.patternSHA256 !== item.approvedPattern.patternSHA256 || review.originDocumentSHA256 !== item.approvedPattern.documentSHA256)
      throw new Error("Independent review must explicitly verify the distinct objective and absence of a new physical pattern.");
    const kinds = { parser: "source-parser", languages: "independent-language-review", independent: "independent-content-review" };
    for (const [gate, kind] of Object.entries(kinds)) {
      const evidence = item.reviewEvidence?.[gate];
      if (evidence?.kind !== kind || evidence.status !== "approved" || !evidence.reviewer || !isStrictISODateTime(evidence.reviewedAt) || evidence.contentSHA256 !== item.contentSHA256)
        throw new Error("Approved guided variation needs the known parser/review types, strict ISO8601 timestamps with timezone, and current content bytes.");
    }
    const reviewerIdentity = (value) => value.trim().toLowerCase();
    if (reviewerIdentity(item.reviewEvidence.languages.reviewer) === reviewerIdentity(item.owner) || reviewerIdentity(review.reviewer) === reviewerIdentity(item.owner))
      throw new Error("Guided variation music/language reviewers must be independent of its author.");
    if (item.reviewEvidence.languages.locales?.length !== 6 || ["en", "pt-BR", "es", "de", "ja", "zh-Hans"].some((locale) => !item.reviewEvidence?.languages?.locales?.includes(locale)))
      throw new Error("Approved pattern variations need an explicit independent review of all six locales.");
  }
  return true;
}
function patternFor(root, pathID, unitID, contentKey) {
  const index = JSON.parse(fs.readFileSync(path.join(root, "v2/education/paths.json")));
  const p = index.paths.find((entry) => entry.id === pathID), u = p?.units.find((entry) => entry.id === unitID);
  const placement = u?.placements.find((entry) => entry.contentKey === contentKey);
  if (!placement) throw new Error("Publish the approved blueprint/unit before authoring its guided gap.");
  const file = path.join(root, "v2/education", placement.path), markdown = fs.readFileSync(file, "utf8");
  const record = require("./coordinated-publication").promotionRecords(root).find((r) =>
    ["path", "paths"].includes(r.kind) && r.status === "promoted" && r.approval?.basis === "owner-release" &&
    r.approval?.documentSHA256?.[contentKey] === sha(markdown) && r.approval?.releaseApproval?.pathIDs.includes(pathID));
  if (!record) throw new Error("The proposed source pattern has no registered pilot approval.");
  const pattern = { pathID, unitID, contentKey, documentSHA256: sha(markdown), patternSHA256: patternSHA(markdown), approvalSHA256: sha(JSON.stringify(canonical(ownerBaseline(p).approval))) };
  approvedOrigin(root, pattern);
  return pattern;
}
module.exports = { fields, same, patternSHA, patternFor, ownerBaseline, approvedOrigin, assertApprovedGuidedVariation };
