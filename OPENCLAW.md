# OPENCLAW.md — editorial operation

Maintain the approved archive and editorial queue. Treat **up to three items**, with zero publications allowed. A run is not a quota of new lessons. Preserve the configured schedule, author model/effort, access rights and Telegram destination; this repository does not change them or send notifications automatically.

## Safety and authority

Before work or a disk write, inspect the Mac disk-maintenance record. If active, read only that record, finish an already atomic operation, preserve a checkpoint, report paths/processes to the coordinator and wait for explicit release. Do not begin a build. Use the current Developer layout and the repository's existing checkout; do not recreate historical paths.

`editorial/publisher.json` names the single publishing Mac. Other hosts may author candidates. The local publisher lock records host, PID, token and start; age is not permission to delete it. Normal Git fast-forward rules, current remote state and Pages checks also apply. Recent commit attribution does not prove an older Raspberry Pi producer is disabled. Resolve concurrent authors before enabling publication.

The real implementation record is `~/Library/Application Support/MacMiniServer/scheduled-jobs/instrument-lessons/implementation-lock.json`. A normal run stops while it is active. Only this implementation's explicitly authorized coordinator may set `INSTRUMENT_SCALES_EDITORIAL_COORDINATOR` to the exact recorded coordinator_thread; there is no generic bypass or age expiry. The disk-maintenance record always stops writes/builds and is never bypassed by that identity. An implementation/maintenance pause established by the coordinator takes precedence over these commands. Never force-push, reset unique work, run general disk cleanup, create a new mandatory lesson, expand an enrolled spine or change prices/access.

## One authoritative queue

`editorial/queue.json` contains stable item ID, repair/riff/review/gap type, goal, instrument/setup, source, unit, blueprint/revision, six locales, author, content digest, review evidence and publication attempt. `syllabus.json` is archived history only.

Priority: opening/music repair; riffs when the consecutive dated horizon for that instrument/setup is below seven days (adaptive batches use the minimum across their declared families); quality review; an explicitly approved blueprint gap. The routine does not create units. New core placement requires a separate promotion. Published rotation material always retains its original date and finite validity; expired or incompatible stock is ineligible. Recycled riffs must be labelled as rotation, not newly published.

The state namespace is stable across HTTPS/SSH origin spellings. Before initial implementation selection, the coordinator may initialize an unpublished state; after a published snapshot, use actual P0 reconciliation or restore the known recovery copy. Never reset to an empty ledger after losing state:

```sh
node scripts/editorial-pipeline.js state-init "Initial coordinator implementation checkpoint"
node scripts/editorial-pipeline.js restore-state
```

A separate private `.recovery` mirror preserves identity, attempts, waiting/done outcomes and snapshot metadata. A missing outcome ledger or uncertain active pointer stops selection. Restore preserves the old directory; a missing full archive may be rebuilt from its exact committed manifest rather than deleting unique work.

Read-only preview and durable selection:

```sh
node scripts/editorial-pipeline.js dry-run 2026-10-03
node scripts/editorial-pipeline.js select 2026-10-03
node scripts/editorial-pipeline.js resume
node scripts/editorial-pipeline.js resume <batch-key>
```

Omitting the date uses America/Sao_Paulo, including the 21h run after UTC midnight; an explicit ISO date permits replay. Selection records IDs before authoring. Its key depends on IDs, blueprint, revision and content, not only the day. Definitions are tracked, but attempts/outcomes live in the private persistent state directory. The total daily allowance conservatively combines reservations with items confirmed on the actual local publication day. An inherited lot confirmed after midnight consumes the new day, regardless of its original ISO selection/replay date. It is three distinct items across attempts, not three per invocation. The one-time coordinator P0 intervention does not consume dozens of scheduled nights. Uncertain commit/push/deploy/notification work resumes the same batch before another publication. If a reviewed batch cannot publish, explicitly defer it:

```sh
node scripts/editorial-pipeline.js defer <batch-key> "Awaiting the recorded physical playthrough"
node scripts/editorial-pipeline.js defer <batch-key> "Only these targets need correction" --ids item-a,item-b
```

Automatic deferral first verifies the global parser receipt; a stale receipt does not label every item a human failure. Explicit --ids can defer a selected target without that conflation. Deferral is available through review-approved before a commit; committed/pushed uncertainty stays in the same attempt. Deferral persists waiting state only for failed/missing-evidence items; ready items remain eligible. It records content/evidence digests and closes the batch without publication. Unchanged items are skipped next time, allowing other eligible work such as a riff. A changed revision/content or new review evidence permits a new attempt. Do not defer a batch with an uncertain commit, push, deployment or notification; reconcile it instead.

