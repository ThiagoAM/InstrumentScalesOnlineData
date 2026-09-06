# Instrument Scales Online Data

This repository is the static content source for Instrument Scales. V2 Markdown is the only education contract. Older courses, JSON lesson assets, and their authoring tools have been removed.

## Source layout

```text
v2/education/
├── courses.json
├── syllabus.json
└── courses/<course>/
    ├── course.json
    ├── catalog.json
    └── levels/<level>/sections/<section>/units/<unit>/lessons/<lesson>/lesson.md

v2/daily/riffs.json

scripts/
├── generate-scale-lessons.js
├── generate-harmony-lessons.js
├── validate-v2.js
├── audit-v2-bulk.js
└── build-pages.js

v1/
├── home/      # retained non-education endpoint
└── toggles/   # retained app feature configuration
```

The Pages build publishes V2 education to `dist/v2` and preserves home/toggles URLs under `dist/v1`. `/v1/education` is no longer published. The source-format policy rejects retired education trees and JSON lesson files before generation or publishing.

## V2 learning model

Each course has three ordered sections: `beginner`, `intermediate`, and `advanced`. Tapping a section in the app opens its unit path. Each section contains ordered thematic units; each unit contains ordered lessons. Higher unit numbers should require more coordination, listening, or theory than earlier units.

`catalog.json` is the navigation payload. It contains localized section, unit, and lesson metadata so the app can draw the path without downloading every lesson. Lesson bodies are fetched lazily from the referenced `lesson.md` path.

The published curriculum contains 655 lessons across Instrument Scales and Chords & Harmony. It preserves 55 foundational or previously released lessons and adds 100 optional 5–8 minute lessons to every section of both courses.

## Lesson contract

Each lesson is one Markdown file with:

- schema, stable IDs, hierarchy, order, revision, duration, and instrument in front matter;
- localized title and summary for `en`, `pt-BR`, `es`, `de`, `ja`, and `zh-Hans`;
- one localized body and checkpoint for every required locale;
- at least one playable `notes` or `fretboard` block;
- one narrow objective that fits in roughly 5–8 minutes (validator range: 3–10).

New catalog paths must exactly match:

```text
levels/<level>/sections/<section-id>/units/<unit-id>/lessons/<lesson-id>/lesson.md
```

Previously released Instrument Scales lessons retain their shorter `sections/...` paths so existing public URLs remain valid.

See [OPENCLAW.md](OPENCLAW.md) for the authoring workflow and quality rubric.

## Validation

From the repository root:

```bash
node scripts/validate-v2.js
node scripts/audit-v2-bulk.js --no-revision-one
node --test tests/*.test.js
node scripts/build-pages.js
```

`validate-v2.js` checks both course trees, hierarchy and order, slug IDs, six-locale coverage, duration, activity, exact paths, front-matter/catalog agreement, localized checkpoints, playable content, Daily Riffs, and duplicate lesson IDs. `audit-v2-bulk.js` adds focused anti-template, localization, and duration checks for the 600 expansion lessons.

`generate-sample-v2.js` is deterministic and rebuilds the starter curriculum. Treat it as seed tooling, not the normal way to edit a mature catalog: running it overwrites the starter V2 course.

## Publishing

`.github/workflows/pages.yml` validates V2 and the education-format policy, builds `dist`, and publishes the Pages artifact on pushes to `main`. Only the unrelated V1 home and feature-toggle endpoints remain. Older app versions that require V1 education will no longer load those retired courses after deployment.
