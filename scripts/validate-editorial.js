#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { sha, verifyReceipt, digestFiles } = require("./audit-swift-parser");
const {
  approvedAssets,
  assertPathDocumentCompatible,
} = require("./approved-assets");
const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
function localized(object, label, errors) {
  for (const locale of LOCALES)
    if (!object?.[locale]?.trim()) errors.push(`${label}: missing ${locale}`);
}
function validateEditorial(
  root,
  { requireReceipt = true, requirePublicationApproval = false } = {},
) {
  const errors = [];
  const candidateFile = path.join(root, "editorial/candidates/paths.json");
  for (const [file, candidate] of [
    [path.join(root, "v2/education/paths.json"), false],
    [candidateFile, true],
  ]) {
    if (!fs.existsSync(file)) {
      errors.push(`Missing ${file}`);
      continue;
    }
    const index = read(file);
    if (index.schema !== 2 || index.format !== 2 || index.revision < 1)
      errors.push("Invalid guided index contract");
    const identities = new Set();
    for (const p of index.paths || []) {
      if (identities.has(p.id)) errors.push("Duplicate path " + p.id);
      identities.add(p.id);
      localized(p.titles, p.id + " titles", errors);
      localized(p.summaries, p.id + " summaries", errors);
      if (
        !candidate &&
        (p.publicationStatus !== "approved" ||
          (p.humanPlaythrough !== "approved" &&
            !(p.humanPlaythrough === "not-claimed" &&
              ["owner-release", "guided-extra-delta"].includes(p.approval?.basis))) ||
          !p.approval?.approvedBy ||
          !p.approval?.approvedAt)
      )
        errors.push(`Published path lacks explicit human approval: ${p.id}`);
      if (!candidate)
        try {
          require("./coordinated-publication").assertPathManifestApproval(p);
          if (p.approval?.basis === "owner-release")
            require("./path-release-approval").assertOwnerRelease({ ...p.approval, kind: "human", playthrough: "not-claimed" }, [p.id]);
        } catch (error) {
          errors.push(error.message);
        }
      if (
        !candidate &&
        !require("./coordinated-publication").registeredPathPromotion(root, p)
      )
        errors.push(
          "Published path lacks its registered human-reviewed promotion transaction: " +
            p.id,
        );
      for (const unit of p.units || []) {
        localized(unit.titles, unit.id + " titles", errors);
        localized(unit.summaries, unit.id + " summaries", errors);
        if (candidate) {
          const roles = unit.placements.map((l) => l.role);
          if (
            JSON.stringify(roles) !==
            JSON.stringify([
              "core",
              "core",
              "core",
              "core",
              "transfer",
              "extra",
            ])
          )
            errors.push(
              "Pilot role order must be four core, transfer, extra: " + unit.id,
            );
        }
        for (const l of unit.placements || []) {
          localized(l.titles, l.lessonID + " titles", errors);
          localized(l.summaries, l.lessonID + " summaries", errors);
          const base =
            l.source === "legacy"
              ? path.join(root, "v2/education")
              : candidate
                ? path.join(root, "editorial/candidates")
                : path.join(root, "v2/education");
          const resolved = path.resolve(base, l.path);
          if (
            !resolved.startsWith(path.resolve(base) + path.sep) ||
            !fs.existsSync(resolved)
          ) {
            errors.push("Missing/unsafe guided content path: " + l.path);
            continue;
          }
          const bytes = fs.readFileSync(resolved);
          const source = bytes.toString("utf8");
          if (
            l.source === "guided" &&
            (!/^format: 2$/m.test(source) ||
              !/^assessmentVersion: [1-9]\d*$/m.test(source))
          )
            errors.push("Missing guided contract fields: " + l.lessonID);
          if (
            l.source === "legacy" &&
            (!/^schema: 2$/m.test(source) ||
              /^format: 2$/m.test(source) ||
              /^:::step/m.test(source))
          )
            errors.push(
              "Legacy reference is not a compatible schema-2 course document: " +
                l.lessonID,
            );
          const regions = [
            ...source.matchAll(/:::localized\n([\s\S]*?):::endlocalized/g),
          ];
          if (!regions.length)
            errors.push("No authored localized region: " + l.lessonID);
          for (const region of regions)
            for (const locale of LOCALES)
              if (
                !new RegExp(`^:::locale ${locale}\\n\\S`, "m").test(region[1])
              )
                errors.push(
                  "Incomplete localized region: " + l.lessonID + " " + locale,
                );
          if (
            !candidate &&
            p.approval?.documentSHA256?.[l.contentKey] !== sha(bytes)
          )
            errors.push(
              "Human approval does not match document bytes: " + l.lessonID,
            );
          if (!candidate)
            try {
              assertPathDocumentCompatible(source);
              approvedAssets(
                source,
                path.dirname(resolved),
                l.contentKey,
                p.approval,
              );
            } catch (error) {
              errors.push(error.message);
            }
        }
      }
    }
  }
  const queue = read(path.join(root, "editorial/queue.json"));
  const ids = new Set();
  if (queue.dailyLimit !== 3)
    errors.push("The editorial limit must remain three, not a quota.");
  for (const i of queue.items) {
    if (ids.has(i.id)) errors.push("Duplicate editorial item: " + i.id);
    ids.add(i.id);
    if (
      !["repair", "riff", "review", "gap"].includes(i.type) ||
      !i.objective ||
      !i.setup ||
      !i.owner ||
      !i.source ||
      !i.blueprintVersion
    )
      errors.push("Incomplete editorial item: " + i.id);
    if (LOCALES.some((l) => !i.locales?.includes(l)))
      errors.push("Queue item requires six locales: " + i.id);
    const file = path.resolve(root, i.source);
    if (!file.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(file))
      errors.push("Queue source missing/unsafe: " + i.id);
    else if (
      i.type === "riff" &&
      (!i.riffID ||
        read(file).riffs?.filter((riff) => riff.id === i.riffID).length !== 1)
    )
      errors.push(
        "One dated riff identity is required per editorial item: " + i.id,
      );
    else if (
      !require("./editorial-item").targetDelivered(root, i) &&
      i.contentSHA256 &&
      require("./editorial-item").authoredDigest(root, i) !== i.contentSHA256
    )
      errors.push("Queue content digest is stale: " + i.id);
  }
  for (const file of [
    path.join(root, "v2/daily/riffs.json"),
    path.join(root, "editorial/candidates/riffs.json"),
  ]) {
    for (const riff of read(file).riffs) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(riff.validUntil || "") ||
        riff.validUntil < riff.date
      )
        errors.push("Invalid riff validity: " + riff.id);
      if (
        !Array.isArray(riff.instruments) ||
        !riff.instruments.length ||
        !Array.isArray(riff.requiredCapabilities)
      )
        errors.push("Riff lacks context/capabilities: " + riff.id);
    }
  }
  const quarantines = read(
    path.join(root, "editorial/evidence/legacy-fallbacks.json"),
  );
  for (const fallback of quarantines.lessons) {
    const file = path.join(root, fallback.path);
    const source = fs.readFileSync(file, "utf8");
    if (
      sha(source) !== fallback.fallbackSHA256 ||
      !/^contentStatus: quarantined$/m.test(source)
    )
      errors.push(
        "Quarantine fallback differs from reviewed bytes: " + fallback.id,
      );
    if (/```fretboard\b/.test(source))
      errors.push(
        "Unreviewed physical map leaked into production: " + fallback.id,
      );
    if (
      fallback.fallbackKind === "concept-only-no-invented-audio" &&
      /```(?:notes|scale|chord|progression|fretboard)\b/.test(source)
    )
      errors.push(
        "Concept-only fallback invents musical playback: " + fallback.id,
      );
    if (
      sha(fs.readFileSync(path.join(root, fallback.proposalPath))) !==
      fallback.proposalSHA256
    )
      errors.push(
        "Physical proposal changed without updating its review checkpoint: " +
          fallback.id,
      );
    if (
      sha(fs.readFileSync(path.join(root, fallback.originalPath))) !==
      fallback.originalSHA256
    )
      errors.push("Original source provenance changed: " + fallback.id);
    if (fallback.fallbackSHA256 === fallback.proposalSHA256)
      errors.push("Pending physical proposal is being served: " + fallback.id);
  }
  const repairs = read(
    path.join(root, "editorial/evidence/legacy-repair.json"),
  ).changes;
  const quarantinedIDs = new Set(quarantines.lessons.map((f) => f.id));
  for (const repair of repairs.filter(
    (c) => c.classification === "musical" && !quarantinedIDs.has(c.id),
  )) {
    if (
      !require("./coordinated-publication").validLegacyPromotion(
        root,
        repair.path,
        fs.readFileSync(path.join(root, repair.path)),
      )
    )
      errors.push(
        "Released physical repair lacks exact registered human approval: " +
          repair.id,
      );
  }
  if (requireReceipt)
    try {
      verifyReceipt(
        root,
        read(path.join(root, "editorial/evidence/swift-parser.json")),
        { allowReview: !requirePublicationApproval },
      );
    } catch (error) {
      errors.push(error.message);
    }
  const riffCatalog = read(path.join(root, "v2/daily/riffs.json"));
  const stock = read(
    path.join(root, "editorial/evidence/riff-rotation-review.json"),
  );
  const originalIDs = new Set(stock.lessons.map((r) => r.id));
  const riffApprovalsFile = path.join(root, "editorial/riff-approvals.json");
  const riffApprovals = fs.existsSync(riffApprovalsFile)
    ? read(riffApprovalsFile).entries
    : {};
  for (const riff of riffCatalog.riffs) {
    if (
      JSON.stringify((riff.instruments || []).slice().sort()) !==
        JSON.stringify(
          ["guitar", "bass", "piano", "ukulele", "mandolin"].sort(),
        ) ||
      riff.setup
    )
      errors.push(
        "Legacy-compatible dated riffs must be universal; instrument-specific work belongs to the isolated path contract: " +
          riff.id,
      );
    if (originalIDs.has(riff.id)) {
      const original = stock.lessons.find((r) => r.id === riff.id);
      if (
        original.unchanged !== true ||
        original.publishedContentSHA256 !==
          require("./publishing-state").stockHash(riff)
      )
        errors.push(
          "Published rotation stock changed without a reviewed new target: " +
            riff.id,
        );
    }
    if (!originalIDs.has(riff.id)) {
      const approval = riffApprovals[riff.id];
      if (
        !approval ||
        approval.semanticSHA256 !==
          require("./publishing-state").riffHash(riff) ||
        approval.reviewEvidence?.independent?.status !== "approved" ||
        !approval.reviewEvidence?.independent?.reviewer ||
        !approval.reviewEvidence?.independent?.reviewedAt
      )
        errors.push(
          "New riff lacks exact independent approved-target proof: " + riff.id,
        );
    }
  }
  if (requirePublicationApproval) {
    const review = read(
      path.join(root, "editorial/evidence/independent-review.json"),
    );
    if (review.status !== "approved" || !review.reviewer || !review.reviewedAt)
      errors.push(
        "Independent review of the concrete repair/fallback batch is pending.",
      );
    const current = digestFiles(root);
    if (
      review.snapshotSHA256 !== sha(JSON.stringify(current)) ||
      JSON.stringify(review.publishedFiles) !== JSON.stringify(current)
    )
      errors.push(
        "Independent review is stale for the complete published V2 snapshot. A reviewed delta may carry forward unchanged file hashes; candidate presence alone does not require publication approval.",
      );
    const served = require("./source-inventory").publishedInventory(root);
    if (
      review.servedSHA256 !== sha(JSON.stringify(served)) ||
      JSON.stringify(review.servedFiles) !== JSON.stringify(served)
    )
      errors.push(
        "Independent review is stale for complete served sources, including an explicitly enabled commercial site.",
      );
    for (const change of read(
      path.join(root, "editorial/evidence/legacy-repair.json"),
    ).changes)
      if (
        review.documentSHA256?.[change.path] !==
        sha(fs.readFileSync(path.join(root, change.path)))
      )
        errors.push(
          "Independent review does not match served bytes: " + change.id,
        );
  }
  return { valid: !errors.length, errors };
}
if (require.main === module) {
  const result = validateEditorial(path.join(__dirname, ".."), {
    requirePublicationApproval: process.argv.includes("--publication"),
  });
  if (!result.valid) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      "Validated editorial queue, guided candidates, publication isolation, context and gates.",
    );
}
module.exports = { validateEditorial };
