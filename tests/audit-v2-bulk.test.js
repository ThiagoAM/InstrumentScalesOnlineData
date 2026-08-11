const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  BANNED_PHRASES,
  MAX_REPEATED_ENGLISH_FOUR_WORD_PHRASE,
  MAX_REPEATED_ENGLISH_SIX_WORD_PHRASE,
  MAX_REPEATED_ENGLISH_SENTENCE_STEM,
  MAX_REPEATED_EXPANSION_SENTENCE,
  REQUIRED_LOCALES,
  auditV2Bulk,
  englishSentenceStem,
  harmonyTargetLabel,
  normalizedSentenceSignatures,
  targetOccurrences,
} = require("../scripts/audit-v2-bulk");

const repositoryV2 = path.join(__dirname, "..", "v2");

function prose(locale, marker, units = 110) {
  if (locale === "ja" || locale === "zh-Hans") {
    return (`${marker}${"音".repeat(units * 2)}`.match(/.{1,60}/gu) || []).join("。");
  }
  const words = Array.from({ length: units }, (_, index) => `${marker}${index + 1}`);
  const sentences = [];
  for (let index = 0; index < words.length; index += 20) {
    sentences.push(`${words.slice(index, index + 20).join(" ")}.`);
  }
  return sentences.join(" ");
}

function localized(value) {
  return Object.fromEntries(REQUIRED_LOCALES.map((locale) => [locale, `${value} ${locale}`]));
}

function lessonMarkdown(lesson, overrides = {}) {
  const fields = {
    schema: "2",
    id: lesson.id,
    course: "test-course",
    level: "beginner",
    section: "beginner",
    unit: lesson.unit ?? "first-unit",
    order: String(lesson.order),
    revision: String(overrides.revision ?? 1),
    estimatedMinutes: String(overrides.estimatedMinutes ?? lesson.estimatedMinutes),
    instrument: overrides.instrument ?? lesson.instrument,
  };
  const header = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  for (const locale of REQUIRED_LOCALES) {
    header.push(`title.${locale}: ${overrides.titles?.[locale] ?? lesson.titles[locale]}`);
    header.push(`summary.${locale}: ${overrides.summaries?.[locale] ?? lesson.summaries[locale]}`);
  }
  const bodies = REQUIRED_LOCALES.map((locale) => {
    const checkpoint = overrides.missingCheckpoint === locale
      ? ""
      : `\n\n:::checkpoint Finish the ${locale} check.`;
    const source = overrides.bodies?.[locale] ?? prose(locale, `${lesson.id}-${locale}-`);
    return `:::locale ${locale}\n# ${lesson.titles[locale]}\n\n${source}${checkpoint}`;
  }).join("\n");
  return `---\n${header.join("\n")}\n---\n\n:::localized\n${bodies}\n:::endlocalized\n\n\`\`\`scale\nid: exercise-${lesson.id}\ntitle: ${overrides.fenceTitle ?? "C · 1–2–3–4–5"}\nroot: C\nscale: Major\ndegrees: 1 2 3 4 5\n\`\`\`\n`;
}