## Author candidates and review actual bytes

The six locales are en, pt-BR, es, de, ja and zh-Hans. Use one observable objective, explicit setup/register, practical attempt, plausible-error feedback and a small transfer. Hearing an app demonstration, a concept answer, a screen tap and a reported physical attempt are different evidence. Never claim automated instrumental recognition.

Guided documents stay under `editorial/candidates/`, use schema 2 plus format 2, assessment version, capabilities, stable `:::step id=... phase=...` boundaries and complete localized regions. Exercises shared outside those regions have stable IDs. Root production `paths.json` reaches approved content only. Never place guided directives in a legacy catalog path.

For a legacy extra candidate, the compatibility helper remains available:

```sh
node create-lesson.js --spec /absolute/path/to/authored-spec.json --locales en,pt-BR,es,de,ja,zh-Hans
```

Use `course` explicitly for Harmony. The deprecated `--tier max` argument is accepted solely for older callers; Premium lessons are available to Pro and Max. The helper writes Markdown under candidates, records one queue item and leaves catalog/navigation unchanged. It rejects new mandatory content. Mature seed generators cannot rewrite released lessons. The concentrated repair scripts are historical intervention tools, not daily regenerators; do not rerun them over quarantined production files.

Run the actual parser auditor using the persistent runtime configuration described in README. Validate all locales, catalog metadata, objectives/notes, exact geometry, musical assertions and every riff. `audit-v2-bulk.js` applies its full authoring rubric to every new ID, regardless of prefix or revision.

After authoring changes the selected source or revision, update the definition with a JSON record containing source/revision/setup/objective and rebind the same selected IDs; the CLI computes the new content hash and clears stale reviews:

```sh
node scripts/editorial-pipeline.js update-item <item-id> /absolute/path/to/authored-update.json
node scripts/editorial-pipeline.js reselect <batch-key>
```

Review evidence JSON records name a gate (parser, languages, independent, playthrough or recipe-sampling), status, identified reviewer, reviewedAt and the current `contentSHA256`. Human playthrough additionally has `kind: human`. Independent reviewer must differ from author. Record the real review and test its gate:

```sh
node scripts/editorial-pipeline.js record-review <item-id> /absolute/path/to/review-record.json
node scripts/editorial-pipeline.js gate <item-id>
```

update-item cannot approve a blueprint, assign an approved recipe or expand targets. Those are explicit review/promotion decisions. Core and new physical patterns need integral human playthrough. Equivalent repairs use their full event/prose proof and independent review; no new owner permission is introduced. Authorized recipe variations need independent review plus a recorded human sampling plan. The approvedRecipeDigest must match an actually approved definition in editorial/recipes.json and its recorded human pattern review. Event-equivalent repairs use their own proof directly and are not misrepresented as a human-approved recipe. Record an actual recipe sampling decision with gate: recipe-sampling, kind: human, status: approved, reviewer, reviewedAt, contentSHA256, recipeSHA256 and a concrete plan; use the same record-review command. The definition registry includes its own exact digest, independent review and identified human pattern playthrough. Missing or stale evidence means draft/defer, not a fabricated approval.

## Prepare complete snapshots and reconcile publication

```sh
node scripts/validate-v2.js
node scripts/audit-v2-bulk.js --no-revision-one
node scripts/audit-swift-parser.js --verify
node scripts/validate-editorial.js --publication
node --test tests/*.test.js
node scripts/build-pages.js --review-snapshot
node scripts/editorial-pipeline.js snapshot
```

The initial P0 independent review receipt covers every reviewed equivalent repair and safe fallback, and binds the entire published V2 inventory plus every actually served source file and snapshot digest. Future review may document a delta and carry unchanged hashes forward; it cannot reuse a stale approval after another lesson, riff, asset or catalog changes. Candidates staying outside production do not need publication approval merely to exist. Complete unreviewed physical proposals remain isolated. A local `build-pages.js --review-snapshot` can prepare a labelled artifact for review; that flag is absent from CI and does not authorize a deployment.

Use `checkpoint` with a structured evidence file for each state, in this order:

```sh
node scripts/editorial-pipeline.js checkpoint <batch-key> validated /absolute/path/to/parser-evidence.json
node scripts/editorial-pipeline.js checkpoint <batch-key> review-pending /absolute/path/to/review-request.json
node scripts/editorial-pipeline.js checkpoint <batch-key> review-approved /absolute/path/to/approved-snapshot.json
```

