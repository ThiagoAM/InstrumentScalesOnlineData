#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const DEFAULT_EXPANSION_PREFIXES = ["scale-", "harmony-"];
const MAX_REPEATED_EXPANSION_SENTENCE = 12;
const MAX_UNIT_TITLE_MENTIONS = 2;
const MAX_LESSON_FOCUS_MENTIONS = 2;
const MAX_ENGLISH_SHINGLE_SIMILARITY = 0.74;
const MAX_EXPANSION_MINUTES = 8;
const MAX_INSTRUCTION_SENTENCE_UNITS = 45;
const MAX_REPEATED_ENGLISH_SENTENCE_STEM = 130;
const MAX_REPEATED_ENGLISH_FOUR_WORD_PHRASE = 80;
const MAX_REPEATED_ENGLISH_SIX_WORD_PHRASE = 12;
const CJK_ENGLISH_LEAKAGE_WORDS = new Set([
  "answer", "augmented", "bar", "bars", "bass", "beat", "cadence", "changes",
  "chord", "compare", "contrary", "count", "degree", "diminished", "dominant",
  "ending", "event", "events", "fifth", "fixed", "four", "hear", "line", "lines",
  "listen", "major", "map", "melody", "minor", "move", "ninth", "note", "notes",
  "oblique", "one", "outer", "pitch", "play", "question", "rest", "resolve", "root",
  "same", "scale", "section", "shape", "sing", "sixth", "sketch", "seventh", "third",
  "three", "top", "texture", "textures", "triad", "two", "under", "voice", "voices",
  "whole", "write",
]);
const BANNED_PHRASES = [
  "dive into",
  "unlock your",
  "musical journey",
  "game-changer",
  "master the art",
  "world of",
  "ten short studies make",
  "one clear goal",
  "working example:",
  "apply the idea to",
  "hear the result in",
  "has a practical purpose:",
  "for the material “",
  "only after two takes of",
  "write down the earliest unstable event",
  "directly testing this principle:",
  "as the audible check",
  "fixed-do do",
  "dó fixo dó",
  "do fijo do",
  "固定ドド",
];
const SPECIFIC_INSTRUMENTS = new Set(["guitar", "bass", "piano"]);
const HARMONY_ACTIONS = {
  en: ["Play", "Build", "Hear", "Compare", "Tap", "Follow", "Read", "Write", "Keep", "Resolve", "Connect", "Arrange", "Borrow"],
  "pt-BR": ["Toque", "Monte", "Ouça", "Compare", "Marque", "Acompanhe", "Leia", "Escreva", "Mantenha", "Resolva", "Conecte", "Arranje", "Empreste", "Toma prestado"],
  es: ["Toca", "Construye", "Escucha", "Compara", "Marca", "Sigue", "Lee", "Escribe", "Mantén", "Resuelve", "Conecta", "Arregla", "Toma prestado"],
  de: ["Spiele", "Baue", "Höre", "Vergleiche", "Klopfe", "Verfolge", "Lies", "Schreibe", "Halte", "Löse", "Verbinde", "Arrangiere", "Entlehne"],
  ja: ["弾く", "組み立てる", "聴き分ける", "比べる", "叩く", "追う", "読む", "書く", "保つ", "解決する", "つなぐ", "編曲する", "借用する"],
  "zh-Hans": ["弹奏", "构建", "聆听", "比较", "击拍", "跟随", "识读", "写出", "保持", "解决", "连接", "编配", "借用"],
};

function defaultV2Root() {
  return path.join(__dirname, "..", "v2");
}

function addError(errors, filePath, message) {
  errors.push({ path: filePath, message });
}

function readJSON(filePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    addError(errors, filePath, `Invalid JSON: ${error.message}`);
    return null;
  }
}

function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return null;
  return Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => line.match(/^([^:]+):\s*(.*)$/))
      .filter(Boolean)
      .map((entry) => [entry[1].trim(), entry[2].trim()])
  );
}

function localizedBodies(markdown) {
  const wrapper = markdown.match(/:::localized\s*\n([\s\S]*?)\n:::endlocalized(?:\s*\n|$)/);
  if (!wrapper) return null;
  const bodies = {};
  const marker = /^:::locale ([^\s]+)\s*$/gm;
  const matches = [...wrapper[1].matchAll(marker)];
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length;
    const end = matches[index + 1]?.index ?? wrapper[1].length;
    bodies[matches[index][1]] = wrapper[1].slice(start, end).replace(/^\n/, "").trim();
  }
  return bodies;
}

