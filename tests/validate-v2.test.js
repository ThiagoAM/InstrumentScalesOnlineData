const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { ACCEPTED_FENCES, REQUIRED_LOCALES, validateV2 } = require("../scripts/validate-v2");

const repositoryV2 = path.join(__dirname, "..", "v2");
const translations = {
  en: "Play the phrase slowly and listen for the note that feels settled. Keep an even pulse, notice the tension before the ending, then repeat the line and name the musical detail that guided your ear.",
  "pt-BR": "Toque a frase devagar e escute a nota que parece repousar. Mantenha a pulsação regular, perceba a tensão antes do final, repita a linha e dê um nome ao detalhe musical que orientou seu ouvido.",
  es: "Toca la frase despacio y escucha la nota que parece estable. Mantén un pulso regular, percibe la tensión antes del final, repite la línea y nombra el detalle musical que orientó tu oído.",
  de: "Spiele die Phrase langsam und höre auf den Ton, der ruhig wirkt. Halte den Puls gleichmäßig, beachte die Spannung vor dem Ende, wiederhole die Linie und benenne das musikalische Detail, das dein Ohr geführt hat.",
  ja: "フレーズをゆっくり演奏し、落ち着いて聞こえる音を探します。一定の拍を保ち、終わりの前に生まれる緊張を感じてください。もう一度同じ流れを演奏し、耳の手がかりになった音の動きを自分の言葉で説明しましょう。音を急がず、一つずつ丁寧に比べることが大切です。",
  "zh-Hans": "缓慢弹奏这个乐句，寻找听起来最稳定的音。保持均匀节拍，注意结尾之前产生的张力。再次弹奏同一条旋律，并用自己的话说出引导听觉的音乐细节。不要匆忙，让每个音都清楚出现，再比较返回主音前后的感觉。",
};

function localized(value) {
  return Object.fromEntries(REQUIRED_LOCALES.map((locale) => [locale, `${value} ${locale}`]));
}

function lessonMarkdown(overrides = {}) {
  const fields = {
    schema: "2", id: "first-lesson", course: "test-course", level: "beginner",
    section: "beginner", unit: "first-unit", order: "1", revision: "1",
    estimatedMinutes: "6", instrument: "adaptive",
    ...overrides.fields,
  };
  const metadata = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  for (const locale of REQUIRED_LOCALES) {
    metadata.push(`title.${locale}: First lesson ${locale}`);
    metadata.push(`summary.${locale}: Learn the phrase ${locale}`);
  }
  const bodies = overrides.bodies ?? translations;
  const localizedBody = REQUIRED_LOCALES
    .map((locale) => `:::locale ${locale}\n# First lesson\n${bodies[locale] ?? ""}\n:::checkpoint Play it cleanly.`)
    .join("\n");
  return `---\n${metadata.join("\n")}\n---\n\n:::localized\n${localizedBody}\n:::endlocalized\n\n${overrides.fence ?? "```scale\nid: first-scale\nroot: C\nscale: Major\ntempo: 72\ndegrees: 1 2 3\n```"}\n`;
}

function makeTree({ lessonCount = 1 } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "scales-v2-"));
  const courseRoot = path.join(root, "education", "courses", "test-course");
  fs.mkdirSync(courseRoot, { recursive: true });
  fs.writeFileSync(path.join(courseRoot, "course.json"), `${JSON.stringify({
    schema: 2, id: "test-course", revision: 1, titles: localized("Test course"),
    levels: ["beginner", "intermediate", "advanced"],
  }, null, 2)}\n`);
  const lessons = [];
  for (let index = 0; index < lessonCount; index += 1) {
    const id = index === 0 ? "first-lesson" : `lesson-${index + 1}`;
    const lessonPath = `levels/beginner/sections/beginner/units/first-unit/lessons/${id}/lesson.md`;
    lessons.push({
      id, order: index + 1, estimatedMinutes: 6, activity: "guided-practice",
      instrument: "adaptive", optional: index > 0, titles: localized(id), summaries: localized(`Summary ${id}`),
      path: lessonPath,
    });
    fs.mkdirSync(path.dirname(path.join(courseRoot, lessonPath)), { recursive: true });
    fs.writeFileSync(path.join(courseRoot, lessonPath), lessonMarkdown({
      fields: { id, order: String(index + 1) },
      bodies: Object.fromEntries(REQUIRED_LOCALES.map((locale) => [
        locale, `${translations[locale]} Variation ${index + 1} keeps this lesson distinct.`,
      ])),
    }));
  }
  const catalog = {
    schema: 2, course: "test-course", revision: 1,
    sections: [{
      id: "beginner", level: "beginner", order: 1, titles: localized("Beginner"),
      summaries: localized("Begin here"), theme: "sparkles",
      units: [{
        id: "first-unit", order: 1, titles: localized("First unit"), summaries: localized("Start here"),
        theme: "music.note", lessons,
      }],
    }],
  };
  const catalogPath = path.join(courseRoot, "catalog.json");
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return { root, courseRoot, catalogPath, catalog };
}