function makeTree({ lessonCount = 1, lessonOverrides = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bulk-v2-audit-"));
  const courseRoot = path.join(root, "education", "courses", "test-course");
  const lessons = [];
  for (let index = 0; index < lessonCount; index += 1) {
    const id = `new-lesson-${index + 1}`;
    lessons.push({
      id,
      order: index + 1,
      estimatedMinutes: 6,
      activity: "guided-practice",
      instrument: "adaptive",
      optional: true,
      titles: localized(`Title ${index + 1}`),
      summaries: localized(`Summary ${index + 1}`),
      path: `levels/beginner/sections/beginner/units/first-unit/lessons/${id}/lesson.md`,
    });
  }
  const catalog = {
    schema: 2,
    course: "test-course",
    revision: 1,
    sections: [{
      id: "beginner",
      level: "beginner",
      order: 1,
      titles: localized("Beginner"),
      summaries: localized("Begin here"),
      theme: "sparkles",
      units: [{
        id: "first-unit",
        order: 1,
        titles: localized("First unit"),
        summaries: localized("Start here"),
        theme: "music.note",
        lessons,
      }],
    }],
  };
  fs.mkdirSync(courseRoot, { recursive: true });
  fs.writeFileSync(path.join(courseRoot, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
  for (const lesson of lessons) {
    const lessonPath = path.join(courseRoot, lesson.path);
    fs.mkdirSync(path.dirname(lessonPath), { recursive: true });
    fs.writeFileSync(lessonPath, lessonMarkdown(lesson, lessonOverrides[lesson.id]));
  }
  return { root, courseRoot, catalog, lessons };
}

function messages(result) {
  return result.errors.map((error) => error.message).join("\n");
}

test("real repository passes the focused bulk audit", () => {
  const result = auditV2Bulk(repositoryV2, { checkRevisionOne: false });
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.lessons, 688);
});

test("valid revision-one lesson passes and checks all locale bodies", () => {
  const fixture = makeTree();
  const result = auditV2Bulk(fixture.root);
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.lengthChecked, 6);
});

test("catalog metadata must match lesson front matter", () => {
  const fixture = makeTree({
    lessonOverrides: {
      "new-lesson-1": {
        estimatedMinutes: 7,
        instrument: "piano",
        titles: { en: "Different title" },
        summaries: { es: "Otro resumen" },
      },
    },
  });
  fixture.catalog.sections[0].units[0].lessons[0].instrument = "guitar";
  fs.writeFileSync(
    path.join(fixture.courseRoot, "catalog.json"),
    `${JSON.stringify(fixture.catalog, null, 2)}\n`
  );
  const output = messages(auditV2Bulk(fixture.root));
  assert.match(output, /estimatedMinutes does not match catalog/);
  assert.match(output, /instrument does not match catalog/);
  assert.match(output, /title\.en does not match catalog/);
  assert.match(output, /summary\.es does not match catalog/);
});

test("every locale body needs its own checkpoint", () => {
  const fixture = makeTree({
    lessonOverrides: { "new-lesson-1": { missingCheckpoint: "de" } },
  });
  assert.match(messages(auditV2Bulk(fixture.root)), /Missing localized checkpoint for de/);
});

test("orphan lesson markdown fails", () => {
  const fixture = makeTree();
  const orphan = path.join(fixture.courseRoot, "levels", "beginner", "orphan", "lesson.md");
  fs.mkdirSync(path.dirname(orphan), { recursive: true });
  fs.writeFileSync(orphan, "orphan");
  assert.match(messages(auditV2Bulk(fixture.root)), /Orphan lesson\.md/);
});

test("localized lesson titles and summaries must be unique within a section", () => {
  const fixture = makeTree({ lessonCount: 2 });
  const [first, second] = fixture.catalog.sections[0].units[0].lessons;
  second.titles.en = `  ${first.titles.en.toUpperCase()}  `;
  second.summaries.ja = first.summaries.ja;
  fs.writeFileSync(
    path.join(fixture.courseRoot, "catalog.json"),
    `${JSON.stringify(fixture.catalog, null, 2)}\n`
  );
  const output = messages(auditV2Bulk(fixture.root));
  assert.match(output, /duplicates new-lesson-1 titles\.en within section beginner/);
  assert.match(output, /duplicates new-lesson-1 summaries\.ja within section beginner/);
});

test("expansion metadata rejects accidental adjacent word duplication", () => {
  const fixture = makeTree();
  const lesson = fixture.catalog.sections[0].units[0].lessons[0];
  lesson.summaries.en = "Hear hear the changed third.";
  fs.writeFileSync(
    path.join(fixture.courseRoot, "catalog.json"),
    `${JSON.stringify(fixture.catalog, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(fixture.courseRoot, lesson.path),
    lessonMarkdown(lesson, { summaries: { en: lesson.summaries.en } })
  );
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(output, /summaries\.en repeats adjacent word\(s\): hear/);

  const musical = makeTree();
  const musicalLesson = musical.catalog.sections[0].units[0].lessons[0];
  musicalLesson.summaries.en = "Compare attack–attack with IV – IV motion.";
  fs.writeFileSync(
    path.join(musical.courseRoot, "catalog.json"),
    `${JSON.stringify(musical.catalog, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(musical.courseRoot, musicalLesson.path),
    lessonMarkdown(musicalLesson, { summaries: { en: musicalLesson.summaries.en } })
  );
  assert.doesNotMatch(
    messages(auditV2Bulk(musical.root, { expansionPrefixes: ["new-"] })),
    /summaries\.en repeats adjacent word/
  );
});

test("conservative cliché phrases fail", () => {
  assert.deepEqual(BANNED_PHRASES, [
    "dive into", "unlock your", "musical journey", "game-changer",
    "master the art", "world of", "ten short studies make", "one clear goal",
    "working example:", "apply the idea to", "hear the result in",
    "has a practical purpose:", "for the material “", "only after two takes of",
    "write down the earliest unstable event",
    "directly testing this principle:", "as the audible check", "fixed-do do",
    "dó fixo dó", "do fijo do", "固定ドド",
  ]);
  const fixture = makeTree({
    lessonOverrides: {
      "new-lesson-1": {
        bodies: { en: `${prose("en", "specific-")} Dive into a world of generic filler.` },
      },
    },
  });
  const output = messages(auditV2Bulk(fixture.root));
  assert.match(output, /banned cliché phrase "dive into"/);
  assert.match(output, /banned cliché phrase "world of"/);
});

test("bulk copy cannot reuse the same instructional sentence across units", () => {
  const repeated = "Keep the pulse steady while you listen for the one note that changes the result.";
  const repeatedChinese = "保持脉搏稳定，同时聆听改变结果的那个音。";
  const lessonCount = MAX_REPEATED_EXPANSION_SENTENCE + 1;
  const lessonOverrides = Object.fromEntries(Array.from({ length: lessonCount }, (_, index) => [
    `new-lesson-${index + 1}`,
    {
      bodies: {
        en: `${repeated} ${prose("en", `specific-${index}-`, 110)}`,
        "zh-Hans": `${repeatedChinese}${prose("zh-Hans", `具体${index}`, 110)}`,
      },
    },
  ]));
  const fixture = makeTree({ lessonCount, lessonOverrides });
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(output, new RegExp(`en expansion sentence repeats in ${lessonCount} lessons`));
  assert.match(output, new RegExp(`zh-Hans expansion sentence repeats in ${lessonCount} lessons`));
});

test("sentence signatures normalize substituted unit and focus labels", () => {
  const alpha = normalizedSentenceSignatures(
    "In Alpha Unit, use Bright Landing as the audible test for this pass.",
    "en",
    [
      { value: "Alpha Unit", token: "<unit>" },
      { value: "Bright Landing", token: "<focus>" },
    ]
  )[0].signature;
  const beta = normalizedSentenceSignatures(
    "In Beta Unit, use Quiet Release as the audible test for this pass.",
    "en",
    [
      { value: "Beta Unit", token: "<unit>" },
      { value: "Quiet Release", token: "<focus>" },
    ]
  )[0].signature;
  assert.equal(alpha, beta);
});

test("English sentence stems normalize musical substitutions", () => {
  assert.equal(englishSentenceStem("Set 72 BPM before playing Cmaj7."), "set <number>");
  assert.equal(englishSentenceStem("Set 96 BPM before playing Dm7."), "set <number>");
});

test("bulk expansion copy must vary its instructional openings", () => {
  assert.equal(MAX_REPEATED_ENGLISH_FOUR_WORD_PHRASE, 80);
  const lessonCount = MAX_REPEATED_ENGLISH_SENTENCE_STEM + 1;
  const lessonOverrides = Object.fromEntries(Array.from({ length: lessonCount }, (_, index) => [
    `new-lesson-${index + 1}`,
    {
      bodies: {
        en: `Begin the practice by naming one concrete musical difference before playing. ${prose("en", `stem-${index}-`, 110)}`,
      },
    },
  ]));
  const fixture = makeTree({ lessonCount, lessonOverrides });
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(
    output,
    new RegExp(`English expansion sentence opening "begin the" appears ${lessonCount} times \\(maximum ${MAX_REPEATED_ENGLISH_SENTENCE_STEM}\\)`)
  );
  assert.match(
    output,
    new RegExp(`English expansion 4-word phrase "begin the practice by" appears in ${lessonCount} lessons`)
  );
});

test("bulk expansion copy cannot hide a repeated phrase inside varied sentences", () => {
  assert.equal(MAX_REPEATED_ENGLISH_SIX_WORD_PHRASE, 12);
  const uniqueWords = [
    "amber", "birch", "cobalt", "dahlia", "elm", "flint", "garnet",
    "hazel", "indigo", "juniper", "kelp", "linen", "maple",
  ];
  const lessonOverrides = Object.fromEntries(uniqueWords.map((word, index) => [
    `new-lesson-${index + 1}`,
    {
      bodies: Object.fromEntries(REQUIRED_LOCALES.map((locale) => [
        locale,
        locale === "en"
          ? `Notice the exact boundary before repairing the ${word} result. ${prose(locale, `${word}-`, 115)}`
          : prose(locale, `固有${index}`, 125),
      ])),
    },
  ]));
  const fixture = makeTree({ lessonCount: uniqueWords.length, lessonOverrides });
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(
    output,
    /English expansion 6-word phrase "notice the exact boundary before repairing" appears in 13 lessons/
  );
});

test("expansion prose cannot stuff the unit title into stock sentences", () => {
  const fixture = makeTree({
    lessonOverrides: {
      "new-lesson-1": {
        bodies: {
          en: `${prose("en", "specific-", 110)} First unit en begins here. First unit en continues here. First unit en ends here.`,
        },
      },
    },
  });
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(output, /en prose repeats the unit title 3 times \(maximum 2\)/);
});

test("expansion prose cannot repeat its focus label as padding", () => {
  const fixture = makeTree({
    lessonOverrides: {
      "new-lesson-1": {
        bodies: {
          en: `${prose("en", "specific-", 110)} Title 1 en starts here. Title 1 en is checked here. Title 1 en ends here.`,
        },
      },
    },
  });
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(output, /en prose repeats the lesson focus 3 times \(maximum 2\)/);
});

test("harmony targets are extracted from localized action titles", () => {
  assert.equal(harmonyTargetLabel("Build C–E–G", "en"), "C–E–G");
  assert.equal(harmonyTargetLabel("Toma prestado bVII", "pt-BR"), "bVII");
  assert.equal(harmonyTargetLabel("Empreste iv", "pt-BR"), "iv");
  assert.equal(harmonyTargetLabel("C–E–Gを組み立てる", "ja"), "C–E–G");
  assert.equal(harmonyTargetLabel("比较C增三和弦 / C大三和弦", "zh-Hans"), "C增三和弦 / C大三和弦");
  assert.equal(
    targetOccurrences("The card recognizes C, then closes the cadence.", "C", "en"),
    1
  );
});

test("near-duplicate English expansion bodies fail even when metadata differs", () => {
  const vocabulary = [
    "anchor", "breathe", "center", "decide", "even", "finger", "gesture", "hold",
    "inside", "join", "keep", "land", "measure", "notice", "open", "place", "quiet",
    "release", "steady", "touch", "upward", "vary", "wait", "exact", "yield", "zone",
  ].join(" ");
  const shared = Array.from({ length: 5 }, () => vocabulary).join(" ");
  const fixture = makeTree({
    lessonCount: 2,
    lessonOverrides: {
      "new-lesson-1": { bodies: { en: shared } },
      "new-lesson-2": { bodies: { en: shared } },
    },
  });
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(output, /English expansion prose is 100% similar to new-lesson-1/);
});

test("expansion copy cannot hide templates inside long run-on sentences", () => {
  const runOn = Array.from({ length: 50 }, (_, index) => `instruction${index + 1}`).join(" ");
  const fixture = makeTree({
    lessonOverrides: { "new-lesson-1": { bodies: { en: `${runOn}. ${prose("en", "specific-", 75)}` } } },
  });
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(output, /en instructional sentence has 50 prose units \(maximum 45\); split the run-on/);
});

test("Japanese and Chinese expansion copy cannot leak English instructions", () => {
  const fixture = makeTree({
    lessonOverrides: {
      "new-lesson-1": {
        bodies: {
          ja: `${prose("ja", "固有", 110)} Compare the oblique outer voices.`,
          "zh-Hans": `${prose("zh-Hans", "具体", 110)} count changes under top F`,
        },
      },
    },
  });
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(output, /ja copy contains untranslated English instructional word\(s\): compare, oblique, outer, voices/);
  assert.match(output, /zh-Hans copy contains untranslated English instructional word\(s\): count, changes, under, top/);
});

test("expansion exercise cards use locale-neutral titles", () => {
  const fixture = makeTree({
    lessonOverrides: { "new-lesson-1": { fenceTitle: "Title 1 en" } },
  });
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(output, /Playable fence repeats the English lesson title/);
});

test("prose range preserves published revision one and tightens expansion prefixes", () => {
  const revisionOne = makeTree({
    lessonOverrides: {
      "new-lesson-1": { bodies: { en: prose("en", "short-", 99), es: prose("es", "long-", 181) } },
    },
  });
  let output = messages(auditV2Bulk(revisionOne.root));
  assert.match(output, /en body has 99 prose units/);
  assert.match(output, /es body has 181 prose units/);

  const published = makeTree({
    lessonOverrides: {
      "new-lesson-1": { revision: 2, bodies: { en: prose("en", "short-", 20) } },
    },
  });
  assert.doesNotMatch(messages(auditV2Bulk(published.root)), /prose units/);
  output = messages(auditV2Bulk(published.root, {
    checkRevisionOne: false,
    expansionPrefixes: ["new-"],
  }));
  assert.match(output, /en body has 20 prose units/);
  assert.match(output, /requires 120 through 180/);
});

test("expansion lessons stay within the eight-minute ceiling", () => {
  const fixture = makeTree();
  const lesson = fixture.catalog.sections[0].units[0].lessons[0];
  lesson.estimatedMinutes = 9;
  fs.writeFileSync(
    path.join(fixture.courseRoot, "catalog.json"),
    `${JSON.stringify(fixture.catalog, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(fixture.courseRoot, lesson.path),
    lessonMarkdown(lesson, { estimatedMinutes: 9 })
  );
  const output = messages(auditV2Bulk(fixture.root, { expansionPrefixes: ["new-"] }));
  assert.match(output, /Expansion lesson is estimated at 9 minutes \(maximum 8\)/);
});