function proseText(body) {
  let insideFence = false;
  return body
    .split("\n")
    .filter((line) => {
      if (line.trim().startsWith("```")) {
        insideFence = !insideFence;
        return false;
      }
      if (insideFence) return false;
      return !/^\s*(?:#|:::checkpoint\b|:::)/.test(line);
    })
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
}

function proseUnits(body) {
  const prose = proseText(body);
  const whitespaceWords = prose ? prose.split(/\s+/u).length : 0;
  const cjkCharacters = (
    prose.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []
  ).length;
  return Math.max(whitespaceWords, Math.floor(cjkCharacters / 2));
}

function normalizedDuplicateValue(value, locale) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .toLocaleLowerCase(locale)
    .replace(/\s+/gu, " ")
    .trim();
}

function literalOccurrences(value, needle, locale) {
  const normalizedValue = normalizedDuplicateValue(value, locale);
  const normalizedNeedle = normalizedDuplicateValue(needle, locale);
  if (!normalizedValue || !normalizedNeedle) return 0;
  return normalizedValue.split(normalizedNeedle).length - 1;
}

function targetOccurrences(value, target, locale) {
  const normalizedValue = normalizedDuplicateValue(value, locale);
  const normalizedTarget = normalizedDuplicateValue(target, locale);
  if (!normalizedValue || !normalizedTarget) return 0;
  if (/^[a-z0-9#♭♯]{1,3}$/iu.test(normalizedTarget)) {
    const escaped = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return [...normalizedValue.matchAll(
      new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu")
    )].length;
  }
  return literalOccurrences(normalizedValue, normalizedTarget, locale);
}

function lessonFocusLabel(lessonTitle, unitTitle) {
  let label = String(lessonTitle || "").trim();
  const unit = String(unitTitle || "").trim();
  if (unit && label.startsWith(unit)) {
    label = label.slice(unit.length).replace(/^[\s:：—–-]+/u, "");
  }
  if (label.includes("·")) label = label.split("·").at(-1).trim();
  return label;
}

function harmonyTargetLabel(lessonTitle, locale) {
  const title = String(lessonTitle || "").trim();
  const actions = [...(HARMONY_ACTIONS[locale] || [])]
    .sort((left, right) => right.length - left.length);
  for (const action of actions) {
    if (locale === "ja" && title.endsWith(`を${action}`)) {
      return title.slice(0, -(`を${action}`.length)).trim();
    }
    if (locale === "zh-Hans" && title.startsWith(action)) {
      return title.slice(action.length).trim();
    }
    if (title.startsWith(`${action} `)) {
      return title.slice(action.length + 1).trim();
    }
  }
  return title;
}

function adjacentRepeatedWords(value, locale) {
  const words = String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase(locale)
    .split(/\s+/u)
    .map((word) => {
      const trimmed = word.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, "");
      return /^[\p{L}\p{M}'’-]+$/u.test(trimmed) ? trimmed : "";
    });
  const repeated = [];
  for (let index = 1; index < words.length; index += 1) {
    if (locale === "de" && words[index] === "die" && words[index - 1] === "die") continue;
    if (words[index].length >= 2 && words[index] === words[index - 1]) {
      repeated.push(words[index]);
    }
  }
  return [...new Set(repeated)];
}

function normalizedSentenceSignatures(body, locale, replacements = []) {
  const normalizedReplacements = replacements
    .map(({ value, token }) => ({
      value: normalizedDuplicateValue(value, locale),
      token,
    }))
    .filter(({ value }) => value)
    .sort((left, right) => right.value.length - left.value.length);
  return proseText(body)
    .split(/(?<=[.!?。！？])\s*/u)
    .map((sentence) => {
      let signature = sentence
        .normalize("NFKC")
        .toLocaleLowerCase(locale);
      for (const replacement of normalizedReplacements) {
        signature = signature.split(replacement.value).join(replacement.token);
      }
      signature = signature
        .replace(/\b[a-g](?:[#b♭♯])?(?:(?:maj|min|dim|aug|sus|add|m)\d*)?\b/giu, "<note>")
        .replace(/\b[ivx]+[°ø]?\b/giu, "<numeral>")
        .replace(/\b\d+(?:\.\d+)?\b/gu, "<number>")
        .replace(/[^\p{L}\p{N}<>]+/gu, " ")
        .replace(/\s+/gu, " ")
        .trim();
      return { source: sentence.trim(), signature };
    })
    .filter(({ source }) => proseUnits(source) >= 8);
}

function proseSentences(body) {
  return proseText(body)
    .split(/(?<=[.!?。！？])\s*/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function englishSentenceStem(sentence, width = 2) {
  return String(sentence || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/\b[a-g](?:[#b♭♯])?(?:(?:maj|min|dim|aug|sus|add|m)\d*)?\b/giu, " <note> ")
    .replace(/\b[ivx]+[°ø]?\b/giu, " <numeral> ")
    .replace(/\b\d+(?:\.\d+)?\b/gu, " <number> ")
    .replace(/[^\p{L}\p{N}<>]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, width)
    .join(" ");
}

function cjkEnglishLeakageWords(value) {
  const tokens = String(value || "").match(/[A-Za-z]+/gu) || [];
  return [...new Set(
    tokens
      .map((token) => token.toLocaleLowerCase("en"))
      .filter((token) => CJK_ENGLISH_LEAKAGE_WORDS.has(token))
  )];
}

function englishWordShingles(body, width = 5) {
  const words = proseText(body)
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/\b[a-g](?:[#b♭♯])?(?:(?:maj|min|dim|aug|sus|add|m)\d*)?\b/giu, " <note> ")
    .replace(/\b[ivx]+[°ø]?\b/giu, " <numeral> ")
    .replace(/\b\d+(?:\.\d+)?\b/gu, " <number> ")
    .replace(/[^\p{L}\p{N}<>]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  const shingles = new Set();
  for (let index = 0; index <= words.length - width; index += 1) {
    shingles.add(words.slice(index, index + width).join(" "));
  }
  return shingles;
}

function jaccardSimilarity(left, right) {
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
}

function instrumentsMatch(catalogInstrument, frontMatterInstrument) {
  if (catalogInstrument === frontMatterInstrument) return true;
  // Catalog `adaptive` means the lesson is available to every instrument. The
  // document may still suggest a guitar, bass, or piano as its initial setup.
  return catalogInstrument === "adaptive" && SPECIFIC_INSTRUMENTS.has(frontMatterInstrument);
}

function hasLocalizedCheckpoint(body) {
  return /^:::checkpoint\s+\S.*$/mu.test(body);
}

function playableFenceTitles(markdown) {
  return [...markdown.matchAll(/^```(?:scale|chord|progression|notes|compare|tap|listen|fretboard)\s*\n([\s\S]*?)^```\s*$/gmu)]
    .flatMap((match) => [...match[1].matchAll(/^title:\s*(.+)$/gmu)])
    .map((match) => match[1].trim());
}

function walkLessonMarkdown(directory, output = []) {
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return output;
  }
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkLessonMarkdown(entryPath, output);
    else if (entry.isFile() && entry.name === "lesson.md") output.push(path.resolve(entryPath));
  }
  return output;
}

function auditV2Bulk(root = defaultV2Root(), options = {}) {
  const errors = [];
  const prefixes = options.expansionPrefixes ?? DEFAULT_EXPANSION_PREFIXES;
  const checkRevisionOne = options.checkRevisionOne ?? true;
  const coursesRoot = path.join(root, "education", "courses");
  const expectedLessonPaths = new Set();
  const expansionSentences = new Map();
  const expansionEnglishBodies = [];
  const expansionEnglishSentenceStems = new Map();
  const expansionEnglishPhrases = new Map();
  let lessons = 0;
  let lengthChecked = 0;
  let courseEntries = [];

  try {
    courseEntries = fs.readdirSync(coursesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory());
  } catch (error) {
    addError(errors, coursesRoot, `Unable to read courses: ${error.message}`);
  }

  for (const courseEntry of courseEntries) {
    const courseRoot = path.join(coursesRoot, courseEntry.name);
    const catalogPath = path.join(courseRoot, "catalog.json");
    const catalog = readJSON(catalogPath, errors);
    if (!catalog || !Array.isArray(catalog.sections)) continue;

    for (const section of catalog.sections) {
      const duplicateValues = new Map();
      const units = Array.isArray(section.units) ? section.units : [];
      for (const unit of units) {
        const unitLessons = Array.isArray(unit.lessons) ? unit.lessons : [];
        for (const lesson of unitLessons) {
          lessons += 1;
          for (const field of ["titles", "summaries"]) {
            for (const locale of REQUIRED_LOCALES) {
              const normalized = normalizedDuplicateValue(lesson[field]?.[locale], locale);
              if (!normalized) continue;
              const key = `${field}:${locale}:${normalized}`;
              const previous = duplicateValues.get(key);
              if (previous) {
                addError(
                  errors,
                  catalogPath,
                  `${lesson.id} duplicates ${previous} ${field}.${locale} within section ${section.id}.`
                );
              } else {
                duplicateValues.set(key, lesson.id);
              }
            }
          }

          const lessonPath = path.resolve(courseRoot, lesson.path || "");
          expectedLessonPaths.add(lessonPath);
          let markdown;
          try {
            markdown = fs.readFileSync(lessonPath, "utf8").replace(/\r\n/g, "\n");
          } catch (error) {
            addError(errors, lessonPath, `Unable to read catalog lesson: ${error.message}`);
            continue;
          }
          const fields = parseFrontMatter(markdown);
          if (!fields) {
            addError(errors, lessonPath, "Missing YAML-style front matter.");
            continue;
          }
          const revision = Number(fields.revision);
          const isExpansionLesson = prefixes.some((prefix) => lesson.id.startsWith(prefix));
          const isNewLesson = (checkRevisionOne && revision === 1) || isExpansionLesson;

          if (isExpansionLesson && lesson.estimatedMinutes > MAX_EXPANSION_MINUTES) {
            addError(
              errors,
              lessonPath,
              `Expansion lesson is estimated at ${lesson.estimatedMinutes} minutes (maximum ${MAX_EXPANSION_MINUTES}).`
            );
          }
          if (isExpansionLesson) {
            for (const locale of REQUIRED_LOCALES) {
              for (const field of ["titles", "summaries"]) {
                const repeated = adjacentRepeatedWords(lesson[field]?.[locale], locale);
                if (repeated.length) {
                  addError(
                    errors,
                    catalogPath,
                    `${lesson.id} ${field}.${locale} repeats adjacent word(s): ${repeated.join(", ")}.`
                  );
                }
              }
            }
          }

          if (fields.estimatedMinutes !== String(lesson.estimatedMinutes)) {
            addError(
              errors,
              lessonPath,
              `estimatedMinutes does not match catalog (${fields.estimatedMinutes} != ${lesson.estimatedMinutes}).`
            );
          }
          const instrumentMatchesCatalog = isNewLesson
            ? lesson.instrument === fields.instrument
            : instrumentsMatch(lesson.instrument, fields.instrument);
          if (!instrumentMatchesCatalog) {
            addError(
              errors,
              lessonPath,
              `instrument does not match catalog (${fields.instrument} != ${lesson.instrument}).`
            );
          }
          for (const locale of REQUIRED_LOCALES) {
            for (const [catalogField, frontMatterField] of [
              ["titles", "title"],
              ["summaries", "summary"],
            ]) {
              const catalogValue = lesson[catalogField]?.[locale];
              const frontMatterValue = fields[`${frontMatterField}.${locale}`];
              if (catalogValue !== frontMatterValue) {
                addError(
                  errors,
                  lessonPath,
                  `${frontMatterField}.${locale} does not match catalog.`
                );
              }
            }
          }

          if (isExpansionLesson) {
            for (const fenceTitle of playableFenceTitles(markdown)) {
              if (fenceTitle === fields["title.en"]) {
                addError(
                  errors,
                  lessonPath,
                  "Playable fence repeats the English lesson title; use a locale-neutral musical label."
                );
              }
            }
          }

          const bodies = localizedBodies(markdown);
          if (!bodies) {
            addError(errors, lessonPath, "Missing localized body wrapper.");
          } else {
            for (const locale of REQUIRED_LOCALES) {
              const body = bodies[locale];
              if (!body) continue;
              if (!hasLocalizedCheckpoint(body)) {
                addError(errors, lessonPath, `Missing localized checkpoint for ${locale}.`);
              }
              if (isNewLesson) {
                const unitsCount = proseUnits(body);
                lengthChecked += 1;
                // The existing v2 catalog contains published revision-one bodies
                // below the current 120-word authoring floor. Keep auditing those
                // at their historical floor, but hold this bulk expansion to the
                // repository's current contract.
                const minimumUnits = isExpansionLesson ? 120 : 100;
                if (unitsCount < minimumUnits || unitsCount > 180) {
                  addError(
                    errors,
                    lessonPath,
                    `${locale} body has ${unitsCount} prose units; this lesson requires ${minimumUnits} through 180.`
                  );
                }
              }
              if (isExpansionLesson) {
                for (const sentence of proseSentences(body)) {
                  const sentenceUnits = proseUnits(sentence);
                  if (sentenceUnits > MAX_INSTRUCTION_SENTENCE_UNITS) {
                    addError(
                      errors,
                      lessonPath,
                      `${locale} instructional sentence has ${sentenceUnits} prose units (maximum ${MAX_INSTRUCTION_SENTENCE_UNITS}); split the run-on.`
                    );
                  }
                }
                const unitTitleMentions = literalOccurrences(
                  proseText(body),
                  unit.titles?.[locale],
                  locale
                );
                if (unitTitleMentions > MAX_UNIT_TITLE_MENTIONS) {
                  addError(
                    errors,
                    lessonPath,
                    `${locale} prose repeats the unit title ${unitTitleMentions} times (maximum ${MAX_UNIT_TITLE_MENTIONS}).`
                  );
                }
                const focusLabel = lessonFocusLabel(
                  lesson.titles?.[locale],
                  unit.titles?.[locale]
                );
                const focusMentions = literalOccurrences(proseText(body), focusLabel, locale);
                if (focusLabel && focusMentions > MAX_LESSON_FOCUS_MENTIONS) {
                  addError(
                    errors,
                    lessonPath,
                    `${locale} prose repeats the lesson focus ${focusMentions} times (maximum ${MAX_LESSON_FOCUS_MENTIONS}).`
                  );
                }
                const targetLabel = courseEntry.name === "chords-harmony"
                  ? harmonyTargetLabel(lesson.titles?.[locale], locale)
                  : "";
                const symbolicHarmonyTarget = /^[ivx°ø♭#\s→–—-]+$/iu.test(targetLabel);
                const targetMentions = targetLabel && targetLabel !== focusLabel && !symbolicHarmonyTarget
                  ? targetOccurrences(proseText(body), targetLabel, locale)
                  : 0;
                if (targetMentions > MAX_LESSON_FOCUS_MENTIONS) {
                  addError(
                    errors,
                    lessonPath,
                    `${locale} prose repeats the lesson target ${targetMentions} times (maximum ${MAX_LESSON_FOCUS_MENTIONS}).`
                  );
                }
                if (locale === "ja" || locale === "zh-Hans") {
                  const leakage = cjkEnglishLeakageWords([
                    lesson.titles?.[locale],
                    lesson.summaries?.[locale],
                    proseText(body),
                  ].join("\n"));
                  if (leakage.length) {
                    addError(
                      errors,
                      lessonPath,
                      `${locale} copy contains untranslated English instructional word(s): ${leakage.join(", ")}.`
                    );
                  }
                }
                if (locale === "en") {
                  // Four-word frames catch short filler such as "note one
                  // remaining flaw" anywhere in the body. Six-word frames are
                  // limited to sentence openings, where a repeated chassis is
                  // most visible; scanning every internal technical phrase at
                  // that width over-penalizes legitimate shared terminology.
                  const sixWordOpenings = new Set(proseSentences(body)
                    .map((sentence) => englishWordShingles(sentence, 6).values().next().value)
                    .filter(Boolean));
                  const phraseShingles = [
                    [4, englishWordShingles(body, 4)],
                    [6, sixWordOpenings],
                  ];
                  expansionEnglishBodies.push({
                    id: lesson.id,
                    path: lessonPath,
                    shingles: englishWordShingles(body),
                  });
                  for (const [width, shingles] of phraseShingles) {
                    for (const shingle of shingles) {
                      // Concrete pitch and tempo instructions naturally reuse
                      // short numerical grammar (for example, "at 72 BPM").
                      // The sentence and similarity gates still inspect those
                      // passages; this phrase gate targets reusable prose
                      // chassis rather than musical notation.
                      if (
                        shingle.includes("<number>")
                        || shingle.includes("<note>")
                        || shingle.includes("<numeral>")
                      ) continue;
                      const key = `${width}:${shingle}`;
                      const occurrences = expansionEnglishPhrases.get(key) ?? [];
                      occurrences.push({ id: lesson.id, path: lessonPath });
                      expansionEnglishPhrases.set(key, occurrences);
                    }
                  }
                  for (const sentence of proseSentences(body)) {
                    if (proseUnits(sentence) < 8) continue;
                    const stem = englishSentenceStem(sentence);
                    if (!stem) continue;
                    const occurrences = expansionEnglishSentenceStems.get(stem) ?? [];
                    occurrences.push({ path: lessonPath, source: sentence });
                    expansionEnglishSentenceStems.set(stem, occurrences);
                  }
                }
                const signatureTarget = /^[a-z0-9#♭♯]{1,3}$/iu.test(targetLabel)
                  ? ""
                  : targetLabel;
                for (const sentence of normalizedSentenceSignatures(body, locale, [
                  { value: unit.titles?.[locale], token: "<unit>" },
                  { value: focusLabel, token: "<focus>" },
                  { value: signatureTarget, token: "<target>" },
                ])) {
                  const key = `${locale}:${sentence.signature}`;
                  const occurrences = expansionSentences.get(key) ?? [];
                  occurrences.push({ path: lessonPath, source: sentence.source, locale });
                  expansionSentences.set(key, occurrences);
                }
              }
            }
          }

          const lowercaseMarkdown = markdown.toLocaleLowerCase("en");
          for (const phrase of BANNED_PHRASES) {
            if (lowercaseMarkdown.includes(phrase)) {
              addError(errors, lessonPath, `Contains banned cliché phrase "${phrase}".`);
            }
          }
        }
      }
    }
  }

  for (const lessonPath of walkLessonMarkdown(coursesRoot)) {
    if (!expectedLessonPaths.has(lessonPath)) {
      addError(errors, lessonPath, "Orphan lesson.md is not referenced by any course catalog.");
    }
  }

  for (const occurrences of expansionSentences.values()) {
    if (occurrences.length <= MAX_REPEATED_EXPANSION_SENTENCE) continue;
    const example = occurrences[0].source.length > 120
      ? `${occurrences[0].source.slice(0, 117)}...`
      : occurrences[0].source;
    addError(
      errors,
      occurrences[0].path,
      `${occurrences[0].locale} expansion sentence repeats in ${occurrences.length} lessons (maximum ${MAX_REPEATED_EXPANSION_SENTENCE}): "${example}"`
    );
  }

  for (const [stem, occurrences] of expansionEnglishSentenceStems) {
    if (occurrences.length <= MAX_REPEATED_ENGLISH_SENTENCE_STEM) continue;
    addError(
      errors,
      occurrences[0].path,
      `English expansion sentence opening "${stem}" appears ${occurrences.length} times (maximum ${MAX_REPEATED_ENGLISH_SENTENCE_STEM}); vary the instructional flow.`
    );
  }

  const repeatedPhraseCohorts = new Set();
  const repeatedPhrases = [...expansionEnglishPhrases.entries()]
    .map(([key, occurrences]) => {
      const separator = key.indexOf(":");
      return {
        width: Number(key.slice(0, separator)),
        phrase: key.slice(separator + 1),
        occurrences,
      };
    })
    .filter(({ width, occurrences }) => occurrences.length > (
      width === 4
        ? MAX_REPEATED_ENGLISH_FOUR_WORD_PHRASE
        : MAX_REPEATED_ENGLISH_SIX_WORD_PHRASE
    ))
    .sort((left, right) => right.occurrences.length - left.occurrences.length);
  for (const { width, phrase, occurrences } of repeatedPhrases) {
    // Adjacent shingles from the same stock clause usually have an identical
    // lesson cohort. Report that chassis once instead of flooding the author
    // with every overlapping window.
    const cohort = `${width}:${occurrences.map(({ id }) => id).sort().join("\u0000")}`;
    if (repeatedPhraseCohorts.has(cohort)) continue;
    repeatedPhraseCohorts.add(cohort);
    const maximum = width === 4
      ? MAX_REPEATED_ENGLISH_FOUR_WORD_PHRASE
      : MAX_REPEATED_ENGLISH_SIX_WORD_PHRASE;
    addError(
      errors,
      occurrences[0].path,
      `English expansion ${width}-word phrase "${phrase}" appears in ${occurrences.length} lessons (maximum ${maximum}); rewrite the shared chassis.`
    );
  }

  for (let leftIndex = 0; leftIndex < expansionEnglishBodies.length; leftIndex += 1) {
    const left = expansionEnglishBodies[leftIndex];
    if (left.shingles.size < 20) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < expansionEnglishBodies.length; rightIndex += 1) {
      const right = expansionEnglishBodies[rightIndex];
      if (right.shingles.size < 20) continue;
      const similarity = jaccardSimilarity(left.shingles, right.shingles);
      if (similarity <= MAX_ENGLISH_SHINGLE_SIMILARITY) continue;
      addError(
        errors,
        right.path,
        `English expansion prose is ${Math.round(similarity * 100)}% similar to ${left.id}; rewrite the shared template.`
      );
    }
  }

  return { valid: errors.length === 0, errors, lessons, lengthChecked };
}

function usage() {
  return [
    "Usage: node scripts/audit-v2-bulk.js [options]",
    "",
    "Options:",
    "  --root <path>          Path to the v2 directory.",
    "  --prefix <lesson-id>   Also enforce new-lesson length for this ID prefix; repeatable.",
    "  --no-revision-one      Do not automatically length-check revision-1 lessons.",
    "  --help                 Show this help message.",
  ].join("\n");
}

function parseArguments(argv) {
  const parsed = {
    root: defaultV2Root(),
    expansionPrefixes: [...DEFAULT_EXPANSION_PREFIXES],
    checkRevisionOne: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") {
      parsed.help = true;
    } else if (argument === "--no-revision-one") {
      parsed.checkRevisionOne = false;
    } else if (argument === "--root" || argument === "--prefix") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}.`);
      if (argument === "--root") parsed.root = path.resolve(value);
      else parsed.expansionPrefixes.push(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument ${argument}.`);
    }
  }
  return parsed;
}

function printErrors(errors) {
  let previousPath;
  for (const entry of errors) {
    if (entry.path !== previousPath) console.error(entry.path);
    console.error(`  - ${entry.message}`);
    previousPath = entry.path;
  }
}

if (require.main === module) {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.message}\n\n${usage()}`);
    process.exitCode = 64;
    options = null;
  }
  if (options?.help) {
    console.log(usage());
  } else if (options) {
    const result = auditV2Bulk(options.root, options);
    if (!result.valid) {
      printErrors(result.errors);
      console.error(`Bulk v2 audit failed with ${result.errors.length} error(s).`);
      process.exitCode = 1;
    } else {
      console.log(
        `Audited ${result.lessons} v2 lesson(s); checked ${result.lengthChecked} new localized body/bodies.`
      );
    }
  }
}

module.exports = {
  BANNED_PHRASES,
  CJK_ENGLISH_LEAKAGE_WORDS,
  DEFAULT_EXPANSION_PREFIXES,
  MAX_REPEATED_EXPANSION_SENTENCE,
  MAX_ENGLISH_SHINGLE_SIMILARITY,
  MAX_EXPANSION_MINUTES,
  MAX_INSTRUCTION_SENTENCE_UNITS,
  MAX_REPEATED_ENGLISH_FOUR_WORD_PHRASE,
  MAX_REPEATED_ENGLISH_SIX_WORD_PHRASE,
  MAX_REPEATED_ENGLISH_SENTENCE_STEM,
  MAX_LESSON_FOCUS_MENTIONS,
  MAX_UNIT_TITLE_MENTIONS,
  REQUIRED_LOCALES,
  auditV2Bulk,
  englishSentenceStem,
  playableFenceTitles,
  proseUnits,
  normalizedSentenceSignatures,
  harmonyTargetLabel,
  targetOccurrences,
};