function messages(result) {
  return result.errors.map((error) => error.message).join("\n");
}

test("exports the complete playable fence set", () => {
  assert.deepEqual(ACCEPTED_FENCES, ["scale", "notes", "fretboard", "quiz", "compare", "chord", "progression", "listen", "tap"]);
});

test("valid nested tree passes", () => {
  const fixture = makeTree();
  const result = validateV2(fixture.root, { strictLocales: true });
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.lessons, 1);
});

test("bad nested path shape fails", () => {
  const fixture = makeTree();
  fixture.catalog.sections[0].units[0].lessons[0].path = "levels/beginner/first-lesson/lesson.md";
  fs.writeFileSync(fixture.catalogPath, JSON.stringify(fixture.catalog));
  assert.match(messages(validateV2(fixture.root)), /must use path/);
});

test("missing locale fails", () => {
  const fixture = makeTree();
  delete fixture.catalog.sections[0].units[0].lessons[0].titles.ja;
  fs.writeFileSync(fixture.catalogPath, JSON.stringify(fixture.catalog));
  assert.match(messages(validateV2(fixture.root, { strictLocales: true })), /titles\.ja/);
});

test("duplicate lesson id fails course-wide", () => {
  const fixture = makeTree({ lessonCount: 2 });
  fixture.catalog.sections[0].units[0].lessons[1].id = "first-lesson";
  fs.writeFileSync(fixture.catalogPath, JSON.stringify(fixture.catalog));
  assert.match(messages(validateV2(fixture.root)), /Duplicate lesson id/);
});

test("non-contiguous order fails", () => {
  const fixture = makeTree({ lessonCount: 2 });
  fixture.catalog.sections[0].units[0].lessons[1].order = 3;
  fs.writeFileSync(fixture.catalogPath, JSON.stringify(fixture.catalog));
  assert.match(messages(validateV2(fixture.root)), /order values must be contiguous/);
});

test("missing playable fence fails", () => {
  const fixture = makeTree();
  const lessonPath = path.join(fixture.courseRoot, fixture.catalog.sections[0].units[0].lessons[0].path);
  fs.writeFileSync(lessonPath, lessonMarkdown({ fence: "A plain closing paragraph." }));
  assert.match(messages(validateV2(fixture.root)), /at least one playable fence/);
});

test("unterminated fence fails", () => {
  const fixture = makeTree();
  const lessonPath = path.join(fixture.courseRoot, fixture.catalog.sections[0].units[0].lessons[0].path);
  fs.writeFileSync(lessonPath, lessonMarkdown({ fence: "```scale\nid: broken" }));
  assert.match(messages(validateV2(fixture.root)), /Unterminated scale fence/);
});

test("duplicate localized body is strict-locale slop", () => {
  const fixture = makeTree({ lessonCount: 2 });
  const second = fixture.catalog.sections[0].units[0].lessons[1];
  const secondPath = path.join(fixture.courseRoot, second.path);
  fs.writeFileSync(secondPath, lessonMarkdown({ fields: { id: second.id, order: "2" } }));
  const firstPath = path.join(fixture.courseRoot, fixture.catalog.sections[0].units[0].lessons[0].path);
  fs.writeFileSync(firstPath, lessonMarkdown());
  assert.match(messages(validateV2(fixture.root, { strictLocales: true })), /body duplicates/);
  assert.doesNotMatch(messages(validateV2(fixture.root, { strictLocales: false })), /body duplicates/);
});

