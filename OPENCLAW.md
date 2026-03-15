# OPENCLAW.md

Instructions for coding agents creating lessons in this repository.

## Default workflow

Before creating a lesson, sync the local repository:

- `git checkout main`
- `git pull --ff-only origin main`

Use `node scripts/create-lesson.js` for adding a lesson to an existing unit. Do not hand-edit JSON unless the script cannot be used.

Optional:

- `node scripts/create-lesson.js --markdown-dir /absolute/path/to/dir`
- `node scripts/create-lesson.js --root /absolute/path/to/v1/education`

The script handles repository validation, lesson file creation, `lessons.json` updates, lesson ordering, and `lessonIDs.json` regeneration.

Inputs the agent must provide correctly:

- lesson ID must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- `level` must be `beginner` or `intermediate`
- `difficulty` must be `easy` or `medium`
- lesson content must have between `4` and `10` text blocks
- every lesson must be fun, challenging, and high quality

If `--markdown-dir` is not provided, the script creates a temporary directory with locale markdown templates and waits for them to be filled in.

## Required localizations

The lesson must include exactly these six locales:

- `en`
- `pt-BR`
- `es`
- `de`
- `ja`
- `zh-Hans`

The markdown directory must contain at least these files:

- `en.md`
- `pt-BR.md`
- `es.md`
- `de.md`
- `ja.md`
- `zh-Hans.md`

Each locale file must:

- start with front matter bounded by `---`
- define non-empty `name:` and `description:` fields
- contain a non-empty markdown body
- use `<!-- block -->` on its own line as the block separator
- produce between `4` and `10` blocks

All locale files must stay aligned:

- every locale must have the same number of blocks
- block `1` must match block `1` across all locales, block `2` must match block `2`, and so on
- write the English structure first, fix the exact block boundaries there, then mirror those boundaries in the other five locales

## Validation and fallback

After creation, run:

- `node scripts/validate-education.js`
- `node --test tests/validate-education.test.js`
- review the generated JSON changes before commit

If the script fails, fix the underlying input problem and rerun it. Common failures are:

- the existing `v1/education` tree is already invalid
- the selected course, section, or unit does not exist
- invalid insert position
- duplicate lesson ID in the target unit
- target lesson directory already exists
- missing locale files
- empty `name` or `description`
- malformed front matter
- malformed block delimiter
- mismatched block counts across locales
- fewer than `4` or more than `10` blocks
- invalid lesson ID

If the task is to remove already-existing invalid lessons that violate the block-count rule, use `node scripts/remove-invalid-lessons.js`.

## Out of scope

- image creation or attachment
- manual JSON reshaping when the creation script can handle the task