Record the real completed independent review (status: approved, reviewer, reviewedAt, reviewReference, and a documented delta when carrying unchanged files forward). The command verifies the committed parser runtime receipt and computes every reviewed file hash; it cannot use a candidate playthrough as publication approval:

```sh
node scripts/editorial-pipeline.js record-publication-review /absolute/path/to/completed-independent-review.json
```

The review-approved checkpoint accepts reviewReference only; it calculates contentSnapshotSHA256 itself from the actual production file inventory. This digest excludes publishing-commit metadata and remains stable when the commit is created. Review-approved reloads current review evidence for the same selected identity/revision/content digest. After creating the reviewed commit through the normal publisher, record its actual 40-character SHA:

```sh
node scripts/editorial-pipeline.js checkpoint <batch-key> commit-created /absolute/path/to/commit-evidence.json
GITHUB_SHA=<actual-data-commit-SHA> node scripts/build-pages.js
node scripts/editorial-pipeline.js finalize-snapshot <batch-key>
node scripts/editorial-pipeline.js checkpoint <batch-key> push-confirmed /absolute/path/to/push-evidence.json
node scripts/editorial-pipeline.js verify-deployment <batch-key> https://thiagoam.github.io/InstrumentScalesOnlineData
node scripts/smoke-pages.js https://thiagoam.github.io/InstrumentScalesOnlineData
```

The final approved artifact is built and archived AFTER the commit, with the same publishing SHA the CI will serve. finalize-snapshot verifies every file against that real commit and the reviewed content digest; an old pre-commit snapshot cannot be confirmed as pushed. The commit evidence contains `commit`; push evidence may contain `remoteCommit`, but the CLI queries and records actual remote main rather than trusting that value. Other state evidence keys are rejected; deployment-confirmed cannot be supplied as a checkpoint. The CLI checks the real local commit and its source bytes, then queries actual remote main. Git push is not a deployment confirmation. Inspect the GitHub Pages deployment status and verify its complete served snapshot. On byte/status failure retain the same attempt, repair or wait for CDN, and never generate a new batch merely because notification failed.

If push is refused or CI needs a correction, reconcile normal Git history, commit the descendant fix and rebind the same attempt:

```sh
node scripts/editorial-pipeline.js rebind <batch-key> <actual-descendant-SHA>
GITHUB_SHA=<actual-descendant-SHA> node scripts/build-pages.js
node scripts/editorial-pipeline.js finalize-snapshot <batch-key>
```

This preserves review only when served content is unchanged. If reviewed content changes, use rebind with --content-changed, refresh actual parsers/item evidence/publication review, then checkpoint review-approved and commit-created again. Do not edit checkpoint JSON manually. A partial build remains preserved; resume the identical commit and bytes with `node scripts/build-pages.js --resume-build`. Unknown or changed partial files are rejected. To stop an obsolete partial build, `node scripts/build-pages.js --discard-partial "Concrete reconciliation reason"` preserves its stage/backup/journal in an owned archive before a new build.

The coordinator reconciles the one-time complete P0 intervention after its real deployment:

```sh
node scripts/editorial-pipeline.js reconcile-p0 <actual-data-commit-SHA> https://thiagoam.github.io/InstrumentScalesOnlineData
```

This verifies the complete real served snapshot and exact commit bytes, marks delivered equivalents done in private state, and records safe fallbacks separately from human-pending physical proposals. Repeat selection reconciles terminal attempts without leaving tracked queue definitions dirty.

The prepared commercial site stays disabled in production/smoke inventories. Only a separate explicitly reviewed enablement commit may set enabled: true, status: enabled, enabledAt and intervention in editorial/site-publication.json.

Only after the separately authorized notification tool succeeds, record its returned ID (or an explicit authorized skip):

```sh
node scripts/editorial-pipeline.js checkpoint <batch-key> notification-recorded /absolute/path/to/notification-evidence.json
```

The repository CLI sends no Telegram message. Notification evidence has `notificationID` or `notificationSkipped`; reconcile an uncertain send before retrying it.

## Promote reviewed candidates later

There is no blanket supersedes mapping. Reuse an exact legacy lesson with its canonical progress identity; a substantive rewrite keeps its new guided identity. Freeze enrolled required IDs and spine version. A corrected editorial revision does not create a new assessment unless its skill changes.

For a quarantined legacy repair, prepare final revision bytes first:

```sh
node scripts/promote-approved.js --kind prepare-legacy --id <legacy-lesson-id>
```

