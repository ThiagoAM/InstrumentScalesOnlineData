# OPENCLAW.md

This file gives explicit instructions to Open Claw for adding a new lesson to this repository.

Follow these instructions exactly. The repository is a static content bundle, so correctness depends on path layout, JSON format, localization completeness, timestamps, and index files staying in sync.

## Goal

When creating a new lesson, Open Claw must:

1. Pull the latest `main` branch before changing anything.
2. Put the lesson in the correct place under `v1/education/`.
3. Use a valid lesson `id` and matching directory name.
4. Update the parent `lessons.json`.
5. Create a valid `lesson-content.json`.
6. Update the course-level `lessonIDs.json`.
7. Keep all required localizations aligned.
8. Run the validation script and the test suite.
9. If everything passes, commit and push directly to the `main` branch.

## Repository structure

Education content lives under:

```text
v1/education/
  free/
  max/
```

Each tier contains:

```text
v1/education/<tier>/
  courses.json
  images/
  courses/<course-id>/
```

Each course contains:

```text
v1/education/<tier>/courses/<course-id>/
  sections.json
  lessonIDs.json
  sections/<section-id>/
```

Each section contains:

```text
.../sections/<section-id>/
  units.json
  units/<unit-id>/
```

Each unit contains:

```text
.../units/<unit-id>/
  lessons.json
  lessons/<lesson-id>/
```

Each lesson contains:

```text
.../lessons/<lesson-id>/
  lesson-content.json
```

Some lessons may also contain an optional `images/` directory:

```text
.../lessons/<lesson-id>/
  lesson-content.json
  images/
```

Do not create extra files or directories anywhere else under `v1/education`. The validator will fail on unexpected files such as `.DS_Store`.

## Required locale set

Every localized text payload in `v1/education` must contain exactly these locale keys:

- `en`
- `pt-BR`
- `es`
- `de`
- `ja`
- `zh-Hans`

Do not add only English. Do not omit any locale. Do not rename locale keys.

Whenever Open Claw edits or creates:

- `name.values`
- `summary.values`
- `description.values`
- `value.values` inside lesson content blocks

it must fill in all six locales.

## ID rules

All IDs must be slug-like strings using this format:

```text
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

That means:

- lowercase letters only
- numbers allowed
- hyphens allowed
- no spaces
- no underscores
- no uppercase letters
- no punctuation other than hyphen

Examples of valid IDs:

- `major-scale-patterns`
- `walking-bass-line-in-g`
- `ii-v-i-basics`

Examples of invalid IDs:

- `Major-Scale`
- `major_scale`
- `major scale`
- `major.scale`

The lesson directory name must match the lesson `id` exactly.

## Timestamps

Every new or updated JSON object that has timestamps must use:

```text
YYYY-MM-DDTHH:MM:SSZ
```

Example:

```text
2026-03-14T00:00:00Z
```

Rules:

- use UTC format with trailing `Z`
- keep valid ISO-8601 syntax
- `updatedAt` must not be earlier than `createdAt`
- for a brand new lesson, `createdAt` and `updatedAt` can be the same
- if editing an existing object, update `updatedAt`

## When creating a new lesson

These instructions assume the lesson is being added to an existing unit.

Before editing any file, Open Claw must update the local repository first:

```text
git checkout main
git pull --ff-only origin main
```

Do this before planning the lesson details, before editing JSON, and before creating any new directories.

Before changing files, identify:

- tier: `free` or `max`
- course ID
- section ID
- unit ID
- new lesson ID

Example target unit:

```text
v1/education/max/courses/guitar/sections/guitar-fretboard-foundations/units/landmarks-and-positions/
```

In that unit, Open Claw must update:

1. `lessons.json`
2. `lessons/<new-lesson-id>/lesson-content.json`
3. the course-level `lessonIDs.json`

For local authoring, prefer `node scripts/create-lesson.js` when the goal is to add a lesson to an existing unit. The script scaffolds the lesson path, updates `lessons.json`, regenerates `lessonIDs.json`, and runs validation automatically. The structural rules below still apply, especially for IDs, locale coverage, timestamps, and path layout.

## Step 1: Choose the exact path

The lesson path must be:

```text
v1/education/<tier>/courses/<course-id>/sections/<section-id>/units/<unit-id>/lessons/<lesson-id>/
```

The content file must be:

```text
v1/education/<tier>/courses/<course-id>/sections/<section-id>/units/<unit-id>/lessons/<lesson-id>/lesson-content.json
```

The flattened lesson ID entry in `lessonIDs.json` must be:

```text
<course-id>/<section-id>/<unit-id>/<lesson-id>
```

## Step 2: Update the unit `lessons.json`

File:

```text
v1/education/<tier>/courses/<course-id>/sections/<section-id>/units/<unit-id>/lessons.json
```

This file is an array of lesson metadata objects.

Add a new object for the lesson with:

- `id`
- `level`
- `difficulty`
- `name`
- `description`
- `order`
- `createdAt`
- `updatedAt`

Use slug-like strings for:

- `id`
- `level`
- `difficulty`

Current data commonly uses values like:

- `beginner`
- `intermediate`
- `easy`
- `medium`

Stay consistent with the surrounding unit unless there is a clear reason not to.

The `order` values inside the file must stay contiguous, starting at `1`. If a new lesson is inserted in the middle, Open Claw must renumber all lesson entries in that file so there are no gaps or duplicates.

Template:

```json
{
  "id": "new-lesson-id",
  "level": "beginner",
  "difficulty": "easy",
  "name": {
    "values": {
      "en": "English lesson name",
      "pt-BR": "Nome da aula em portugues",
      "es": "Nombre de la leccion en espanol",
      "de": "Deutscher Lektionsname",
      "ja": "日本語のレッスン名",
      "zh-Hans": "简体中文课程名称"
    }
  },
  "description": {
    "values": {
      "en": "Short English description.",
      "pt-BR": "Descricao curta em portugues.",
      "es": "Descripcion corta en espanol.",
      "de": "Kurze deutsche Beschreibung.",
      "ja": "短い日本語の説明。",
      "zh-Hans": "简体中文简短描述。"
    }
  },
  "order": 4,
  "createdAt": "2026-03-14T00:00:00Z",
  "updatedAt": "2026-03-14T00:00:00Z"
}
```

## Step 3: Create the lesson directory

Create:

```text
v1/education/<tier>/courses/<course-id>/sections/<section-id>/units/<unit-id>/lessons/<lesson-id>/
```

The final folder name must exactly match the new lesson `id`.

Only put expected content there:

- `lesson-content.json`
- optional `images/` directory if the lesson truly needs image assets

Do not place temporary files there.

## Step 4: Create `lesson-content.json`

File:

```text
v1/education/<tier>/courses/<course-id>/sections/<section-id>/units/<unit-id>/lessons/<lesson-id>/lesson-content.json
```

Required top-level fields:

- `id`
- `blocks`
- `tests`
- `createdAt`
- `updatedAt`

Rules:

- `id` must equal the lesson directory name
- `blocks` must be an array
- each block must currently use `type: "text"`
- each text block must have `value.values` with all six locales
- `tests` must exist and must be an array
- if no quiz/test content is being added, keep `tests` as `[]`

Template:

```json
{
  "id": "new-lesson-id",
  "blocks": [
    {
      "type": "text",
      "value": {
        "values": {
          "en": "# English heading\nEnglish lesson body in markdown.",
          "pt-BR": "# Titulo em portugues\nCorpo da aula em markdown.",
          "es": "# Titulo en espanol\nContenido de la leccion en markdown.",
          "de": "# Deutsche Uberschrift\nDeutscher Lektionstext in Markdown.",
          "ja": "# 日本語の見出し\nMarkdown形式の本文。",
          "zh-Hans": "# 简体中文标题\nMarkdown 格式的课程正文。"
        }
      }
    }
  ],
  "tests": [],
  "createdAt": "2026-03-14T00:00:00Z",
  "updatedAt": "2026-03-14T00:00:00Z"
}
```

## Step 5: If needed, add lesson images

Only create a lesson `images/` directory if the lesson actually needs lesson-specific assets.

Allowed path:

```text
v1/education/<tier>/courses/<course-id>/sections/<section-id>/units/<unit-id>/lessons/<lesson-id>/images/
```

Rules:

- keep only files inside that directory
- do not nest more directories
- do not create unrelated files there
- keep filenames stable and clean

If the lesson does not need images, do not create the directory.

## Step 6: Update the course-level `lessonIDs.json`

File:

```text
v1/education/<tier>/courses/<course-id>/lessonIDs.json
```

This file contains the flattened list of lesson identifiers for the entire course.

Open Claw must add the new lesson entry in the correct order:

```text
<course-id>/<section-id>/<unit-id>/<lesson-id>
```

Important:

- the list must match the generated lesson traversal order
- do not forget this file
- if the lesson order changes in `lessons.json`, `lessonIDs.json` must still match the full course order after the change

Template:

```json
{
  "lessonIDs": [
    "course-id/section-id/unit-id/older-lesson",
    "course-id/section-id/unit-id/new-lesson-id"
  ],
  "createdAt": "2025-12-01T00:00:00Z",
  "updatedAt": "2026-03-14T00:00:00Z"
}
```

For an existing `lessonIDs.json`, keep the original `createdAt` unless the file is being created from scratch, and update `updatedAt`.

## Localization requirements in detail

Open Claw must not produce partial localization.

For each localized field:

- write all six locales in the same change
- keep meaning aligned across languages
- avoid leaving one locale as English unless that is already the established content strategy, which it is not for `v1/education`
- keep the same pedagogical meaning across all locales
- keep lesson names short and clean
- keep descriptions short in metadata
- put detailed teaching content in lesson `blocks`

Localization checklist for a new lesson:

1. `lessons.json` `name.values.en`
2. `lessons.json` `name.values.pt-BR`
3. `lessons.json` `name.values.es`
4. `lessons.json` `name.values.de`
5. `lessons.json` `name.values.ja`
6. `lessons.json` `name.values.zh-Hans`
7. `lessons.json` `description.values.*`
8. `lesson-content.json` for every block under `value.values.*`

If there are multiple blocks, every block must contain all six locales.

## JSON quality rules

Open Claw must keep JSON valid and consistent:

- valid UTF-8 JSON
- proper arrays and objects
- no trailing commas
- no comments inside JSON
- no missing required fields
- no extra stray files in the directory tree

The validator checks structure aggressively. If Open Claw forgets a file, creates the wrong directory name, skips a locale, breaks timestamps, or forgets `lessonIDs.json`, validation will fail.

## Example workflow

Example lesson target:

```text
Tier: max
Course: guitar
Section: guitar-fretboard-foundations
Unit: landmarks-and-positions
Lesson ID: fretboard-notes-on-the-g-string
```

Files to touch:

```text
v1/education/max/courses/guitar/sections/guitar-fretboard-foundations/units/landmarks-and-positions/lessons.json
v1/education/max/courses/guitar/sections/guitar-fretboard-foundations/units/landmarks-and-positions/lessons/fretboard-notes-on-the-g-string/lesson-content.json
v1/education/max/courses/guitar/lessonIDs.json
```

If lesson-specific assets are needed:

```text
v1/education/max/courses/guitar/sections/guitar-fretboard-foundations/units/landmarks-and-positions/lessons/fretboard-notes-on-the-g-string/images/
```

## Run validation

From the repository root, Open Claw must run:

```text
node scripts/validate-education.js
```

This validates the entire `v1/education` tree.

Validation passes only if:

- all expected files exist
- IDs match directory names
- locale sets are complete
- timestamps are valid
- order sequences are contiguous
- `lessonIDs.json` is aligned
- there are no unexpected files

## Run the test suite

After validation passes, Open Claw must run:

```text
node --test tests/validate-education.test.js
```

This checks the validator itself.

Both commands must pass before committing.

## Git workflow for Open Claw

Open Claw is allowed to commit and push directly to the `main` branch after the checks pass.

Required workflow:

1. Ensure the work is on `main`.
2. Ensure the local branch is up to date.
3. Make the lesson changes.
4. Run validation.
5. Run tests.
6. Commit.
7. Push directly to `main`.

Suggested command sequence:

```text
git checkout main
git pull --ff-only origin main
node scripts/validate-education.js
node --test tests/validate-education.test.js
git status
git add <changed-files>
git commit -m "Add <lesson-id> lesson"
git push origin main
```

Rules:

- do not commit before validation passes
- do not push before tests pass
- do not leave unrelated files in the working tree
- do not create a side branch unless explicitly instructed otherwise
- direct push to `main` is allowed for this repository once checks pass

## Final checklist

Before finishing, Open Claw must confirm all of the following:

- lesson `id` is valid
- lesson directory name matches `id`
- `lessons.json` contains the new lesson
- `order` values are contiguous
- `lesson-content.json` exists
- `lesson-content.json.id` matches the directory name
- every localized field contains all six locales
- `tests` exists and is an array
- `lessonIDs.json` contains the new flattened lesson path
- no unexpected files were created
- `node scripts/validate-education.js` passed
- `node --test tests/validate-education.test.js` passed
- commit was created
- commit was pushed directly to `main`

If any item above is not true, the work is not complete.
