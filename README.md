# Instrument Scales Online Data

Static content and editorial source for Instrument Scales. Published education remains schema-2 Markdown. The legacy archive has **838 lessons** and 35 dated riffs; the 3 October producer commit `448975f` added three lessons while implementation began. Those additions were preserved.

## Published and candidate content

- `v2/education/courses.json` and the two course catalogs retain all released identities and URLs. The four existing free sample IDs remain in their original order. The 24 physical Scale prerequisites are optional; the six adaptive Harmony prerequisites remain required.
- `v2/education/paths.json` is the isolated format-2 path index. The index contains **five approved paths and 40 guided lessons**: the 36-lesson owner-approved pilot plus four independently reviewed optional extras. A release is complete only after the reviewed commit is pushed and its complete served bytes are verified; the production `snapshot.json` identifies that deployed commit. Older clients cannot reach guided directives through `courses.json`.
- `editorial/candidates/paths.json` and `editorial/candidates/guided/` preserve the authored review pilot: guitar 12, bass 6, piano 6, high-G ukulele 6 and mandolin 6. Six locales, six concept quizzes and two screen-rhythm exercises accompany playable examples, feedback and transfer. Four core placements, one transfer and one extra form each pilot unit. The owner explicitly approved release of this pilot on 4 October; the hash-bound owner record claims no physical playthrough and retains mandatory independent six-language review and real parser checks. Only the completed registered promotion copies approved documents into production; candidate directories are never served by Pages.
- `editorial/blueprints.json` defines 26 finite unit arcs across five families and three levels. Future units remain editorial blueprints, rather than fabricated published lessons.
- `editorial/migration-by-reference.json` keeps exact legacy content references and progress identities. Substantive guided rewrites have new identities; no automatic completion or mastery credit is invented.
- `site/instrument-scales/` is the prepared EN/pt-BR product/support source. Production is **disabled by default** in `editorial/site-publication.json`. Local review previews may include it. Enabling requires an explicit intervention record and a separate reviewed commit.
- `v1/home` and `v1/toggles` remain published. Retired V1 education and JSON lesson bodies remain prohibited.

## Concentrated repair and quarantine

The actual baseline Swift parser found **95 broken documents**, exceeding the historical partial static scan of 74. A known thirds sequence/objective mismatch was also addressed as a proposal. The repair inventory has equivalent repairs with per-block evidence of unchanged MIDI pitches, duration, tempo and fingering, plus isolated musical or physical proposals requiring explicit review. Current authoritative counts are in `editorial/evidence/legacy-repair.json` (`summary`), rather than a frozen quota.

Complete proposals and all 96 original source documents are preserved under `editorial/candidates/legacy-repairs/` and `editorial/originals/legacy/`. Production serves a visibly quarantined fallback at every affected unchanged URL. `legacy-fallbacks.json` records the listening and concept-only counts; audio contains only fully determined original events, and concept-only references invent no musical sequence. Original physical instructions are not presented as approved practice. See `editorial/evidence/legacy-repair.json` and `legacy-fallbacks.json` for hashes, classification, source provenance and progression effects.

Legacy revision increments reset revision-scoped answers/checkpoints in the existing client; completion identities are preserved. The canonical progress key for an exact legacy reference remains `course/section/unit/lesson`.

## Real parser validation

`audit-swift-parser.js` delegates grammar to actual Swift CLIs. The immutable baseline is app source commit `5eab79a`; its LessonsKit, PracticeKit and MusicLogicCore trees match the documented 4.1.0 (34) preparation commit `d7e5255`. This proves source equivalence, not App Store binary playback or a physical playthrough.

Prepare persistent CLIs after the app implementation has been committed:

```sh
node scripts/prepare-parser-runtime.js --app /Users/thiagomartins/Developer/AppsGitHub/InstrumentScales3 --current-ref <committed-app-SHA>
node scripts/audit-swift-parser.js --audit editorial/evidence/swift-parser.json --runtime-config "/Users/thiagomartins/Library/Application Support/InstrumentScalesEditorial/parsers/active-runtimes.json"
```

The runtime helper archives the three packages from each exact Git commit, verifies every source blob, builds the package executable serially, uses only resolved dependency versions, rechecks all source blobs after build, resumes only a known matching partial checkpoint, and records compiler/source/binary digests, and makes source/binary files read-only. It neither builds the application nor changes its checkout. Existing mismatched runtimes and stale locks are preserved for reconciliation.

During development the auditor may use an explicitly review-only runtime configuration with verified source/binary digests; such a receipt cannot authorize production. Environment-only executable paths are insufficient. The final receipt runs both parsers on every legacy lesson and published riff, and the current parser on guided manifests/setup, complete quarantined proposals and seven proposed riffs. CI verifies the receipt against the entire current V2/candidate inventory; it does not substitute a JavaScript grammar implementation or depend on `/tmp` executables.

## Checks and Pages

```sh
node scripts/validate-v2.js
node scripts/audit-v2-bulk.js --no-revision-one
node scripts/audit-swift-parser.js --verify
node scripts/validate-editorial.js
node --test tests/*.test.js
node scripts/build-pages.js --review-snapshot
```

A review snapshot is local, explicitly marked `review-pending`, and excludes candidates. Production uses `node scripts/validate-editorial.js --publication` and `node scripts/build-pages.js`, requiring the concrete independent review receipt. Equivalent repairs need independent review, not an additional owner permission gate. Physical proposals and future new path spines require content-hash-bound human playthrough records. The 36-lesson pilot has its separately recorded explicit owner release approval. No human signature or playthrough is fabricated.