Set EDITORIAL_RUNTIME_CONFIG to the committed persistent configuration for every promotion. This writes only a prepared candidate plus an unsigned approval request, increments beyond the served fallback revision and validates that exact document. The human fills the explicit review record after playthrough, not the agent. It includes `kind: human`, `approvedBy`, `approvedAt`, `playthrough: completed`, `documentSHA256`, approved independent review and approved six-language review. A digest is not a digital signature or independent proof of reviewer identity.

```sh
node scripts/promote-approved.js --kind legacy --id <legacy-lesson-id> --approval /absolute/path/to/completed-human-record.json
node scripts/promote-approved.js --kind path --id guitar-foundation --approval /absolute/path/to/completed-path-human-record.json
```

Coordinated legacy/path records include status prepared→promoted, original/after hashes, exact sources and target files, aggregate files, immutable published content hashes and approval digest. A journal is staged before the first destination write; resume accepts only before/after bytes and preserves third-party changes. Path records bind every `guided:<lesson-id>` to the exact bytes. The current APP path approval contract does not include visual asset hashes. Therefore every image-bearing path document, including reused legacy content and images in any locale, is rejected before path staging/promotion and by publication validation, even if a record supplies assetSHA256. There is no production override. Ordinary navigation/download links remain links. Local asset verification/copy helpers remain available for isolated infrastructure fixtures and supported legacy transactions; they do not authorize images in a production path. A coordinated APP/DATA approval-contract update and real checks are required before that support can be enabled. Legacy records bind the canonical destination file. Promotion validates with the actual current Swift CLI, refuses missing/stale approval, preserves original/proposal history, writes assets before the isolated index and never silently replaces an existing enrollment spine. It does not commit or push. Refresh both real parser receipts and the independent review for the complete new snapshot before using the normal publication states.

Approved dated riffs and legacy optional gaps have concrete target promotion commands:

```sh
export EDITORIAL_RUNTIME_CONFIG="/Users/thiagomartins/Library/Application Support/InstrumentScalesEditorial/parsers/active-runtimes.json"
node scripts/promote-approved.js --kind riff --id <queue-item-id>
node scripts/promote-approved.js --kind gap --id <queue-item-id>
node scripts/editorial-pipeline.js reselect <same-precommit-batch-key>
```

A dated riff is one editorial item with its own riffID, even when its reviewed source JSON holds seven candidates. The actual current Swift parser checks the authored source before any target write. A riff target records the exact delivered entry hashes in v2/daily/riffs.json; a gap copies the exact schema-2 draft, local approved visual assets and optional metadata into an existing unit. IDs/dates with different released music cannot be overwritten. Gap order must already be contiguous before review. Repeated promotion is idempotent. Refresh the complete parser/publication review receipt before committing; candidate existence alone never counts as delivery. To preserve legacy date uniqueness, dated riffs are universal across the five families without setup; instrument-specific work stays in the isolated path contract. Horizon still checks each applicable instrument/setup and rotation expires.

A completed human-approved path/legacy promotion uses an explicit coordinator lane, rather than squeezing a curriculum spine into the daily three-item routine:

```sh
node scripts/editorial-pipeline.js start-coordinated-promotion /absolute/path/to/editorial/promotions/completed-record.json
```

The coordinator identity must match publisher.json; status promoted, integral approval, current target bytes and actual item gates are verified. The resulting batch uses normal review/commit/snapshot/push/real-deployment checkpoints and private completion, with a named intervention exemption. Path human approval also binds pathManifestSHA256 for the exact setup, prerequisites, roles and spine. Aggregate catalog/index hashes are historical in prior promotion records; current MD/assets and semantic path approvals remain checked.

verify-deployment uses only the configured production Pages URL, eight concurrent requests and bounded retries. --allow-local-fixture is available only for an explicitly marked synthetic publisher fixture at localhost; it never substitutes for the production smoke/reconciliation.

A failed human review produces quarantine and a new corrective publication, not Git reset or deleted history:

```sh
node scripts/editorial-pipeline.js quarantine <snapshot-key> "Concrete musical or physical review failure"
```

Keep the prior validated snapshot, restore its manifest/content via a new reviewed commit, verify actual served bytes and retain every released identity, progress record and access right.

## Final recovery and retention controls

A coordinated promotion is one complete transaction per review/commit/deployment cycle. Keep the implementation lock active for the entire intervention, starting before `promote-approved` and ending only after actual deployment, notification reconciliation and terminal handoff. The coordinator identity must match its record throughout this operation. This also prevents nightly selection from capturing promoted open items before `start-coordinated-promotion`.

