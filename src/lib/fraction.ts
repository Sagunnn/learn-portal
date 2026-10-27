export const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};

export const lcm = (a: number, b: number) => Math.abs(a * b) / gcd(a, b);

export function simplify(n: number, d: number): [number, number] {
  const g = gcd(n, d);
  return [n / g, d / g];
}

export interface ParsedFraction {
  /** Value as an improper fraction num/den (den > 0). */
  num: number;
  den: number;
  /** How the student wrote it. */
  form: "integer" | "fraction" | "mixed";
  /** Written in lowest terms (for a mixed number, the fractional part). */
  lowest: boolean;
}

const DEVANAGARI_DIGIT = /[०-९]/g;

/**
 * Parses what a student types: "3", "5/6", "-1/2", "2 3/4", "2 & 3/4", "2+3/4".
 * Returns null for anything else (including a zero denominator).
 */
export function parseFraction(raw: string): ParsedFraction | null {
  const s = raw
    .replace(DEVANAGARI_DIGIT, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(/[−–]/g, "-")
    .replace(/[⁄∕÷]/g, "/")
    .trim()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*(&|\+|and)\s*/i, " ")
    .replace(/\s+/g, " ");

  let m = /^(-?)(\d+)$/.exec(s);
  if (m) return { num: Number(m[2]) * (m[1] ? -1 : 1), den: 1, form: "integer", lowest: true };

  m = /^(-?)(\d+)\/(\d+)$/.exec(s);
  if (m) {
    const n = Number(m[2]);
    const d = Number(m[3]);
    if (d === 0) return null;
    return { num: m[1] ? -n : n, den: d, form: "fraction", lowest: gcd(n, d) === 1 };
  }

  m = /^(-?)(\d+) (\d+)\/(\d+)$/.exec(s);
  if (m) {
    const w = Number(m[2]);
    const n = Number(m[3]);
    const d = Number(m[4]);
    if (d === 0 || n >= d) return null; // "2 5/4" isn't a proper mixed number
    const total = w * d + n;
    return { num: m[1] ? -total : total, den: d, form: "mixed", lowest: gcd(n, d) === 1 };
  }
  return null;
}

export const sameValue = (a: ParsedFraction, b: ParsedFraction) => a.num * b.den === b.num * a.den;

/** KaTeX for n/d, as a mixed number when asked and improper. */
export function fracTex(n: number, d: number, opts: { mixed?: boolean } = {}): string {
  if (d === 1) return String(n);
  if (opts.mixed && Math.abs(n) >= d) {
    const w = Math.trunc(n / d);
    const r = Math.abs(n % d);
    return r === 0 ? String(w) : `${w}\\tfrac{${r}}{${d}}`;
  }
  return `\\tfrac{${n}}{${d}}`;
}
