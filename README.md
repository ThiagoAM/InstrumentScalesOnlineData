# Instrument Scales Online Data

This repository is a static content bundle for the Instrument Scales app. It does not contain app source code or a build pipeline; it contains JSON payloads and a few images that the app can fetch directly over HTTP.

The repository is organized like a small read-only API:

- `v1/education/` contains course catalogs and lesson content.
- `v1/home/` contains the home screen "what's new" and tips payloads.
- `v1/toggles/` contains lightweight feature flags.

The top-level `v1/` directory is the current published API version. Future breaking changes should go into a new sibling version such as `v2/`, instead of changing the `v1/` path layout in place.

At the moment the repository holds:

- 6 course entries
- 18 sections
- 48 units
- 145 lessons
- 6 course cover images

## Top-level structure

```text
.
├── v1/
│   ├── education/
│   │   ├── free/
│   │   │   ├── courses.json
│   │   │   ├── images/
│   │   │   └── courses/<course-id>/...
│   │   └── max/
│   │       ├── courses.json
│   │       ├── images/
│   │       └── courses/<course-id>/...
│   ├── home/
│   │   ├── home.json
│   │   └── home-dev.json
│   └── toggles/
│       ├── feature-toggles.json
│       └── feature-toggles-dev.json
└── README.md
```

`free` and `max` are parallel catalogs. In the current data, `free` contains the introductory tracks (`guitar-free`, `bass-free`, `piano-free`) and `max` contains the full tracks (`guitar`, `bass`, `piano`).

## How `v1/education/` works

The `v1/education` directory is hierarchical. Each level has a catalog file, and each catalog entry points to a child directory with the same slug-like `id`.

The traversal pattern is:

1. Read `v1/education/<tier>/courses.json`.
2. Pick a course entry such as `guitar` or `bass-free`.
3. Read `v1/education/<tier>/courses/<course-id>/sections.json`.
4. Pick a section entry and read `sections/<section-id>/units.json`.
5. Pick a unit entry and read `units/<unit-id>/lessons.json`.
6. Pick a lesson entry and read `lessons/<lesson-id>/lesson-content.json`.

Example path:

```text
v1/education/max/courses/guitar/sections/guitar-fretboard-foundations/units/landmarks-and-positions/lessons/low-e-string-landmarks-3rd-5th-7th-12th-frets/lesson-content.json
```

Each course directory also has a `lessonIDs.json` file. That file is a flattened index of lesson paths for the course, useful when the app needs a quick list of all lesson identifiers without walking the full tree.

## JSON conventions

Most content files follow a consistent pattern:

- `id` is the stable identifier and also the directory name.
- `order` controls display order inside a catalog array.
- `createdAt` and `updatedAt` track content timestamps.
- Localized strings live under `values`, for example `name.values.en` or `summary.values.pt-BR`.
- Education content mostly uses these locale keys: `en`, `pt-BR`, `es`, `de`, `ja`, `zh-Hans`.

### Catalog files

Catalog files are array-based listings:

- `courses.json` has a top-level object with metadata plus a `courses` array.
- `sections.json`, `units.json`, and `lessons.json` are arrays of entries.

Common catalog fields include:

- `id`
- `name`
- `summary` or `description`
- `image`
- `tags`
- `level`
- `difficulty`
- `order`
- `createdAt`
- `updatedAt`

### Lesson content files

Each `lesson-content.json` file is a leaf payload with this shape:

- `id`
- `blocks`
- `tests`
- `createdAt`
- `updatedAt`

Right now, lesson bodies are stored as `blocks` with `type: "text"` and a localized markdown string in `value.values.<locale>`. The `tests` arrays are present but currently empty in the sampled content, which suggests the app already has a place for future quizzes or checks even though they are not populated yet.

## Images

Course cover images live in:

- `v1/education/free/images/`
- `v1/education/max/images/`

The course JSON points at fully qualified URLs such as:

```text
https://thiagoam.github.io/instrumentScales/api/v1/education/max/images/guitar.jpg
```

That means this repository is intended to be published on a static host while preserving its folder layout. If the hosting base URL changes, the image URLs in the JSON need to change too unless the app rewrites them at runtime.

## Other directories