test("heading-only localized body fails the prose floor", () => {
  const fixture = makeTree();
  const lessonPath = path.join(fixture.courseRoot, fixture.catalog.sections[0].units[0].lessons[0].path);
  fs.writeFileSync(lessonPath, lessonMarkdown({ bodies: { ...translations, en: "" } }));
  assert.match(messages(validateV2(fixture.root)), /en body has fewer than 30 prose words/);
});

test("title interpolation cannot hide duplicate lesson templates", () => {
  const fixture = makeTree({ lessonCount: 2 });
  for (const lesson of fixture.catalog.sections[0].units[0].lessons) {
    const lessonPath = path.join(fixture.courseRoot, lesson.path);
    const bodies = Object.fromEntries(REQUIRED_LOCALES.map((locale) => [
      locale, `${lesson.titles[locale]} ${translations[locale]}`,
    ]));
    fs.writeFileSync(lessonPath, lessonMarkdown({
      fields: { id: lesson.id, order: String(lesson.order) }, bodies,
    }));
  }
  assert.match(messages(validateV2(fixture.root)), /body duplicates/);
});

test("metadata interpolation cannot hide duplicate prose paragraphs", () => {
  const fixture = makeTree({ lessonCount: 2 });
  for (const lesson of fixture.catalog.sections[0].units[0].lessons) {
    const lessonPath = path.join(fixture.courseRoot, lesson.path);
    const bodies = Object.fromEntries(REQUIRED_LOCALES.map((locale) => [
      locale,
      `${translations[locale]} Distinct opening for ${lesson.id}.\n\n` +
        `Turn ${lesson.summaries[locale]} into a repeatable test for ${lesson.titles[locale]}. ` +
        "Between passes, identify the exact musical event that needs attention, repair it in " +
        "isolation, reconnect the surrounding measure, and confirm the result twice.",
    ]));
    fs.writeFileSync(lessonPath, lessonMarkdown({
      fields: { id: lesson.id, order: String(lesson.order) }, bodies,
    }));
  }
  assert.match(messages(validateV2(fixture.root)), /prose paragraph duplicates/);
});

test("CJK prose length uses characters instead of whitespace", () => {
  const fixture = makeTree();
  const lessonPath = path.join(fixture.courseRoot, fixture.catalog.sections[0].units[0].lessons[0].path);
  fs.writeFileSync(lessonPath, lessonMarkdown());
  assert.doesNotMatch(messages(validateV2(fixture.root)), /(?:ja|zh-Hans) body has fewer than 30/);
});

test("musical notation symbols do not count against the emoji budget", () => {
  const fixture = makeTree();
  const lessonPath = path.join(fixture.courseRoot, fixture.catalog.sections[0].units[0].lessons[0].path);
  fs.writeFileSync(lessonPath, lessonMarkdown({
    bodies: {
      ...translations,
      en: `${translations.en} Resolve F♯ to E, compare F♯ with F, and play F♯ once more. ` +
        "Read the supplementary musical symbols 𝄞 𝄢 𝄡 as notation, not decoration.",
    },
  }));
  const result = validateV2(fixture.root);
  assert.doesNotMatch(
    result.warnings.map((warning) => warning.message).join("\n"),
    /emoji hype budget/
  );
});

test("decorative emoji still count against the hype budget", () => {
  const fixture = makeTree();
  const lessonPath = path.join(fixture.courseRoot, fixture.catalog.sections[0].units[0].lessons[0].path);
  fs.writeFileSync(lessonPath, lessonMarkdown({
    bodies: { ...translations, en: `${translations.en} 🎉 🎉 🎉` },
  }));
  const result = validateV2(fixture.root);
  assert.match(result.warnings.map((warning) => warning.message).join("\n"), /emoji hype budget/);
});

test("non-English body identical to English fails", () => {
  const fixture = makeTree();
  const lessonPath = path.join(fixture.courseRoot, fixture.catalog.sections[0].units[0].lessons[0].path);
  fs.writeFileSync(lessonPath, lessonMarkdown({ bodies: { ...translations, es: translations.en } }));
  assert.match(messages(validateV2(fixture.root)), /es body is byte-identical/);
});

