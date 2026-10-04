#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const specPath = argValue("--spec");
const tier = argValue("--tier");
const localesArg = argValue("--locales");

if (!specPath || !localesArg) {
  console.error(
    "Usage: node create-lesson.js --spec <path> [--tier max] --locales <comma-separated-locales>",
  );
  process.exit(1);
}

if (tier && tier !== "max") {
  console.error(
    "Legacy --tier accepts max; it does not imply Max-only access. Omit it for editorial drafts.",
  );
  process.exit(1);
}

const requiredLocales = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const locales = localesArg
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
if (requiredLocales.join(",") !== locales.join(",")) {
  console.error(`Locales must be exactly: ${requiredLocales.join(",")}`);
  process.exit(1);
}

const root = process.cwd();
require("./scripts/maintenance-guard").assertWritesAllowed();
require("./scripts/education-format-policy").assertCurrentEducationOnly(root);
const spec = JSON.parse(fs.readFileSync(path.resolve(root, specPath), "utf8"));
const courseID = spec.course || "instrument-scales";
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(courseID))
  throw new Error("Invalid course slug");
const catalogPath = path.join(
  root,
  "v2/education/courses",
  courseID,
  "catalog.json",
);
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (/^(scale|harmony)-/.test(spec.id))
  throw new Error(
    "Foundation scale-/harmony- prefixes are reserved; author an editorial identity instead.",
  );
for (const field of ["id", "section", "unit"]) {
  if (!slug.test(spec[field])) throw new Error(`Invalid ${field} slug`);
}
if (spec.schema !== undefined && spec.schema !== 2)
  throw new Error("Only schema 2 lessons are supported");

const section = catalog.sections.find((entry) => entry.id === spec.section);
if (!section) throw new Error(`Section not found: ${spec.section}`);
const unit = section.units.find((entry) => entry.id === spec.unit);
if (!unit) throw new Error(`Unit not found: ${spec.unit}`);

const expectedBlocks = spec.body.en.blocks.length;
for (const locale of requiredLocales) {
  if (!spec.titles[locale] || !spec.summaries[locale])
    throw new Error(`Missing title/summary for ${locale}`);
  const body = spec.body[locale];
  if (!body) throw new Error(`Missing body for ${locale}`);
  if (body.blocks.length !== expectedBlocks)
    throw new Error(`Block mismatch for ${locale}`);
  if (!body.checkpoint) throw new Error(`Missing checkpoint for ${locale}`);
}

if (unit.lessons.some((lesson) => lesson.id === spec.id)) {
  throw new Error(`Lesson already exists: ${spec.id}`);
}

if (spec.optional === false)
  throw new Error(
    "Routine authors cannot expand the legacy mandatory sequence or enrollment spine.",
  );
const maintenance = path.join(
  require("node:os").homedir(),
  "Library/Application Support/MacMiniServer/scheduled-jobs/disk-maintenance/active.json",
);
if (fs.existsSync(maintenance))
  throw new Error("Disk maintenance is active; preserve checkpoint and wait.");
const order = unit.lessons.length + 1;
const { withLock, editorialDay } = require("./scripts/editorial-pipeline");
withLock(require("./scripts/source-inventory").defaultStateRoot(root), () => {
  const lessonDir = path.join(
    root,
    "editorial/candidates/legacy-drafts",
    courseID,
    "levels",
    section.level,
    "sections",
    spec.section,
    "units",
    spec.unit,
    "lessons",
    spec.id,
  );
  fs.mkdirSync(lessonDir, { recursive: true });
  const lessonPath = path.join(lessonDir, "lesson.md");
  const relativeLessonPath = path
    .relative(root, lessonPath)
    .replace(/\\/g, "/");

  const frontMatter = [
    "---",
    "schema: 2",
    `id: ${spec.id}`,
    `course: ${courseID}`,
    `level: ${section.level}`,
    `section: ${section.id}`,
    `unit: ${unit.id}`,
    `order: ${order}`,
    `revision: ${spec.revision || 1}`,
    `estimatedMinutes: ${spec.estimatedMinutes}`,
    `instrument: ${spec.instrument}`,
    ...requiredLocales.flatMap((locale) => [
      `title.${locale}: ${spec.titles[locale]}`,
    ]),
    ...requiredLocales.flatMap((locale) => [
      `summary.${locale}: ${spec.summaries[locale]}`,
    ]),
    "---",
    "",
    ":::localized",
    ...requiredLocales.flatMap((locale) => [
      `:::locale ${locale}`,
      `# ${spec.titles[locale]}`,
      "",
      ...spec.body[locale].blocks.flatMap((block) => [block, ""]),
      `:::checkpoint ${spec.body[locale].checkpoint}`,
      "",
    ]),
    ":::endlocalized",
    "",
  ];

  const sharedBlocks = spec.sharedBlocks.map((block, index) => {
    const content = block.content.trim();
    const source = /^id:/m.test(content)
      ? content
      : `id: ${spec.id}-exercise-${index + 1}\n${content}`;
    return `\`\`\`${block.type}\n${source}\n\`\`\``;
  });
  const markdown = `${frontMatter.join("\n")}\n${sharedBlocks.join("\n\n")}\n`;
  if (
    fs.existsSync(lessonPath) &&
    fs.readFileSync(lessonPath, "utf8") !== markdown
  )
    throw new Error(
      "Draft already exists with different bytes; reconcile item/revision before editing.",
    );
  fs.writeFileSync(lessonPath, markdown, "utf8");
  const digest = require("node:crypto")
    .createHash("sha256")
    .update(markdown)
    .digest("hex");
  const queuePath = path.join(root, "editorial/queue.json");
  const queue = fs.existsSync(queuePath)
    ? JSON.parse(fs.readFileSync(queuePath, "utf8"))
    : { schema: 1, revision: 1, dailyLimit: 3, items: [] };
  const itemID = spec.editorialItemID || `draft-${spec.id}`;
  if (!queue.items.some((i) => i.id === itemID)) {
    queue.items.push({
      id: itemID,
      type: "gap",
      objective: spec.summaries.en,
      instrument: spec.instrument,
      setup: spec.setup || { instrument: spec.instrument },
      unit: unit.id,
      source: relativeLessonPath,
      blueprintVersion: spec.blueprintVersion || 1,
      revision: spec.revision || 1,
      locales: requiredLocales,
      status: "open",
      stage: "draft",
      owner: spec.owner || "editorial-author",
      createdAt: editorialDay(),
      contentSHA256: digest,
      blueprintApproved: false,
      reviewEvidence: {},
    });
    queue.revision += 1;
    const temp = queuePath + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(queue, null, 2) + "\n");
    fs.renameSync(temp, queuePath);
  }
  console.log(
    `Authored candidate ${spec.id}; no catalog or enrollment spine changed. ${relativeLessonPath}`,
  );
});