### `v1/home/`

`v1/home/home.json` and `v1/home/home-dev.json` provide localized home-screen content:

- `whatsNew`
- `tips`
- `updatedAt`

One detail to keep in mind: `v1/home` uses `zh-CN`, while `v1/education` uses `zh-Hans`. If the app shares locale mapping logic across both datasets, it should normalize those Chinese locale keys.

### `v1/toggles/`

`v1/toggles/feature-toggles.json` and `v1/toggles/feature-toggles-dev.json` are simple environment-specific feature flag payloads. Right now they only expose `display-pro-version-for-everyone`.

## Versioning policy

- Use `v1/`, `v2/`, and so on for breaking changes to paths, file structure, field names, or content contracts that older app versions might not understand.
- Do not create a new API version for normal content edits. Regular lesson, catalog, home, and toggle updates should continue inside the current version directory.
- When a future `v2/` is introduced, keep `v1/` intact for older app releases until they are no longer supported.

## How to add or change course content

When adding content, keep the tree and the parent indexes in sync:

1. Update the parent catalog file (`courses.json`, `sections.json`, `units.json`, or `lessons.json`).
2. Create the matching child directory using the same `id`.
3. Add the next catalog file or `lesson-content.json` in that directory.
4. Update the course-level `lessonIDs.json` if a lesson was added, removed, or renamed.
5. Keep `order`, locale coverage, and timestamps consistent with nearby entries.
6. If you add media, place it under the correct image folder and reference the final hosted URL.

When editing localized content, update **every existing locale** in that payload, not just `en`. In `education`, lesson and catalog text is expected to stay aligned across `en`, `pt-BR`, `es`, `de`, `ja`, and `zh-Hans` unless there is an explicit product decision to ship an incomplete translation.

## Validate `v1/education`

This repository now includes a cross-platform validator at `scripts/validate-education.js`. It checks the full `v1/education` tree, including:

- JSON parsing and required file presence
- `id` and directory-name alignment
- slug format for IDs, lesson levels, and lesson difficulties
- `order` sequences in `courses.json`, `sections.json`, `units.json`, and `lessons.json`
- required locale coverage for localized text fields
- `createdAt` and `updatedAt` timestamp format and ordering
- `lessonIDs.json` correctness against the generated lesson paths
- unexpected files or directories inside `v1/education` such as `.DS_Store`

### Prerequisite

Install Node.js so the `node` command is available in your terminal:

```text
node --version
```

The validator uses only the Node.js standard library, so there is nothing else to install.

### Run the validator

From the repository root, run:

```text
node scripts/validate-education.js
```

That validates the default path:

```text
v1/education
```

You can also pass a custom path explicitly:

```text
node scripts/validate-education.js v1/education
```

Or use an absolute path if you want to validate a copied dataset somewhere else:

```text
node scripts/validate-education.js /absolute/path/to/v1/education
```

These commands work the same way on Windows, Linux, and macOS as long as Node.js is installed.

### Understand the result

- Exit code `0`: validation passed
- Exit code `1`: validation failed

When validation passes, the script prints a short summary with the number of tiers, courses, sections, units, and lessons it checked.

When validation fails, the script prints grouped errors by path, followed by a total error count. Fix every reported issue before committing.

### When to run it

Run the validator before committing any newly added or edited education content, especially if you changed:

- `courses.json`
- `sections.json`
- `units.json`
- `lessons.json`
- `lesson-content.json`
- `lessonIDs.json`
- directory names anywhere under `v1/education`

Because the validator is strict about filesystem shape, unexpected files under `v1/education` are treated as errors. That includes OS metadata files such as `.DS_Store`.

### Run the automated tests

The validator also has a Node built-in test suite. Run it from the repository root with:

```text
node --test tests/validate-education.test.js
```

## Maintenance notes

- There is no build step in this repo; correctness comes from the file layout and valid JSON.
- Because the app reads by path, renaming an `id` means renaming both JSON references and directories.
- Static hosting must preserve the current path structure.
- App clients should always fetch through the versioned base path, for example `/v1/education/...` instead of `/education/...`.
- A root `.gitignore` now ignores `.DS_Store` and common editor junk so Finder metadata does not get committed again.
