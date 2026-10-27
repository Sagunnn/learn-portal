import type { FillQuestion, RichText } from "../types/content";
import { parseFraction, sameValue } from "./fraction";

/** Makes typed answers comparable: Unicode NFC (matters for Devanagari), spacing, end punctuation. */
export function normalize(value: string, caseSensitive = false): string {
  let s = value.normalize("NFC").replace(/\s+/g, " ").trim();
  s = s.replace(/[।.!?,;:]+$/u, "").trim();
  // Zero-width joiners sneak in from some Nepali keyboards.
  s = s.replace(/[​-‍﻿]/g, "");
  return caseSensitive ? s : s.toLocaleLowerCase();
}

/** Accepts "1,000", "−5" (unicode minus) and Devanagari digits (०-९). */
export function parseNumber(value: string): number {
  const s = value
    .trim()
    .replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(/[−–]/g, "-")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
  return s === "" ? NaN : Number(s);
}

function matches(input: string, candidate: string, q: FillQuestion): boolean {
  if (q.match === "number") {
    const a = parseNumber(input);
    const b = parseNumber(candidate);
    return !Number.isNaN(a) && Math.abs(a - b) <= (q.tolerance ?? 1e-9);
  }
  return normalize(input, q.caseSensitive) === normalize(candidate, q.caseSensitive);
}

export type FillResult = { correct: true } | { correct: false; why?: RichText };

/** Fraction answers are compared by value, then by form (lowest terms / mixed / improper). */
function checkFraction(q: FillQuestion, input: string): FillResult {
  const got = parseFraction(input);
  if (!got) return { correct: false, why: "Type a fraction like **5/6**, a whole number, or a mixed number like **2 3/4**." };
  const isValue = (s: string) => {
    const f = parseFraction(s);
    return !!f && sameValue(f, got);
  };
  // A mistake written exactly this way (e.g. "6/9" for "simplify 12/18") gets its own message.
  const exact = q.mistakes?.find((m) =>
    m.answers.some((s) => {
      const f = parseFraction(s);
      return !!f && f.num === got.num && f.den === got.den && f.form === got.form;
    }),
  );
  if (exact) return { correct: false, why: exact.why };
  if (q.answers.some(isValue)) {
    if (q.form === "mixed" && got.form === "fraction" && Math.abs(got.num) >= got.den) {
      return { correct: false, why: "Right amount! Now write it as a **mixed number**, like **2 3/4**." };
    }
    if (q.form === "improper" && got.form === "mixed") {
      return { correct: false, why: "Right amount! Now write it as an **improper fraction**, like **11/4**." };
    }
    if (q.simplest && !got.lowest) {
      return { correct: false, why: "Right value! Now **simplify** it: divide the top and bottom by the biggest number that goes into both." };
    }
    return { correct: true };
  }
  const mistake = q.mistakes?.find((m) => m.answers.some(isValue));
  return { correct: false, why: mistake?.why };
}

export function checkFill(q: FillQuestion, input: string): FillResult {
  if (q.match === "fraction") return checkFraction(q, input);
  if (q.answers.some((a) => matches(input, a, q))) return { correct: true };
  const mistake = q.mistakes?.find((m) => m.answers.some((a) => matches(input, a, q)));
  return { correct: false, why: mistake?.why };
}

/** Fisher–Yates; returns a new array. */
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
