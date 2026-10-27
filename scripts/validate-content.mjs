// Checks every file in content/ against the JSON schemas plus a few rules a
// schema can't express (unique ids, one correct MCQ option, a "why" on every
// wrong option). Runs before each build; the dev server also uses it to warn.
//
//   node scripts/validate-content.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CONTENT_DIR = join(ROOT, "content");
export const LESSONS_DIR = join(CONTENT_DIR, "lessons");

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

export function listLessonFiles() {
  if (!existsSync(LESSONS_DIR)) return [];
  return readdirSync(LESSONS_DIR, { recursive: true })
    .filter((f) => f.endsWith(".json"))
    .map((f) => join(LESSONS_DIR, f))
    .sort();
}

function makeValidators() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return {
    lesson: ajv.compile(readJson(join(ROOT, "schema/lesson.schema.json"))),
    subjects: ajv.compile(readJson(join(ROOT, "schema/subjects.schema.json"))),
  };
}

function formatAjv(errors = []) {
  // if/then schemas repeat the same error several times; keep one of each.
  const seen = new Set();
  return errors
    .filter((e) => e.keyword !== "if")
    .map((e) => `${e.instancePath || "(root)"} ${e.message}${e.params?.additionalProperty ? ` "${e.params.additionalProperty}"` : ""}`)
    .filter((m) => !seen.has(m) && seen.add(m));
}

function checkQuestion(q, where, errors, ids) {
  if (ids.has(q.id)) errors.push(`${where}: duplicate question id "${q.id}"`);
  ids.add(q.id);
  if (q.type === "mcq") {
    const correct = q.options.filter((o) => o.correct).length;
    if (correct !== 1) errors.push(`${where} (${q.id}): needs exactly one option with "correct": true, found ${correct}`);
    q.options.forEach((o, i) => {
      if (!o.correct && !o.why) errors.push(`${where} (${q.id}): wrong option ${i + 1} has no "why" explanation`);
    });
  }
  if (q.type === "fill" && q.match === "fraction") {
    for (const a of [...q.answers, ...(q.mistakes ?? []).flatMap((m) => m.answers)]) {
      if (!/^\s*-?\d+(\s+\d+\s*\/\s*\d+|\s*\/\s*\d+)?\s*$/.test(a)) errors.push(`${where} (${q.id}): "${a}" isn't a fraction like 5/6 or 2 3/4`);
    }
  }
  if (q.type === "fill") {
    const prompt = Array.isArray(q.prompt) ? q.prompt.join("\n") : q.prompt;
    if ((prompt.match(/___/g) || []).length > 1) errors.push(`${where} (${q.id}): only one ___ blank is supported`);
    if (q.match === "number" && q.answers.some((a) => Number.isNaN(Number(a.replace(/,/g, ""))))) {
      errors.push(`${where} (${q.id}): match is "number" but an answer is not a number`);
    }
  }
}

/** Returns { errors: string[], lessons: number }. Never throws. */
export function validateAll() {
  const errors = [];
  const v = makeValidators();

  let subjectIds = new Set();
  const subjectsFile = join(CONTENT_DIR, "subjects.json");
  try {
    const data = readJson(subjectsFile);
    if (!v.subjects(data)) formatAjv(v.subjects.errors).forEach((m) => errors.push(`subjects.json: ${m}`));
    subjectIds = new Set((data.subjects || []).map((s) => s.id));
  } catch (e) {
    errors.push(`subjects.json: ${e.message}`);
  }

  const lessonIds = new Map();
  const files = listLessonFiles();
  for (const file of files) {
    const rel = relative(ROOT, file);
    let lesson;
    try {
      lesson = readJson(file);
    } catch (e) {
      errors.push(`${rel}: invalid JSON (${e.message})`);
      continue;
    }
    if (!v.lesson(lesson)) {
      formatAjv(v.lesson.errors).forEach((m) => errors.push(`${rel}: ${m}`));
      continue;
    }
    const { meta } = lesson;
    if (lessonIds.has(meta.id)) errors.push(`${rel}: lesson id "${meta.id}" is already used by ${lessonIds.get(meta.id)}`);
    lessonIds.set(meta.id, rel);
    if (!subjectIds.has(meta.subject)) errors.push(`${rel}: subject "${meta.subject}" is not in subjects.json`);

    const qIds = new Set();
    lesson.chunks.forEach((c, i) => c.type === "check" && checkQuestion(c.question, `${rel} chunk ${i + 1}`, errors, qIds));
    lesson.quiz?.questions.forEach((q, i) => checkQuestion(q, `${rel} quiz question ${i + 1}`, errors, qIds));
    const challengeIds = new Set();
    lesson.chunks.forEach((c) =>
      c.challenges?.forEach((ch) => {
        if (challengeIds.has(ch.id)) errors.push(`${rel}: duplicate challenge id "${ch.id}"`);
        challengeIds.add(ch.id);
      }),
    );
    const cardIds = new Set();
    lesson.flashcards?.forEach((card) => {
      if (cardIds.has(card.id)) errors.push(`${rel}: duplicate flashcard id "${card.id}"`);
      cardIds.add(card.id);
    });
  }
  return { errors, lessons: files.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { errors, lessons } = validateAll();
  if (errors.length) {
    console.error(`✗ Content has ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`✓ Content OK (${lessons} lesson${lessons === 1 ? "" : "s"})`);
}
