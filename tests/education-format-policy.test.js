const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { assertCurrentEducationOnly } = require("../scripts/education-format-policy");

test("rejects restored legacy lessons while preserving non-education endpoints", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "education-policy-"));
  try {
    for (const directory of ["v1/home", "v1/toggles", "v2/education/courses"]) {
      fs.mkdirSync(path.join(root, directory), { recursive: true });
    }
    assert.doesNotThrow(() => assertCurrentEducationOnly(root));
    for (const retired of ["legacy/v1/data/education", "v1/education", "api/education", "education"]) {
      const file = path.join(root, retired, "courses.json");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, "{}");
      assert.throws(() => assertCurrentEducationOnly(root), /Retired education source/);
      fs.rmSync(path.join(root, retired.split("/")[0]), { recursive: true });
    }
    const jsonLesson = path.join(root, "v2/education/courses/lesson-content.json");
    fs.writeFileSync(jsonLesson, "{}");
    assert.throws(() => assertCurrentEducationOnly(root), /Retired JSON lesson source/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Pages build rejects retired lessons before changing the artifact", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "education-build-"));
  try {
    fs.mkdirSync(path.join(root, "scripts"));
    for (const name of ["build-pages.js", "education-format-policy.js"]) {
      fs.copyFileSync(path.join(__dirname, "../scripts", name), path.join(root, "scripts", name));
    }
    fs.mkdirSync(path.join(root, "v1/education"), { recursive: true });
    fs.mkdirSync(path.join(root, "dist"));
    fs.writeFileSync(path.join(root, "dist/sentinel"), "existing artifact");
    assert.throws(() => execFileSync(process.execPath, [path.join(root, "scripts/build-pages.js")], { stdio: "pipe" }), /Retired education source/);
    assert.equal(fs.readFileSync(path.join(root, "dist/sentinel"), "utf8"), "existing artifact");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("lesson creator writes schema-2 Markdown in the level hierarchy and rejects legacy schemas", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "education-create-"));
  const locales = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
  try {
    fs.mkdirSync(path.join(root, "scripts"));
    fs.copyFileSync(path.join(__dirname, "../create-lesson.js"), path.join(root, "create-lesson.js"));
    fs.copyFileSync(path.join(__dirname, "../scripts/education-format-policy.js"), path.join(root, "scripts/education-format-policy.js"));
    const courseRoot = path.join(root, "v2/education/courses/instrument-scales");
    fs.mkdirSync(courseRoot, { recursive: true });
    fs.writeFileSync(path.join(courseRoot, "catalog.json"), JSON.stringify({
      sections: [{ id: "beginner", level: "beginner", units: [{ id: "pulse", lessons: [] }] }],
    }));
    const spec = {
      schema: 1, id: "steady-beat", section: "beginner", unit: "pulse",
      estimatedMinutes: 5, instrument: "piano", activity: "rhythm", optional: false,
      titles: Object.fromEntries(locales.map(locale => [locale, "Steady beat"])),
      summaries: Object.fromEntries(locales.map(locale => [locale, "Play a steady beat"])),
      body: Object.fromEntries(locales.map(locale => [locale, { blocks: ["Play four notes."], checkpoint: "Keep time." }])),
      sharedBlocks: [{ type: "notes", content: "instrument: piano\ntempo: 80\nsequence: C4 D4 E4 F4" }],
    };
    const specPath = path.join(root, "spec.json");
    const args = [path.join(root, "create-lesson.js"), "--spec", specPath, "--tier", "max", "--locales", locales.join(",")];
    fs.writeFileSync(specPath, JSON.stringify(spec));
    assert.throws(() => execFileSync(process.execPath, args, { cwd: root, stdio: "pipe" }), /Only schema 2/);
    spec.schema = 2;
    fs.writeFileSync(specPath, JSON.stringify(spec));
    execFileSync(process.execPath, args, { cwd: root, stdio: "pipe" });
    const catalog = JSON.parse(fs.readFileSync(path.join(courseRoot, "catalog.json"), "utf8"));
    const lesson = catalog.sections[0].units[0].lessons[0];
    assert.equal(lesson.path, "levels/beginner/sections/beginner/units/pulse/lessons/steady-beat/lesson.md");
    assert.match(fs.readFileSync(path.join(courseRoot, lesson.path), "utf8"), /^---\nschema: 2\n/);
    assert.doesNotThrow(() => assertCurrentEducationOnly(root));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
