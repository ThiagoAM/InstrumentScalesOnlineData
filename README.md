# Instrument Scales Online Data

This repository is the static content source for Instrument Scales. V2 is the active education contract. V1 is frozen legacy source kept for released app versions.

## Source layout

```text
v2/education/courses/instrument-scales/
├── course.json
├── catalog.json
└── sections/<section>/units/<unit>/lessons/<lesson>/lesson.md

scripts/
├── generate-sample-v2.js
├── validate-v2.js
└── build-pages.js

legacy/v1/
├── data/       # the former public v1 tree
├── scripts/    # V1-only creation and validation tools
├── tests/      # V1-only tests
└── README.md
```

Do not add V1 files back at the repository root. The Pages build copies `legacy/v1/data` to `dist/v1`, so existing `/v1/...` URLs remain unchanged. It copies current `v2` source to `dist/v2`.

## V2 learning model

The course has three ordered sections: `beginner`, `intermediate`, and `advanced`. Tapping a section in the app opens its unit path. Each section contains ordered thematic units; each unit contains ordered lessons. Higher unit numbers should require more coordination, listening, or theory than earlier units.

`catalog.json` is the navigation payload. It contains localized section, unit, and lesson metadata so the app can draw the path without downloading every lesson. Lesson bodies are fetched lazily from the referenced `lesson.md` path.

The initial curriculum contains three sections, two units per section, and two lessons per unit (12 lessons). Lessons are deliberately short and varied across ear training, fretboard, keyboard, rhythm, theory, and improvisation.

## Lesson contract

Each lesson is one Markdown file with:

- schema, stable IDs, hierarchy, order, revision, duration, and instrument in front matter;
- localized title and summary for `en`, `pt-BR`, `es`, `de`, `ja`, and `zh-Hans`;
- one localized body and checkpoint for every required locale;
- at least one playable `notes` or `fretboard` block;
- one narrow objective that fits in roughly 5–8 minutes (validator range: 3–10).

The catalog path must exactly match:

```text
sections/<section-id>/units/<unit-id>/lessons/<lesson-id>/lesson.md
```

See [OPENCLAW.md](OPENCLAW.md) for the authoring workflow and quality rubric.

## Validation

From the repository root:

```bash
node scripts/validate-v2.js
node --test tests/*.test.js
node legacy/v1/scripts/validate-education.js legacy/v1/data/education
node --test legacy/v1/tests/*.test.js
node scripts/build-pages.js
```

`validate-v2.js` checks hierarchy and order, slug IDs, six-locale coverage, duration, activity, exact paths, front-matter/catalog agreement, localized checkpoints, playable content, and duplicate lesson IDs.

`generate-sample-v2.js` is deterministic and rebuilds the starter curriculum. Treat it as seed tooling, not the normal way to edit a mature catalog: running it overwrites the starter V2 course.

## Publishing

`.github/workflows/pages.yml` validates both versions, builds `dist`, and publishes the Pages artifact on pushes to `main`. V1 public endpoints remain available even though their source now lives under `legacy/v1`.
