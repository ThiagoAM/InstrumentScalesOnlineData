#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { sha, defaultStateRoot } = require("./source-inventory");
const { fields, patternFor, assertApprovedGuidedVariation } = require("./guided-variation");
const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const read = (file) => JSON.parse(fs.readFileSync(file));
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function listGaps(root) {
  const gaps = read(path.join(root, "editorial/guided-gaps.json")).gaps;
  const queue = read(path.join(root, "editorial/queue.json"));
  const index = read(path.join(root, "v2/education/paths.json"));
  return gaps.map((gap) => {
    const published = index.paths.find((p) => p.id === gap.pathID)?.units.some((u) => u.id === gap.unitID);
    const item = queue.items.find((i) => i.gapID === gap.id);
    return { ...gap, state: item ? "authored" : published ? "ready-for-authoring" : "awaiting-approved-unit", itemID: item?.id || null };
  });
}
function createGuidedLesson(root, stateRoot, gapID, spec) {
  require("./maintenance-guard").assertWritesAllowed();
  const api = require("./editorial-pipeline");
  return api.withLock(stateRoot, () => {
    const gap = read(path.join(root, "editorial/guided-gaps.json")).gaps.find((g) => g.id === gapID);
    if (!gap || gap.status !== "approved-for-authoring") throw new Error("Unknown or unapproved guided gap.");
    const blueprint = read(path.join(root, "editorial/blueprints.json")).blueprints.find((b) => b.id === gap.blueprintID);
    if (!blueprint || blueprint.version !== gap.blueprintVersion || blueprint.instrument !== gap.instrument || blueprint.unitID !== gap.unitID)
      throw new Error("Guided gap must bind its existing finite instrument blueprint.");
    const index = read(path.join(root, "v2/education/paths.json"));
    const course = index.paths.find((p) => p.id === gap.pathID), unit = course?.units.find((u) => u.id === gap.unitID);
    if (!unit || course.instrument !== gap.instrument) throw new Error("Routine cannot create a unit or change its instrument focus.");
    const queueFile = path.join(root, "editorial/queue.json"), queue = read(queueFile);
    if (!spec.author?.trim() || !slug.test(spec.id || "") || typeof spec.markdown !== "string") throw new Error("Spec requires a stable lesson id, identified author and complete authored Markdown.");
    const metadata = fields(spec.markdown);
    if (metadata.schema !== "2" || metadata.format !== "2" || metadata.id !== spec.id || metadata.course !== course.id ||
        metadata.unit !== unit.id || metadata.level !== unit.level || metadata.instrument !== course.instrument ||
        !/^[1-9]\d*$/.test(metadata.revision || "") || !/^[1-9]\d*$/.test(metadata.assessmentVersion || ""))
      throw new Error("Guided gap metadata must bind its actual path, unit, instrument, revision and assessment.");
    if (metadata["summary.en"] !== gap.objective) throw new Error("Author the approved gap objective; a different objective needs an editorial gap decision.");
    for (const locale of LOCALES)
      if (!metadata["title." + locale]?.trim() || !metadata["summary." + locale]?.trim()) throw new Error("Complete six-language titles and objectives are required.");
    const phases = [...spec.markdown.matchAll(/^:::step id=([a-z0-9-]+) phase=([a-z]+)$/gm)];
    if (["orient", "listen", "experiment", "practice", "transfer", "verify"].some((phase) => !phases.some((m) => m[2] === phase)) || new Set(phases.map((m) => m[1])).size !== phases.length)
      throw new Error("Author stable guided steps with objective, attempt, practice feedback and musical transfer.");
    const regions = [...spec.markdown.matchAll(/:::localized\n([\s\S]*?):::endlocalized/g)];
    if (regions.length < phases.length || regions.some((m) => LOCALES.some((l) => !new RegExp("^:::locale " + l + "\\n\\S", "m").test(m[1]))))
      throw new Error("Every guided step needs complete authored regions in all six locales.");
    require("./approved-assets").assertPathDocumentCompatible(spec.markdown);
    const relative = `editorial/candidates/guided/${course.instrument}/${unit.id}/${spec.id}/lesson.md`;
    const destination = path.join(root, relative), itemID = `guided-gap-${gapID}`;
    const existing = queue.items.find((i) => i.id === itemID || i.gapID === gapID);
    if (existing) {
      if (existing.contentSHA256 !== sha(spec.markdown) || existing.source !== relative || existing.owner !== spec.author)
        throw new Error("Gap already has a different authored attempt. Preserve its ID and use update-item/reselect for a reviewed revision.");
      if (!fs.existsSync(destination) || sha(fs.readFileSync(destination)) !== existing.contentSHA256)
        throw new Error("The existing gap candidate changed or disappeared; reconcile its actual bytes.");
      return existing;
    }
    if (index.paths.some((p) => p.units.some((u) => u.placements.some((l) => l.lessonID === spec.id))) || queue.items.some((i) => i.guidedTarget?.lessonID === spec.id))
      throw new Error("Guided lesson identity already exists.");
    const item = {
      id: itemID, gapID, type: "gap", role: "extra", objective: gap.objective, instrument: course.instrument,
      setup: course.setup, unit: unit.id, source: relative, blueprintID: gap.blueprintID, blueprintVersion: gap.blueprintVersion,
      blueprintApproved: true, revision: Number(metadata.revision), locales: LOCALES, status: "open", stage: "draft", owner: spec.author,
      createdAt: api.editorialDay(), contentSHA256: sha(spec.markdown), reviewEvidence: {},
      guidedTarget: { pathID: course.id, unitID: unit.id, lessonID: spec.id, role: "extra", spineVersion: course.spineVersion },
      publicationPolicy: spec.reuseApprovedPattern ? "exact-approved-pattern-and-independent-review" : "new-pattern-human-playthrough-required",
    };
    if (spec.reuseApprovedPattern) item.approvedPattern = patternFor(root, course.id, unit.id, gap.sourcePattern);
    if (item.approvedPattern) assertApprovedGuidedVariation(root, item, { authoring: true, authoredMarkdown: spec.markdown });
    if (fs.existsSync(destination) && sha(fs.readFileSync(destination)) !== item.contentSHA256) throw new Error("Existing candidate differs; reconcile rather than overwrite it.");
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, spec.markdown);
    queue.items.push(item); queue.revision += 1;
    api.atomicJSON(queueFile, queue);
    return item;
  });
}
if (require.main === module) {
  const args = process.argv.slice(2), value = (name) => args[args.indexOf(name) + 1];
  const root = process.env.EDITORIAL_REPOSITORY_ROOT || path.join(__dirname, "..");
  try {
    if (args.includes("--list-gaps")) console.log(JSON.stringify(listGaps(root), null, 2));
    else {
      if (!args.includes("--gap") || !args.includes("--spec")) throw new Error("Use --list-gaps, or --gap <id> --spec <authored-json>.");
      console.log(JSON.stringify(createGuidedLesson(root, defaultStateRoot(root), value("--gap"), read(path.resolve(value("--spec")))), null, 2));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { listGaps, createGuidedLesson };
