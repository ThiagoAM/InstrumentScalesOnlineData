# OPENCLAW.md

This file gives explicit instructions to Open Claw for adding a new lesson to this repository.

## Default rule

If the task is "add a lesson to an existing unit", the default and preferred workflow is:

```text
node scripts/create-lesson.js
```

Do not start by hand-editing JSON unless there is a specific reason the script cannot be used. The script already knows the repository layout, creates the lesson folder, writes `lesson-content.json`, updates the unit `lessons.json`, regenerates the course `lessonIDs.json`, normalizes lesson order, preserves the existing `lessonIDs.json.createdAt`, and validates the entire education tree before and after writing.

Manual editing is a fallback or a reference path, not the primary path.

Open Claw must not attempt to create, edit, or attach lesson images. Image work is out of scope here. Focus only on lesson metadata and localized markdown content.

## Lesson quality rule

Every new lesson must be:

- fun
- challenging
- high quality

Every generated `lesson-content.json` must contain between `4` and `10` text blocks.

Open Claw must treat this as a required depth rule, not a suggestion. Fewer than `4` blocks is too shallow. More than `10` blocks is too fragmented.

## Non-negotiable workflow

When creating a lesson, Open Claw must:

1. Update the local repository first.
2. Use `node scripts/create-lesson.js` for lesson creation whenever the lesson belongs to an existing unit.
3. Provide all six required locales.
4. Keep IDs, timestamps, ordering, and path layout valid.
5. Run the validator and the test suite before committing.
6. If everything passes, commit and push directly to the `main` branch.

## Step 0: Sync `main` before doing anything

Before planning the lesson details, before preparing locale markdown, and before running the script, update the repository:

```text
git checkout main
git pull --ff-only origin main
```

Do not create lesson files from a stale branch.

## The script-first workflow

The normal command from the repository root is:

```text
node scripts/create-lesson.js
```

Optional flags:

```text
node scripts/create-lesson.js [--root <path>] [--markdown-dir <path>]
```

Options:

- `--root <path>` points to the `v1/education` directory. If omitted, the script uses this repository's default path: `v1/education`.
- `--markdown-dir <path>` tells the script to reuse a directory that already contains the six locale markdown files. If omitted, the script creates a temporary directory with templates and pauses until they are filled in.
- `--help` prints the script usage text.

In normal repository usage, run it from the repo root without arguments unless there is a real need to override the defaults.

## What the script does automatically

When `node scripts/create-lesson.js` succeeds, it:

1. Validates the existing `v1/education` tree before making changes.
2. Prompts for tier, course, section, and unit.
3. Prompts for the new lesson ID.
4. Prompts for the insert position inside the unit.
5. Prompts for `level` and `difficulty`.
6. Loads localized content from six markdown files.
7. Writes the new lesson entry into the unit `lessons.json`.
8. Renumbers lesson `order` values so they stay contiguous starting at `1`.
9. Updates `updatedAt` on shifted lesson entries when their order changes.
10. Creates `lessons/<lesson-id>/lesson-content.json`.
11. Regenerates the course-level `lessonIDs.json`.
12. Validates the full education tree again after writing.

Open Claw should rely on this behavior instead of trying to duplicate it manually.

## Interactive flow in detail

When the script runs, it prompts in this order:

1. Choose a tier.
2. Choose a course.
3. Choose a section.
4. Choose a unit.
5. Enter the new lesson ID.
6. Enter the insert position.
7. Choose the lesson level.
8. Choose the lesson difficulty.
9. Prepare or point to the six locale markdown files.

Important details:

- Tier choices come from the repository and normally include `free` and `max`.
- Course, section, and unit choices are shown as numbered menus.
- Menu labels usually appear as `<id> - <English name>` when that localized name exists.
- The new lesson ID must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- The insert position must be an integer from `1` to `current lesson count + 1`.
- The supported lesson levels are `beginner` and `intermediate`.
- The supported lesson difficulties are `easy` and `medium`.

If the script rejects an answer, fix the value and continue rather than bypassing the script.

## Recommended usage pattern

The safest workflow is:

1. Run `node scripts/create-lesson.js`.
2. Choose the correct tier, course, section, and unit from the prompts.
3. Enter a valid slug for the new lesson ID.
4. Choose where it should appear in the unit.
5. Choose the appropriate `level` and `difficulty`.
6. Let the script generate locale markdown templates.
7. Fill in all six markdown files carefully.
8. Return to the terminal and press Enter so the script can continue.
9. Let the script write the lesson files and validate the tree.
10. Run the test suite manually.
11. Review the generated JSON before committing.

