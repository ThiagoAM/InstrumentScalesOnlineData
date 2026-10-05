const { canonical } = require("./publishing-state");
const { sha } = require("./source-inventory");
const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const nonempty = (value) => typeof value === "string" && !!value.trim();
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function isStrictISODateTime(value) {
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] ||
      hour > 23 || minute > 59 || second > 59) return false;
  const zone = match[8];
  if (zone !== "Z" && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59)) return false;
  return Number.isFinite(Date.parse(value));
}
function assertOwnerRelease(approval, pathIDs) {
  const release = approval?.releaseApproval;
  const releaseKeys = ["status", "kind", "scope", "pathIDs", "approvalReference", "approvalStatement"].sort();
  if (approval?.basis !== "owner-release" || approval.kind !== "human" ||
      approval.playthrough !== "not-claimed" || !nonempty(approval.approvedBy) ||
      !isStrictISODateTime(approval.approvedAt) ||
      !release || !same(Object.keys(release).sort(), releaseKeys) ||
      release?.status !== "approved" || release.kind !== "human" ||
      release.scope !== "guided-pilot-release" || !nonempty(release.approvalReference) ||
      !nonempty(release.approvalStatement) || !Array.isArray(release.pathIDs) ||
      !release.pathIDs.length || release.pathIDs.some((id) => !nonempty(id)) ||
      new Set(release.pathIDs).size !== release.pathIDs.length ||
      pathIDs?.some((id) => !release.pathIDs.includes(id)))
    throw new Error("Path release requires the explicit scoped owner approval; physical playthrough must remain not-claimed.");
  return true;
}
function assertReviewApproval(approval, { allowOwnerRelease = false, pathIDs } = {}) {
  if (approval?.basis === "owner-release") {
    if (!allowOwnerRelease) throw new Error("Owner release approval applies only to its guided paths, never legacy repairs.");
    assertOwnerRelease(approval, pathIDs);
  } else if (approval?.kind !== "human" || !approval.approvedBy || !approval.approvedAt ||
      approval.playthrough !== "completed" || (approval.basis && approval.basis !== "human-playthrough")) {
    throw new Error("Promotion requires an explicit human playthrough record; agents cannot manufacture it.");
  }
  const independent = approval.independentReview, languages = approval.languages;
  if (independent?.status !== "approved" || !independent.reviewer || !independent.reviewedAt || independent.reviewer === approval.approvedBy)
    throw new Error("Independent content review is also required.");
  if (languages?.status !== "approved" || !languages.reviewer || !languages.reviewedAt ||
      (approval.basis === "owner-release" && LOCALES.some((locale) => !languages.locales?.includes(locale))))
    throw new Error("Six-language review is still pending.");
  if (approval.basis === "owner-release" &&
      (!nonempty(independent.reviewReference) || !nonempty(languages.reviewReference) ||
       !isStrictISODateTime(independent.reviewedAt) || !isStrictISODateTime(languages.reviewedAt) ||
       !same(independent.documentSHA256, approval.documentSHA256) ||
       !same(languages.documentSHA256, approval.documentSHA256)))
    throw new Error("Independent and six-language reviews must bind every exact owner-approved document.");
  return approval;
}
function candidateManifest(pathValue) {
  const candidate = structuredClone(pathValue); delete candidate.approval;
  candidate.publicationStatus = "review-pending"; candidate.humanPlaythrough = "pending";
  return candidate;
}
function manifestSHA(pathValue) { return sha(JSON.stringify(canonical(candidateManifest(pathValue)))); }
module.exports = { assertOwnerRelease, assertReviewApproval, candidateManifest, manifestSHA, same, isStrictISODateTime };
