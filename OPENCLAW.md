# OPENCLAW.md — V2 curriculum authoring

Instructions for OpenClaw agents creating or revising Instrument Scales lessons. V2 is the only active authoring target. Never add new education content to `legacy/v1`; that directory exists only for old app compatibility.

## 1. Start safely

1. Sync `main` with a fast-forward-only pull.
2. Read `README.md`, `v2/education/courses/instrument-scales/course.json`, and the complete `catalog.json`.
3. Run `node scripts/validate-v2.js` before editing. If existing validation fails, report it instead of layering unrelated content on top.
4. Select exactly one section and unit. Do not create a new section when the lesson belongs in an existing learning arc.

## 2. Choose the hierarchy intentionally

Sections describe learner stage, not instrument:

- `beginner`: recognition, orientation, one-octave control, and one idea at a time;
- `intermediate`: position connections, rhythmic choices, short phrases, and coordinated movement;
- `advanced`: interval sequences, harmonic targets, modal comparison, contrary motion, and multi-constraint control.

Units are thematic chapters. Unit N+1 must assume or extend at least one skill from unit N. Give each unit a short memorable theme rather than a generic difficulty label. Add a unit only when at least two distinct lessons belong to the theme; otherwise add the lesson to an existing unit.

Lessons are atomic. One lesson should have one observable outcome, such as “land on the third at a chord change,” not “understand improvisation.” Target 5–8 minutes. Prefer two focused attempts over a long explanation.

## 3. Keep lessons quick and diversified

Across neighboring lessons, rotate activity types:

- `ear-training`: compare, identify, sing, or find a tonal center;
- `fretboard`: exact strings/frets, positions, shifts, or octave shapes;
- `keyboard`: fingering, hand balance, one-octave or contrary motion;
- `rhythm`: rests, accents, subdivisions, groove, or short fills;
- `theory`: apply an interval or scale relationship through playing;
- `improvisation`: constrained phrase, target note, call/response, or modal color.

Avoid consecutive lessons that are only prose plus the same ascending scale. Every lesson must contain playable content and a localized action checkpoint. Use `notes` for pitch/rhythm sequences and `fretboard` when an exact physical path matters.

Difficulty should come from musical decisions, not length. Raise one constraint at a time: position change, rhythmic variation, interval pattern, harmonic target, or coordination. Keep the tempo achievable and state when the learner should slow down.

## 4. Create the lesson

Use a lowercase hyphenated slug. Add the lesson reference to the correct unit in `catalog.json`, with the next contiguous `order`. Required reference fields are:

```json
{
  "id": "short-stable-slug",
  "order": 3,
  "estimatedMinutes": 7,
  "activity": "rhythm",
  "instrument": "guitar",
  "optional": false,
  "titles": { "en": "...", "pt-BR": "...", "es": "...", "de": "...", "ja": "...", "zh-Hans": "..." },
  "summaries": { "en": "...", "pt-BR": "...", "es": "...", "de": "...", "ja": "...", "zh-Hans": "..." },
  "path": "sections/<section>/units/<unit>/lessons/<lesson>/lesson.md"
}
```

Create exactly one `lesson.md` at that path. Its front matter must repeat the catalog identity:

```text
---
schema: 2
id: short-stable-slug
course: instrument-scales
level: intermediate
section: position-bridges
unit: octave-connections
order: 3
revision: 1
estimatedMinutes: 7
instrument: guitar
title.en: ...
title.pt-BR: ...
...
summary.zh-Hans: ...
---
```

Use one localized region with all six locales. Keep the same instructional intent and checkpoint across translations:

```text
:::localized
:::locale en
# Localized title

Short instruction.

:::checkpoint One observable action.

:::locale pt-BR
...
:::endlocalized
```

Put shared playable fences after the localized region. Note syntax supports individual pitches, chords in brackets, rests as `-`, and `/duration`. Fretboard syntax must include tuning, fret range, and exact positions. Copy a nearby valid lesson when unsure, then change every ID and musical example.

## 5. Localization rules

All six locales are mandatory: `en`, `pt-BR`, `es`, `de`, `ja`, and `zh-Hans`.

- Translate meaning, not word order.
- Keep note names and established music terms appropriate to the locale.
- Never leave English placeholder prose in a non-English locale.
- Keep the checkpoint actionable and equivalent in every language.
- Re-read title, summary, body, and checkpoint together; catalog and document metadata must agree.

## 6. Quality checks

Before validation, confirm:

- one clear outcome and no unrelated theory detour;
- 3–10 minutes, preferably 5–8;
- at least one playable block that matches the stated objective;
- playable pitches fit the declared instrument and tuning;
- tempo and physical movement are realistic;
- the lesson differs meaningfully from its neighbors;
- higher unit numbers genuinely build on earlier units;
- optional lessons enrich the path but do not block the required sequence.

Then run:

```bash
node scripts/validate-v2.js
node --test tests/*.test.js
node scripts/build-pages.js
```

Review the generated `dist/v2` path and verify `dist/v1` still exists. Do not edit `dist` by hand and do not commit it unless repository policy changes; it is a build artifact.

## 7. Revisions and removals

For content-only lesson changes, increment the lesson `revision`. For navigation metadata or hierarchy changes, increment the catalog revision. Keep lesson IDs stable after release so progress survives.

Do not silently delete or rename a released lesson. Mark it optional or replace its content while preserving the ID, unless the app has an explicit progress migration. If a hierarchy move is unavoidable, coordinate the old-to-new progress ID mapping before publishing.

## 8. V1 boundary

V1 source and tools live under `legacy/v1`. The Pages builder maps `legacy/v1/data` back to public `/v1`. V2 agents must not run V1 creation scripts, change V1 catalogs, or copy V1’s long-form lesson pattern into V2 unless explicitly asked to maintain a legacy bug.