## How the temporary markdown template flow works

If `--markdown-dir` is not supplied, the script creates a temporary directory and prints its path. That directory contains exactly these files:

```text
en.md
pt-BR.md
es.md
de.md
ja.md
zh-Hans.md
```

Each file starts with this template:

```text
---
name:
description:
---
```

Open Claw must fill in every file before returning to the script.

Rules for each locale markdown file:

- The file must use front matter bounded by `---` lines.
- The front matter must include non-empty `name:` and `description:` fields.
- The body must not be empty.
- The body must be markdown content for that locale.
- The lesson body must be split into between `4` and `10` text blocks.
- Use `<!-- block -->` on its own line to split the lesson body into those text blocks.
- Those blocks should together produce a lesson that feels fun, challenging, and high quality.
- Do not use malformed HTML comments as separators.
- Do not leave placeholder text behind.

Illustrative snippet:

```md
---
name: Fretboard notes on the G string
description: Learn the main landmark notes on the G string.
---
# Fretboard notes on the G string
This lesson introduces the main note landmarks on the G string.

<!-- block -->

## Practice idea
Play the landmarks slowly, say the note names out loud, and connect them to nearby octave shapes.
```

That snippet is abbreviated only to show the file format. A real lesson must contain between `4` and `10` blocks.

## Locale markdown requirements

The script parses all six locale files together. They must stay aligned.

Required locale set:

- `en`
- `pt-BR`
- `es`
- `de`
- `ja`
- `zh-Hans`

Alignment rules:

- Every locale file must exist.
- Every locale file must define `name` and `description`.
- Every locale file must contain between `4` and `10` body blocks.
- Every locale file must contain the same number of blocks.
- Block `1` in one locale must correspond to block `1` in every other locale.
- Block `2` must correspond to block `2`, and so on.

This means Open Claw should write the English structure first, decide the exact `4`-to-`10` block boundaries, and then mirror those same boundaries across the other five locale files.

## Using `--markdown-dir`

Use `--markdown-dir` when the localized markdown files were prepared in advance and should be reused directly.

Example:

```text
node scripts/create-lesson.js --markdown-dir /absolute/path/to/lesson-markdown
```

That directory must already contain:

```text
en.md
pt-BR.md
es.md
de.md
ja.md
zh-Hans.md
```

Use this mode when:

- the lesson copy is being drafted outside the interactive script flow
- the locale files need repeated review before writing JSON
- the content was prepared in a persistent working directory instead of a temp directory

Do not point `--markdown-dir` at a partial directory. The script will fail if any required locale file is missing or malformed.

## Common script failure modes

If `node scripts/create-lesson.js` fails, fix the underlying issue and rerun it. Common causes include:

- the current `v1/education` tree is already invalid before lesson creation
- the selected course, section, or unit does not exist
- the lesson ID is not a valid slug
- the lesson ID already exists in that unit
- the target lesson directory already exists
- the insert position is outside the allowed range
- a locale markdown file is missing
- a locale file is missing `name` or `description`
- a locale file has an empty body
- the lesson has fewer than `4` blocks
- the lesson has more than `10` blocks
- the locale files do not have matching block counts
- the block separator is malformed and not exactly `<!-- block -->` on its own line

Do not bypass these errors by switching to manual JSON edits unless there is a real repository-level reason the script cannot be used.

## What files the script writes

For a new lesson in an existing unit, the script writes or updates exactly these core files:

1. `v1/education/<tier>/courses/<course-id>/sections/<section-id>/units/<unit-id>/lessons.json`
2. `v1/education/<tier>/courses/<course-id>/sections/<section-id>/units/<unit-id>/lessons/<lesson-id>/lesson-content.json`
3. `v1/education/<tier>/courses/<course-id>/lessonIDs.json`

It also creates the lesson directory:

```text
v1/education/<tier>/courses/<course-id>/sections/<section-id>/units/<unit-id>/lessons/<lesson-id>/
```

## What the script does not do

Open Claw must still handle these responsibilities:

- choose the correct educational content and translations
- ensure the translations are pedagogically aligned
- run the test suite after the script succeeds
- review the generated files before commit
- commit and push

