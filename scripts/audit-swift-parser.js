#!/usr/bin/env node
// Grammar validation is delegated to the actual, pinned Swift CLI. No JS grammar substitute.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { assertWritesAllowed } = require("./maintenance-guard");
const { inventory } = require("./source-inventory");
const locales = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
function sourceFiles(root) {
  return Object.keys(inventory(root, ["v2"]));
}
function digestFiles(root) {
  return inventory(root, ["v2"]);
}
function candidateDigests(root) {
  return inventory(root, ["editorial/candidates"]);
}
function referencedLessons(root) {
  const index = read(path.join(root, "v2/education/courses.json"));
  return index.courses.flatMap((course) => {
    const directory = `v2/education/courses/${course.id}`;
    return read(path.join(root, directory, "catalog.json")).sections.flatMap(
      (section) =>
        section.units.flatMap((unit) =>
          unit.lessons.map((lesson) => ({
            id: lesson.id,
            source: "legacy",
            file: `${directory}/${lesson.path}`,
          })),
        ),
    );
  });
}
function runParser(root, cli, entries) {
  if (!cli || !fs.existsSync(cli))
    throw new Error(
      "A real Swift lessonlint executable is required; provide the pinned persistent runtime configuration.",
    );
  const rows = [];
  // One file per process preserves precise failure attribution, including errors thrown before locale logging.
  for (const entry of entries) {
    const run = spawnSync(
      cli,
      locales
        .flatMap((locale) => ["--locale", locale])
        .concat(path.join(root, entry.file)),
      { encoding: "utf8", maxBuffer: 1024 * 1024 },
    );
    const output = `${run.stdout || ""}${run.stderr || ""}`;
    if (run.error) throw run.error;
    rows.push({
      ...entry,
      valid: run.status === 0,
      exitCode: run.status,
      diagnostics: output
        .split("\n")
        .filter((line) => /: (error|warning):/.test(line))
        .map((line) => line.replaceAll(`${root}/`, "")),
    });
  }
  return rows;
}
function auditSwift(root, baseline, current) {
  assertWritesAllowed();
  const startingFiles = digestFiles(root);
  const startingCandidates = candidateDigests(root);
  const legacyEntries = referencedLessons(root);
  const legacy = runParser(root, baseline, legacyEntries);
  if (!current)
    throw new Error(
      "The current Swift parser is required for the complete snapshot.",
    );
  const currentLegacy = runParser(root, current, legacyEntries);
  const indexFile = path.join(root, "v2/education/paths.json");
  const candidateFile = path.join(root, "editorial/candidates/paths.json");
  const guided = fs.existsSync(indexFile)
    ? read(indexFile).paths.flatMap((p) =>
        p.units.flatMap((u) =>
          u.placements
            .filter((l) => l.source === "guided")
            .map((l) => ({
              id: l.lessonID,
              source: "guided",
              file: `v2/education/${l.path}`,
            })),
        ),
      )
    : [];
  if (fs.existsSync(candidateFile))
    guided.push(
      ...read(candidateFile).paths.flatMap((p) =>
        p.units.flatMap((u) =>
          u.placements
            .filter((l) => l.source === "guided")
            .map((l) => ({
              id: l.lessonID,
              source: "candidate",
              file: `editorial/candidates/${l.path}`,
            })),
        ),
      ),
    );
  const fallbackFile = path.join(
    root,
    "editorial/evidence/legacy-fallbacks.json",
  );
  const proposalEntries = fs.existsSync(fallbackFile)
    ? read(fallbackFile).lessons.map((l) => ({
        id: l.id,
        source: "legacy-proposal",
        file: l.proposalPath,
      }))
    : [];
  const newRows = guided.length ? runParser(root, current, guided) : [];
  const proposalRows = proposalEntries.length
    ? runParser(root, current, proposalEntries)
    : [];
  const alreadyChecked = new Set(
    [...guided, ...proposalEntries].map((e) => e.file),
  );
  const additionalCandidates = Object.keys(candidateDigests(root))
    .filter((file) => file.endsWith("/lesson.md") && !alreadyChecked.has(file))
    .map((file) => ({
      id:
        fs
          .readFileSync(path.join(root, file), "utf8")
          .match(/^id:\s*(.+)$/m)?.[1] || file,
      source: "additional-candidate",
      file,
    }));
  const extraRows = additionalCandidates.length
    ? runParser(root, current, additionalCandidates)
    : [];
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "instrument-scales-riff-audit-"),
  );
  let riffs, currentRiffs;
  try {
    const catalog = read(path.join(root, "v2/daily/riffs.json"));
    const entries = catalog.riffs.map((riff) => {
      const file = `${riff.id}.md`;
      const front = `---\nschema: 2\nid: ${riff.id}\ncourse: daily-riffs\nlevel: beginner\nsection: beginner\nunit: daily\norder: 1\nrevision: ${catalog.revision}\nestimatedMinutes: 5\ninstrument: adaptive\n${locales.flatMap((l) => [`title.${l}: ${riff.titles[l]}`, `summary.${l}: ${riff.blurbs[l]}`]).join("\n")}\n---\n`;
      fs.writeFileSync(
        path.join(temp, file),
        `${front}\n:::localized\n${locales.map((l) => `:::locale ${l}\n${riff.blurbs[l]}`).join("\n")}\n:::endlocalized\n\n\`\`\`${riff.fence.type}\n${riff.fence.source}\n\`\`\`\n`,
      );
      return { id: riff.id, source: "riff", file };
    });
    riffs = runParser(temp, baseline, entries).map((row) => ({
      ...row,
      file: "v2/daily/riffs.json",
    }));
    currentRiffs = runParser(temp, current, entries).map((row) => ({
      ...row,
      file: "v2/daily/riffs.json",
    }));
  } finally {
    fs.rmSync(temp, { recursive: true });
  }
  // Use the current CLI's actual manifest+setup validation in addition to document parsing.
  const contracts = [];
  for (const [label, args] of [
    [
      "public-paths",
      ["--paths", indexFile, "--root", path.join(root, "v2/education")],
    ],
    [
      "candidate-paths",
      [
        "--paths",
        candidateFile,
        "--root",
        path.dirname(candidateFile),
        "--allow-unapproved",
      ],
    ],
    ["daily-riffs", ["--riffs", path.join(root, "v2/daily/riffs.json")]],
    [
      "candidate-riffs",
      ["--riffs", path.join(root, "editorial/candidates/riffs.json")],
    ],
  ]) {
    if (!fs.existsSync(args[1])) continue;
    const run = spawnSync(current, ["--all-locales", "--json", ...args], {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    });
    if (run.error) throw run.error;
    contracts.push({
      label,
      valid: run.status === 0,
      diagnostics: JSON.parse(run.stdout || "[]"),
    });
  }
  const rows = [
    ...legacy.map((r) => ({ ...r, parser: "baseline" })),
    ...currentLegacy.map((r) => ({ ...r, parser: "current" })),
    ...newRows.map((r) => ({ ...r, parser: "current" })),
    ...proposalRows.map((r) => ({ ...r, parser: "current" })),
    ...extraRows.map((r) => ({ ...r, parser: "current" })),
    ...riffs.map((r) => ({ ...r, parser: "baseline" })),
    ...currentRiffs.map((r) => ({ ...r, parser: "current" })),
  ];
  if (
    JSON.stringify(startingFiles) !== JSON.stringify(digestFiles(root)) ||
    JSON.stringify(startingCandidates) !==
      JSON.stringify(candidateDigests(root))
  ) {
    throw new Error(
      "Source bytes changed during the actual parser audit. Preserve the previous receipt and rerun on frozen content.",
    );
  }
  return {
    schema: 1,
    generatedAt: new Date().toISOString(),
    locales,
    baselineSourceCommit: "5eab79a",
    baselineBinarySHA256: sha(fs.readFileSync(baseline)),
    currentBinarySHA256: sha(fs.readFileSync(current)),
    scope:
      "Both real parsers on every legacy reference and riff; current parser on complete quarantined proposals and guided manifests/setup. Source parser execution, not store-binary playback.",
    valid: rows.every((row) => row.valid) && contracts.every((r) => r.valid),
    counts: {
      legacy: legacy.length,
      guided: newRows.length,
      legacyProposals: proposalRows.length,
      riffs: riffs.length,
      failed: rows.filter((row) => !row.valid).length,
    },
    files: digestFiles(root),
    candidateFiles: candidateDigests(root),
    contracts,
    rows,
  };
}
function verifyReceipt(root, report, { allowReview = false } = {}) {
  const baseline =
    "5eab79a24efff87423d026784d06b503afb0184f-b8588a44b95d".split("-")[0];
  if (
    report.baselineSourceCommit !== baseline ||
    report.runtimeProvenance?.baselineCommit !== baseline
  )
    throw new Error(
      "Parser receipt must use the exact approved5eab79a baseline source commit.",
    );

  if (
    !report.runtimeProvenance ||
    !report.runtimeProvenance.baselineSourceSHA256 ||
    !report.runtimeProvenance.currentSourceSHA256
  )
    throw new Error("Real parser runtime provenance is required.");
  if (report.reviewOnly && !allowReview)
    throw new Error(
      "Review-only parser receipt cannot authorize production publishing; prepare the committed app runtime.",
    );
  if (!report.valid || (!report.currentBinarySHA256 && report.counts.guided))
    throw new Error("Parser receipt is not valid.");
  if (JSON.stringify(digestFiles(root)) !== JSON.stringify(report.files))
    throw new Error(
      "Parser receipt does not match the complete current V2 snapshot. Run both pinned Swift parsers on the publishing Mac.",
    );
  if (
    JSON.stringify(candidateDigests(root)) !==
    JSON.stringify(report.candidateFiles)
  )
    throw new Error("Candidate bytes changed after real parser validation.");
  return true;
}
if (require.main === module) {
  const root =
    process.env.EDITORIAL_REPOSITORY_ROOT || path.join(__dirname, "..");
  const args = process.argv.slice(2);
  const value = (name) => {
    const index = args.indexOf(name);
    return index < 0 ? null : args[index + 1];
  };
  const reportFile =
    value("--report") ||
    (args.includes("--audit") &&
    args[args.indexOf("--audit") + 1] &&
    !args[args.indexOf("--audit") + 1].startsWith("--")
      ? args[args.indexOf("--audit") + 1]
      : path.join(root, "editorial/evidence/swift-parser.json"));
  try {
    if (args.includes("--verify")) {
      verifyReceipt(root, read(reportFile), {
        allowReview: args.includes("--review"),
      });
      console.log(
        "Verified real Swift parser receipt for this complete content snapshot.",
      );
    } else {
      const configFile = value("--runtime-config");
      if (!configFile)
        throw new Error(
          "Use --runtime-config <provenance.json>; temporary environment-only binaries cannot authorize publishing.",
        );
      const config = require("./parser-runtime").loadRuntimeConfig(configFile, {
        allowReview: true,
      });
      const result = auditSwift(
        root,
        config.baseline.binary,
        config.current.binary,
      );
      result.reviewOnly = config.reviewOnly === true;
      result.baselineSourceCommit = config.baseline.commit;
      result.runtimeProvenance = {
        baselineCommit: config.baseline.commit,
        currentCommit: config.current.commit,
        baselineSourceSHA256: config.baseline.sourceSHA256,
        currentSourceSHA256: config.current.sourceSHA256,
        baselineBinarySHA256: config.baseline.binarySHA256,
        currentBinarySHA256: config.current.binarySHA256,
        sourceKind: config.sourceKind || "committed-packages",
      };
      assertWritesAllowed();
      fs.mkdirSync(path.dirname(reportFile), { recursive: true });
      fs.writeFileSync(reportFile, JSON.stringify(result, null, 2) + "\n");
      console.log(JSON.stringify(result.counts));
      if (!result.valid) process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = {
  auditSwift,
  verifyReceipt,
  digestFiles,
  referencedLessons,
  sha,
  candidateDigests,
};
