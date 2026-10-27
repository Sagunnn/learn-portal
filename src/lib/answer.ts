import type { FillQuestion, RichText } from "../types/content";

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

export function checkFill(q: FillQuestion, input: string): FillResult {
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
