#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const specPath = argValue('--spec');
const tier = argValue('--tier');
const localesArg = argValue('--locales');

if (!specPath || !tier || !localesArg) {
  console.error('Usage: node create-lesson.js --spec <path> --tier <tier> --locales <comma-separated-locales>');
  process.exit(1);
}

if (tier !== 'max') {
  console.error('This repo helper only supports --tier max.');
  process.exit(1);
}

const requiredLocales = ['en', 'pt-BR', 'es', 'de', 'ja', 'zh-Hans'];
const locales = localesArg.split(',').map((item) => item.trim()).filter(Boolean);
if (requiredLocales.join(',') !== locales.join(',')) {
  console.error(`Locales must be exactly: ${requiredLocales.join(',')}`);
  process.exit(1);
}

const root = process.cwd();
const spec = JSON.parse(fs.readFileSync(path.resolve(root, specPath), 'utf8'));
const catalogPath = path.join(root, 'v2/education/courses/instrument-scales/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const section = catalog.sections.find((entry) => entry.id === spec.section);
if (!section) throw new Error(`Section not found: ${spec.section}`);
const unit = section.units.find((entry) => entry.id === spec.unit);
if (!unit) throw new Error(`Unit not found: ${spec.unit}`);

const expectedBlocks = spec.body.en.blocks.length;
for (const locale of requiredLocales) {
  if (!spec.titles[locale] || !spec.summaries[locale]) throw new Error(`Missing title/summary for ${locale}`);
  const body = spec.body[locale];
  if (!body) throw new Error(`Missing body for ${locale}`);
  if (body.blocks.length !== expectedBlocks) throw new Error(`Block mismatch for ${locale}`);
  if (!body.checkpoint) throw new Error(`Missing checkpoint for ${locale}`);
}

if (unit.lessons.some((lesson) => lesson.id === spec.id)) {
  throw new Error(`Lesson already exists: ${spec.id}`);
}

const order = unit.lessons.length + 1;
const lessonDir = path.join(root, 'v2/education/courses/instrument-scales/sections', spec.section, 'units', spec.unit, 'lessons', spec.id);
fs.mkdirSync(lessonDir, { recursive: true });
const lessonPath = path.join(lessonDir, 'lesson.md');
const relativeLessonPath = path.relative(root, lessonPath).replace(/\\/g, '/');

const frontMatter = [
  '---',
  'schema: 2',
  `id: ${spec.id}`,
  'course: instrument-scales',
  `level: ${section.level}`,
  `section: ${section.id}`,
  `unit: ${unit.id}`,
  `order: ${order}`,
  'revision: 1',
  `estimatedMinutes: ${spec.estimatedMinutes}`,
  `instrument: ${spec.instrument}`,
  ...requiredLocales.flatMap((locale) => [`title.${locale}: ${spec.titles[locale]}`]),
  ...requiredLocales.flatMap((locale) => [`summary.${locale}: ${spec.summaries[locale]}`]),
  '---',
  '',
  ':::localized',
  ...requiredLocales.flatMap((locale) => [
    `:::locale ${locale}`,
    `# ${spec.titles[locale]}`,
    '',
    ...spec.body[locale].blocks.flatMap((block) => [block, '']),
    `:::checkpoint ${spec.body[locale].checkpoint}`,
    ''
  ]),
  ':::endlocalized',
  ''
];

const sharedBlocks = spec.sharedBlocks.map((block) => `\`\`\`${block.type}\n${block.content.trim()}\n\`\`\``);
fs.writeFileSync(lessonPath, `${frontMatter.join('\n')}\n${sharedBlocks.join('\n\n')}\n`, 'utf8');

unit.lessons.push({
  id: spec.id,
  order,
  estimatedMinutes: spec.estimatedMinutes,
  activity: spec.activity,
  instrument: spec.instrument,
  optional: spec.optional,
  titles: spec.titles,
  summaries: spec.summaries,
  path: relativeLessonPath.replace(/^v2\/education\/courses\/instrument-scales\//, '')
});

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(`Created ${spec.id} at order ${order}`);