test("stray file in lesson directory fails", () => {
  const fixture = makeTree();
  const lessonPath = path.join(fixture.courseRoot, fixture.catalog.sections[0].units[0].lessons[0].path);
  fs.writeFileSync(path.join(path.dirname(lessonPath), "notes.txt"), "stray");
  assert.match(messages(validateV2(fixture.root)), /Unexpected lesson file/);
});

test("real repository tree passes with strict locales and new formats", () => {
  const result = validateV2(repositoryV2);
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.lessons, 697);
  assert.equal(result.courses, 2);
  assert.equal(result.riffs, 35);
});

test("real repository adds one hundred lessons to every v2 section", () => {
  for (const [courseID, lessonPrefix, expectedRevision] of [
    ["instrument-scales", "scale-", 17],
    ["chords-harmony", "harmony-", 3],
  ]) {
    const catalog = JSON.parse(fs.readFileSync(
      path.join(repositoryV2, "education", "courses", courseID, "catalog.json"),
      "utf8"
    ));
    assert.equal(catalog.revision, expectedRevision);
    for (const section of catalog.sections) {
      const expansionUnits = section.units.filter((unit) =>
        unit.lessons.some((lesson) => lesson.id.startsWith(lessonPrefix))
      );
      const addedLessons = expansionUnits.flatMap((unit) => unit.lessons)
        .filter((lesson) => lesson.id.startsWith(lessonPrefix));
      assert.equal(
        expansionUnits.length,
        10,
        `${courseID}/${section.id} should contain ten focused expansion units`
      );
      assert.ok(
        expansionUnits.every((unit) =>
          unit.lessons.filter((lesson) => lesson.id.startsWith(lessonPrefix)).length === 10
        ),
        `${courseID}/${section.id} expansion units should contain ten lessons each`
      );
      assert.equal(
        addedLessons.length,
        100,
        `${courseID}/${section.id} should contain exactly 100 expansion lessons`
      );
      assert.ok(
        addedLessons.every((lesson) => lesson.optional === true),
        `${courseID}/${section.id} expansion lessons should not lengthen the required path`
      );
    }
    const publishedLessons = catalog.sections.flatMap((section) =>
      section.units.flatMap((unit) => unit.lessons)
    );
    const expectedExisting = courseID === "instrument-scales" ? 84 : 13;
    assert.equal(
      publishedLessons.filter((lesson) => !lesson.id.startsWith(lessonPrefix)).length,
      expectedExisting,
      `${courseID} should preserve every pre-expansion lesson`
    );
  }
});

test("daily riffs require unique ISO dates and six locales", () => {
  const fixture = makeTree();
  const dailyPath = path.join(fixture.root, "daily", "riffs.json");
  fs.mkdirSync(path.dirname(dailyPath), { recursive: true });
  const riff = {
    date: "not-a-date", id: "daily-test", titles: localized("Daily"),
    blurbs: localized("Play"), fence: { type: "scale", source: "id: riff\nroot: C\nscale: Major" },
  };
  fs.writeFileSync(dailyPath, JSON.stringify({ schema: 2, revision: 1, riffs: [riff, riff] }));
  const output = messages(validateV2(fixture.root));
  assert.match(output, /invalid ISO date/);
  assert.match(output, /Duplicate riff date/);
});

test("daily riffs reject duplicate degree patterns and localized blurbs", () => {
  const fixture = makeTree();
  const dailyPath = path.join(fixture.root, "daily", "riffs.json");
  fs.mkdirSync(path.dirname(dailyPath), { recursive: true });
  const makeRiff = (id, date) => ({
    date, id, titles: localized(id), blurbs: localized("Shared blurb"),
    fence: {
      type: "scale",
      source: `id: ${id}\nroot: C\nscale: Major\ndegrees: 1 2 3 5 - 4 2 1`,
    },
  });
  fs.writeFileSync(dailyPath, JSON.stringify({
    schema: 2, revision: 1,
    riffs: [makeRiff("riff-one", "2026-07-27"), makeRiff("riff-two", "2026-07-28")],
  }));
  const result = validateV2(fixture.root);
  const output = messages(result);
  assert.match(output, /degree pattern duplicates/);
  assert.match(output, /blurb duplicates/);
  assert.match(result.warnings.map((warning) => warning.message).join("\n"), /More than 20%/);
});
