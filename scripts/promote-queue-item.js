const fs = require("node:fs");
const path = require("node:path");
const { gateItem, atomicJSON, withLock } = require("./editorial-pipeline");
const { riffHash } = require("./publishing-state");
const { sha } = require("./audit-swift-parser");
const read = (file) => JSON.parse(fs.readFileSync(file));
const FAMILIES = ["guitar", "bass", "piano", "ukulele", "mandolin"];
function selectRiffCandidate(sourceCandidates, riffID) {
  if (!riffID && sourceCandidates.length !== 1)
    throw new Error(
      "A daily riff item must select exactly one riffID; a horizon bundle is not one editorial item.",
    );
  const candidates = sourceCandidates.filter(
    (candidate) => !riffID || candidate.id === riffID,
  );
  if (candidates.length !== 1)
    throw new Error("Selected riff identity is missing or duplicated.");
  return candidates;
}
function promoteQueueItem(root, stateRoot, id) {
  return withLock(stateRoot, () => {
    const queueFile = path.join(root, "editorial/queue.json"),
      queue = read(queueFile),
      item = queue.items.find((i) => i.id === id);
    if (!item) throw new Error("Unknown editorial item.");
    if (item.type === "riff" || (item.type === "gap" && !item.guidedTarget))
      require("./daily-content-policy").assertLegacyCreationAllowed(root);
    gateItem(item, {
      root,
      receipt: read(path.join(root, "editorial/evidence/swift-parser.json")),
    });
    const previousTarget = JSON.stringify(item.target || null);
    const parserArguments =
      item.type === "riff"
        ? ["--riffs", path.join(root, item.source)]
        : [path.join(root, item.source)];
    require("./parser-runtime").runCurrentParser(parserArguments);
    if (item.type === "riff") {
      const candidates = selectRiffCandidate(
        read(path.join(root, item.source)).riffs,
        item.riffID,
      );
      const catalogFile = path.join(root, "v2/daily/riffs.json"),
        catalog = read(catalogFile);
      const approvalFile = path.join(root, "editorial/riff-approvals.json"),
        approvals = fs.existsSync(approvalFile)
          ? read(approvalFile)
          : { schema: 1, entries: {} };
      const hashes = {};
      let changed = false;
      for (const candidate of candidates) {
        if (
          JSON.stringify((candidate.instruments || []).slice().sort()) !==
            JSON.stringify(FAMILIES.slice().sort()) ||
          candidate.setup
        )
          throw new Error(
            "Legacy-compatible dated riffs must be universal across the five declared families. Author instrument/setup-specific work as isolated guided content.",
          );
        const digest = riffHash(candidate);
        const prior = catalog.riffs.find((r) => r.id === candidate.id);
        if (prior && riffHash(prior) !== digest)
          throw new Error(
            "Released riff identity has different music; prepare a reviewed revision instead of overwriting.",
          );
        if (
          catalog.riffs.some(
            (r) => r.date === candidate.date && r.id !== candidate.id,
          )
        )
          throw new Error("Dated universal riff already exists for this day.");
        if (!prior) {
          catalog.riffs.push({
            ...candidate,
            publicationStatus: "approved",
            humanPlaythrough:
              item.reviewEvidence.playthrough?.status || "recipe-variation",
          });
          changed = true;
        }
        hashes[candidate.id] = digest;
        approvals.entries[candidate.id] = {
          semanticSHA256: digest,
          sourceContentSHA256: item.contentSHA256,
          reviewEvidence: item.reviewEvidence,
          approvedRecipe: item.approvedRecipe || null,
        };
      }
      if (changed) {
        catalog.revision += 1;
        atomicJSON(catalogFile, catalog);
      }
      atomicJSON(approvalFile, approvals);
      item.target = {
        kind: "riff-list",
        path: "v2/daily/riffs.json",
        riffHashes: hashes,
        files: ["v2/daily/riffs.json"],
      };
    } else if (item.type === "gap") {
      if (!item.blueprintApproved)
        throw new Error("Blueprint gap is not approved.");
      const source = fs.readFileSync(path.join(root, item.source), "utf8"),
        match = source.match(/^---\n([\s\S]*?)\n---/);
      if (!match) throw new Error("Missing legacy draft metadata.");
      const fields = Object.fromEntries(
        match[1]
          .split("\n")
          .map((line) => line.match(/^([^:]+):\s*(.*)$/))
          .filter(Boolean)
          .map((m) => [m[1], m[2]]),
      );
      if (fields.schema !== "2" || fields.format)
        throw new Error(
          "Gap promotion cannot add guided directives to a legacy course.",
        );
      if (/^(scale|harmony)-/.test(fields.id))
        throw new Error(
          "Foundation scale-/harmony- prefixes are reserved for the immutable baseline.",
        );
      for (const field of ["course", "section", "unit", "id"]) {
        if (!/^[a-z0-9][a-z0-9-]*$/.test(fields[field] || ""))
          throw new Error("Unsafe legacy metadata identity: " + field);
      }
      const assets = require("./approved-assets").approvedAssets(
        source,
        path.dirname(path.join(root, item.source)),
        item.id,
        item.reviewEvidence.playthrough || {},
      );
      const course = fields.course,
        catalogFile = path.join(
          root,
          "v2/education/courses",
          course,
          "catalog.json",
        ),
        catalog = read(catalogFile),
        section = catalog.sections.find((s) => s.id === fields.section),
        unit = section?.units.find((u) => u.id === fields.unit);
      if (!unit) throw new Error("Routine cannot create a new unit.");
      const exemplar = unit.lessons[0]?.path;
      if (!exemplar || !/\/lessons\/[^/]+\/lesson\.md$/.test(exemplar))
        throw new Error("Existing unit has no safe catalog path template.");
      const relative = exemplar.replace(
        /\/lessons\/[^/]+\/lesson\.md$/,
        "/lessons/" + fields.id + "/lesson.md",
      );
      const existing = unit.lessons.find((l) => l.id === fields.id);
      if (!existing && Number(fields.order) !== unit.lessons.length + 1)
        throw new Error("Stage the actual contiguous order BEFORE review.");
      const targetPath = "v2/education/courses/" + course + "/" + relative,
        file = path.join(root, targetPath);
      if (
        fs.existsSync(file) &&
        sha(fs.readFileSync(file)) !== item.contentSHA256
      )
        throw new Error("Existing target differs from the approved draft.");
      if (!fs.existsSync(file)) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, source);
      }
      require("./approved-assets").copyApprovedAssets(
        assets,
        path.dirname(file),
      );
      if (!existing) {
        const titles = {},
          summaries = {};
        for (const locale of ["en", "pt-BR", "es", "de", "ja", "zh-Hans"]) {
          titles[locale] = fields["title." + locale];
          summaries[locale] = fields["summary." + locale];
        }
        unit.lessons.push({
          id: fields.id,
          order: Number(fields.order),
          estimatedMinutes: Number(fields.estimatedMinutes),
          activity: item.activity || "guided-practice",
          instrument: fields.instrument,
          optional: true,
          titles,
          summaries,
          path: relative,
        });
        catalog.revision += 1;
        atomicJSON(catalogFile, catalog);
      }
      item.target = {
        kind: "file",
        path: targetPath,
        sha256: item.contentSHA256,
        files: [
          targetPath,
          path.relative(root, catalogFile),
          ...assets.map((asset) =>
            path.relative(
              root,
              path.join(path.dirname(file), asset.relativePath),
            ),
          ),
        ],
      };
    } else
      throw new Error(
        "Use the human-bound path/legacy promotion lane for core or new physical patterns.",
      );
    item.targetDigest = sha(JSON.stringify(item.target));
    if (previousTarget !== JSON.stringify(item.target)) {
      queue.revision += 1;
      atomicJSON(queueFile, queue);
    }
    return {
      id: item.id,
      target: item.target,
      next: "Refresh real parser receipt and independent publication review for this precise target delta, then reselect the same pre-commit batch.",
    };
  });
}
module.exports = { promoteQueueItem, selectRiffCandidate };
