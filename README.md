# Instrument Scales Online Data

Static content and editorial source for Instrument Scales. Published education remains schema-2 Markdown. The legacy archive has **838 lessons** and 35 dated riffs; the 3 October producer commit `448975f` added three lessons while implementation began. Those additions were preserved.

## Published and candidate content

- `v2/education/courses.json` and the two course catalogs retain all released identities and URLs. The four existing free sample IDs remain in their original order. The 24 physical Scale prerequisites are optional; the six adaptive Harmony prerequisites remain required.
- `v2/education/paths.json` is the isolated format-2 path index. It currently contains **no approved paths**. Older clients cannot reach guided directives through `courses.json`.
- `editorial/candidates/paths.json` and `editorial/candidates/guided/` contain the authored review pilot: guitar 12, bass 6, piano 6, high-G ukulele 6 and mandolin 6. Six locales, six concept quizzes and two screen-rhythm exercises accompany playable examples, feedback and transfer. Four core placements, one transfer and one extra form each pilot unit. Candidates require physical playthrough; they are never copied into Pages.
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

A review snapshot is local, explicitly marked `review-pending`, and excludes candidates. Production uses `node scripts/validate-editorial.js --publication` and `node scripts/build-pages.js`, requiring the concrete independent review receipt. Equivalent repairs need independent review, not an additional owner permission gate. Physical proposals and new path spines still require content-hash-bound human playthrough records. No human signature or playthrough is fabricated.

Pages validates identities/free samples/required prerequisites, both parser receipts and publication review, then uploads one complete artifact. `snapshot.json` records the publishing commit and every served file hash. The smoke job retries CDN propagation and checks the expected commit plus all served bytes. The product/support site is included only after its explicit enablement. Publisher state has a stable repository identity independent of origin URL spelling, with a separate private recovery mirror. Missing identity, outcome ledger or an uncertain active checkpoint fails closed; use explicit coordinator recovery. Private persistent state under `~/Library/Application Support/InstrumentScalesEditorial/state/` contains attempts, waiting outcomes, delivery confirmations and immutable snapshots. Tracked queue definitions do not become dirty after a deployment. Immutable local snapshots and quarantine records support recovery by a new corrective commit; never reset history or remove learner data.

See [OPENCLAW.md](OPENCLAW.md) for complete selection, deferral, publication reconciliation and promotion commands. `editorial/queue.json` is the sole active queue. The published historical syllabus is archived, not a competing source of open work. Historical seed generators refuse the mature repository; `create-lesson.js` writes candidates and never appends navigation or prerequisites.