Do not assume the script replaces editorial judgment.

Open Claw must not try to add images as part of lesson creation.

## Post-script checks

After the script succeeds, Open Claw must still run:

```text
node scripts/validate-education.js
node --test tests/validate-education.test.js
```

The script already validates the education tree internally, but the required workflow still includes running the validator and test suite explicitly before commit.

Both commands must pass before committing.

## Final checklist

Before finishing, Open Claw must confirm all of the following:

- the lesson was created with `node scripts/create-lesson.js`
- the lesson `id` is valid
- the lesson directory matches the lesson `id`
- `lessons.json` contains the new lesson
- lesson `order` values are contiguous
- `lesson-content.json` exists and its `id` matches the directory
- `lesson-content.json.blocks` contains between `4` and `10` text blocks
- all six locales are present in metadata and content blocks
- the lesson content is fun, challenging, and high quality
- `lessonIDs.json` includes the correct flattened lesson path
- no unexpected files were created under `v1/education`
- `node scripts/validate-education.js` passed
- `node --test tests/validate-education.test.js` passed
- the changes were reviewed before commit

## Repository structure reference

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

Do not create extra files or directories anywhere else under `v1/education`. Validation fails on unexpected files such as `.DS_Store`.

## ID rules

All IDs must use this format:

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

The lesson directory name must exactly match the lesson `id`.

## Timestamps

Every new or updated JSON object with timestamps must use:

```text
YYYY-MM-DDTHH:MM:SSZ
```

Example:

```text
2026-03-14T00:00:00Z
```

Rules:

- use UTC with trailing `Z`
- keep valid ISO-8601 syntax
- `updatedAt` must not be earlier than `createdAt`
- for a brand new lesson, `createdAt` and `updatedAt` can be the same
- if editing an existing object, update `updatedAt`

The script handles these timestamps when it creates the lesson files.

## Generated JSON shape reference

The unit `lessons.json` entry created by the script has this shape:

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

The `lesson-content.json` created by the script has this shape. The real `blocks` array must contain between `4` and `10` entries, even though the sample below is intentionally compact:

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

## Localization requirements in detail

Open Claw must not produce partial localization.

Whenever Open Claw edits or creates:

- `name.values`
- `description.values`
- `value.values` inside lesson content blocks

it must fill in all six locales.

Checklist:

1. `lessons.json` `name.values.*`
2. `lessons.json` `description.values.*`
3. every `lesson-content.json` block under `value.values.*`

If there are multiple blocks, every block must contain all six locales.

Every new lesson should use those blocks to deliver a fun, challenging, and high-quality learning experience.

## JSON quality rules

Open Claw must keep JSON valid and consistent:

- valid UTF-8 JSON
- proper arrays and objects
- no trailing commas
- no comments inside JSON
- no missing required fields
- no extra stray files in the directory tree

The validator checks structure aggressively. If Open Claw forgets a file, creates the wrong directory name, skips a locale, breaks timestamps, or leaves `lessonIDs.json` out of sync, validation will fail.

## Example script-driven workflow

Example target:

```text
Tier: max
Course: guitar
Section: guitar-fretboard-foundations
Unit: landmarks-and-positions
Lesson ID: fretboard-notes-on-the-g-string
```

Recommended execution:

```text
git checkout main
git pull --ff-only origin main
node scripts/create-lesson.js
```

Then select:

1. `max`
2. `guitar`
3. `guitar-fretboard-foundations`
4. `landmarks-and-positions`
5. `fretboard-notes-on-the-g-string`
6. the desired insert position
7. `beginner` or `intermediate`
8. `easy` or `medium`

Then fill the generated locale markdown files, return to the prompt, and let the script write:

```text
v1/education/max/courses/guitar/sections/guitar-fretboard-foundations/units/landmarks-and-positions/lessons.json
v1/education/max/courses/guitar/sections/guitar-fretboard-foundations/units/landmarks-and-positions/lessons/fretboard-notes-on-the-g-string/lesson-content.json
v1/education/max/courses/guitar/lessonIDs.json
```

## Git workflow for Open Claw

Open Claw is allowed to commit and push directly to the `main` branch after checks pass.

Required workflow:

1. Ensure the work is on `main`.
2. Ensure the local branch is up to date.
3. Create the lesson with `node scripts/create-lesson.js`.
4. Run validation.
5. Run tests.
6. Commit.
7. Push directly to `main`.