Pages validates identities/free samples/required prerequisites, both parser receipts and publication review, then uploads one complete artifact. `snapshot.json` records the publishing commit and every served file hash. The smoke job retries CDN propagation and checks the expected commit plus all served bytes. The product/support site is included only after its explicit enablement. Publisher state has a stable repository identity independent of origin URL spelling, with a separate private recovery mirror. Missing identity, outcome ledger or an uncertain active checkpoint fails closed; use explicit coordinator recovery. Private persistent state under `~/Library/Application Support/InstrumentScalesEditorial/state/` contains attempts, waiting outcomes, delivery confirmations and immutable snapshots. Tracked queue definitions do not become dirty after a deployment. Immutable local snapshots and quarantine records support recovery by a new corrective commit; never reset history or remove learner data.

See [OPENCLAW.md](OPENCLAW.md) for complete selection, deferral, publication reconciliation and promotion commands. `editorial/queue.json` is the sole active queue. The published historical syllabus is archived, not a competing source of open work. Historical seed generators refuse the mature repository. The live guided-only policy also rejects new legacy authorship/promotion through `create-lesson.js` and the old riff/gap commands. Existing identities and historical candidate records remain preserved.


## Daily guided authoring after 4 October

The owner approved the evaluated pilot and asked for all future lessons to use the new guided model. The queue therefore selects existing repairs/reviews and optional guided gaps, with at most three items and no publication quota. Seven old riff proposals no longer consume that allowance. New units and mandatory placements remain outside the routine.

The first optional guided extra, `guitar-rest-release-diagnosis`, adds a self-comparison of ringing rests using the exact approved guitar pattern. Its independent six-language review and origin-bound delta preserve the pilot approval, required IDs and spine version; it claims no physical playthrough.

The optional `bass-release-comparison` extra compares real note endings in two attempts at the exact approved bass pattern; it changes neither technique nor required placements.

The optional `piano-rest-self-check` extra diagnoses whether a held key masks a counted breath, comparing two attempts at the exact approved piano pattern without changing technique, pulse or required placements.

`editorial/guided-gaps.json` defines five finite teaching gaps in the existing pilot units: diagnosing rest/release or crossing errors by comparing the learner's own attempts. These are distinct self-evaluation objectives, rather than new lessons made by renaming the pilot. They become ready for authoring after the original path promotion. Listing gaps does not write anything:

```sh
node scripts/create-guided-lesson.js --list-gaps
node scripts/create-guided-lesson.js --gap guitar-rest-release-diagnosis --spec /absolute/path/to/authored-guided-spec.json
```

The JSON spec has `id`, `author`, `markdown` (the complete authored format-2 document), and `reuseApprovedPattern: true` only for an exact approved-pattern variation. Give the approved gap objective as `summary.en`, complete six-language titles/objectives and localized content in every stable step, and bind course/unit/instrument/revision/assessmentVersion to the existing path. Author substantive new teaching, attempts, plausible-error feedback and transfer. The helper isolates the document, records a stable queue item and target, and leaves production/navigation unchanged. A newly registered candidate joins a batch only through a subsequent `select <local-date>`; select it after authoring and before review/promotion. Never append it manually to an already selected or uncertain batch. A different revision is reconciled through `update-item` and `reselect`; it does not consume a second new identity for the same gap.

A reusable pattern keeps every fenced exercise byte except its stable exercise ID, the same capabilities, instrument and setup, and the approved origin's exact document and public approval digests. Pattern proof is checked against the registered owner-approved pilot transaction and real production source. New notes, durations, tempo, positions, tuning, screen assessments or exercise order fail equivalence. A distinct objective is required; independent review must reject superficial repetition or physical instructions that add a gesture despite unchanged exercises. Set `reuseApprovedPattern: false` for new physical material; it remains a new-model draft requiring human playthrough and a separate explicit promotion.

Run the real parser/auditor and record current parser, independent music and six-language evidence through `record-review`. Approved variations require `parser.kind: source-parser`, `languages.kind: independent-language-review` plus all six `locales`, and `independent.kind: independent-content-review`. The independent reviewer differs from the author and explicitly records `scope: approved-pattern-variation`, `noNewPhysicalPattern: true`, `substantiveObjective: true`, the origin `patternSHA256` and `originDocumentSHA256`. Every record names its reviewer, strict ISO8601 date-time with seconds and timezone (`Z` or `±HH:mm`), and the candidate `contentSHA256`. Date-only, no-timezone and invalid calendar timestamps are rejected before promotion. These are current reviews, not claims of human sampling or a future owner signature.

```sh
node scripts/editorial-pipeline.js gate guided-gap-guitar-rest-release-diagnosis
node scripts/promote-approved.js --kind guided-gap --id guided-gap-guitar-rest-release-diagnosis --runtime-config /absolute/path/to/pinned-runtime.json
node scripts/editorial-pipeline.js reselect <same-precommit-batch-key>
```

Pass `--runtime-config` to promotion or set `EDITORIAL_RUNTIME_CONFIG` to the same verified persistent configuration. The guided-gap transaction first stages the complete future index and every referenced document privately and runs the actual Swift `--paths` validation. A failure preserves the diagnostic stage and writes no published target or promoted journal. It then stages a journal before writing, appends exactly one `extra` to its existing unit, and binds the new document to an independent `guided-extra-delta` approval. It embeds the intact previously approved path; instrument/setup, all prior placements and prerequisites, required identities and spineVersion remain identical. The original owner approval covers its original pilot bytes. The public proof binds the new complete manifest and exact document hash union; DATA and APP verify the same proof. Chains over 128 deltas fail closed and require reconciliation before another addition. Repeated promotion reconciles the same ID/bytes; third-party changes are preserved. Refresh the complete Swift receipt and independent publication review after promotion, then follow the existing normal commit/push/deployment/notification pipeline. No new guided extras are published merely by listing or authoring a gap.