Finish real deployment and private reconciliation before staging another promotion that changes the same catalog/index. Normal scheduled execution cannot resume an uncertain coordinator batch or reselect, defer, checkpoint, rebind, finalize or confirm that intervention without its explicit coordinator identity. Once its batch is terminal (`notification-recorded`, `deferred`, or quarantine without an uncertain commit), the next `select` returns to scheduled selection; it does not require the lane identity. A quarantined batch with a commit remains uncertain and requires reconciliation. Release the implementation lock only after this handoff is verified.

New private outcomes use `verifiedSnapshotKind: "artifact-tree-with-manifest"` and `verifiedSnapshot` for the full delivered tree including the exact `snapshot.json` bytes. The smoke response retains `snapshotSHA256` for its existing meaning (content without the manifest) and adds `artifactSHA256`; P0 also retains `verifiedContentSHA256`. Historical outcomes without a kind are preserved without reinterpretation. Retention still requires an exact full-tree hash match, so an old content-only P0 hash cannot authorize removing a copy.

If a crash splits the authoritative batch and active pointer, the coordinator can repair only the pointer, preserving both prior states and requiring valid identity, history and committed targets:

```sh
node scripts/editorial-pipeline.js reconcile-active <known-batch-key> "Concrete crash reconciliation reason"
```

This does not create approval, mark delivery or forgive a second uncertain attempt. If history or targets do not validate, restore the known recovery copy and reconcile the failure explicitly.

Owned complete output retention is opt-in and defaults to dry-run:

```sh
node scripts/editorial-pipeline.js prune-outputs --keep 2 --reason "Verified published copies retained"
node scripts/editorial-pipeline.js prune-outputs --keep 2 --reason "Verified published copies retained" --execute
```

Only known `builds/previous-*` and full snapshot directories whose exact hashes match confirmed private delivery outcomes and reconstructible Git commit bytes are eligible. At least two verified copies, active/quarantined snapshots and all pending/uncommitted/unknown output are preserved. An exact manifest is archived before removing an eligible owned full copy; source, runtime, learner data and unrelated caches are untouched. The recovery mirror is on the same disk and does not replace off-device backup.

Authoring and gap promotion reserve `scale-` and `harmony-` IDs for the fixed foundation inventory. Existing historical identities are retained; new editorial IDs use their own names. Inventory hashes use code-unit ordering, independent of the host locale. The baseline parser is pinned to exact commit `5eab79a24efff87423d026784d06b503afb0184f`; drift is rejected.

The isolated coordinator fallback test covers an empty CI-shaped environment without changing HOME or bypassing the real host guards. The first actual GitHub runner validates the complete environment without this Mac's private records; those are separate evidence scopes.


Initialization writes a private `initialization.json` intent before the first outcome ledger. If the process stops between ledger and identity, replay the same `state-init` reason (for a draft fixture/state) or the same `reconcile-p0` commit/URL after verifying deployment again. The journal binds the exact state root, repository, identity, outcome hashes and delivery intent; pending initialization blocks selection. Only a known prepared journal with matching files/recovery and matching replay intent can complete. P0 replay may re-observe a later completedAt, but cannot change fingerprints, status, commit, snapshot or any other evidence; the initialization retains its originally recorded timestamp. Unknown/orphan/corrupted state is preserved and refused. Completed journals are kept as provenance; established state from older versions remains valid and uses normal recovery.


Initialization recovery is bounded, not a promise of complete crash or power-loss safety. The tested process exits cover the direct initializer after ledger, identity and mirrored-ledger writes; the real Git/HTTP P0 replay preserves the first completedAt for the same identity, commit, fingerprint and served snapshot. Full job crashes inside reconcile-p0, journal-to-ledger and mirror-to-state gaps are not all exercised. Atomic rename can leave an unrecognized temporary file, previous-copy truncation can fail JSON parsing, and there is no fsync/power-loss guarantee. Preserve those files and the recovery directory for coordinator inspection; do not delete a ledger or journal or adopt an unknown temp to make selection proceed.

A prepared journal cannot use restore-state: it is refused before any directory move. Reconcile the existing publisher lock, then repeat the same P0 commit/Pages URL without advancing HEAD or deployment first. Only completed known state can use the normal verified mirror recovery. The state root is bound to its exact canonical absolute path; the native routine must use the default path, without aliases, symlinks, HOME changes or EDITORIAL_STATE_ROOT overrides. Restore the canonical invocation before attempting recovery; no automatic root migration is provided. dry-run now requires a completed, valid publisher state before suggesting any selection.
