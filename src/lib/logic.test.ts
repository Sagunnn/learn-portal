import { describe, expect, it } from "vitest";
import { checkFill, normalize, parseNumber } from "./answer";
import { addDays, lastDays } from "./date";
import { emptyState, levelFor, liveStreak, withXp } from "./progress";
import { renderRich } from "./richText";
import { fracTex, gcd, lcm, parseFraction } from "./fraction";
import type { FillQuestion } from "../types/content";

describe("answer checking", () => {
  const nepali: FillQuestion = {
    id: "q",
    type: "fill",
    prompt: "___",
    answers: ["निर्धन", "nirdhan"],
    mistakes: [{ answers: ["निरधन"], why: "halanta" }],
  };

  it("accepts Devanagari, romanised and differently-spaced answers", () => {
    expect(checkFill(nepali, "निर्धन").correct).toBe(true);
    expect(checkFill(nepali, "  NirDhan ").correct).toBe(true);
    expect(checkFill(nepali, "निर्धन।").correct).toBe(true);
  });

  it("returns the specific explanation for a known mistake", () => {
    expect(checkFill(nepali, "निरधन")).toEqual({ correct: false, why: "halanta" });
    expect(checkFill(nepali, "something")).toEqual({ correct: false, why: undefined });
  });

  it("matches numbers, including Devanagari digits", () => {
    const q: FillQuestion = { id: "n", type: "fill", prompt: "___", answers: ["12"], match: "number" };
    expect(checkFill(q, "12.0").correct).toBe(true);
    expect(checkFill(q, "१२").correct).toBe(true);
    expect(checkFill(q, "13").correct).toBe(false);
    expect(parseNumber("1,000")).toBe(1000);
    expect(parseNumber("−5")).toBe(-5);
  });

  it("strips zero-width joiners", () => {
    expect(normalize("नि‍र्धन")).toBe(normalize("निर्धन"));
  });
});

describe("streaks and XP", () => {
  it("starts, continues and breaks a streak", () => {
    let s = withXp(emptyState(), 10, "2026-03-01");
    expect(s.streak).toMatchObject({ current: 1, lastActive: "2026-03-01" });
    s = withXp(s, 5, "2026-03-01");
    expect(s.streak.current).toBe(1);
    expect(s.daily["2026-03-01"]).toBe(15);
    s = withXp(s, 5, "2026-03-02");
    expect(s.streak.current).toBe(2);
    expect(liveStreak(s, "2026-03-03")).toBe(2); // still alive until the end of the next day
    expect(liveStreak(s, "2026-03-04")).toBe(0);
    s = withXp(s, 5, "2026-03-05");
    expect(s.streak).toMatchObject({ current: 1, longest: 2 });
    expect(s.xp).toBe(25);
  });

  it("handles month boundaries", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(lastDays(3, "2026-01-01")).toEqual(["2025-12-30", "2025-12-31", "2026-01-01"]);
  });

  it("computes levels", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0, span: 100 });
    expect(levelFor(100)).toMatchObject({ level: 2, into: 0, span: 200 });
    expect(levelFor(299).level).toBe(2);
    expect(levelFor(300).level).toBe(3);
  });
});

describe("rich text", () => {
  it("escapes HTML", () => {
    expect(renderRich("<b>x</b>")).toBe("<p>&lt;b&gt;x&lt;/b&gt;</p>");
  });

  it("renders markup and lists", () => {
    const html = renderRich(["**bold** and *it* and ==hi==", "- one", "- two", "1. first"]);
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>it</em>");
    expect(html).toContain("<mark>hi</mark>");
    expect(html).toContain("<ul><li>one</li><li>two</li></ul><ol><li>first</li></ol>");
  });

  it("renders math without touching * inside it", () => {
    const html = renderRich("$a*b*c$ costs \\$5");
    expect(html).toContain("katex");
    expect(html).not.toContain("<em>");
    expect(html).toContain("costs $5");
  });

  it("doesn't wrap display math in a paragraph", () => {
    expect(renderRich("$$x^2$$").startsWith("<span class=\"katex-display\"")).toBe(true);
  });
});

describe("fractions", () => {
  const q = (extra: Partial<FillQuestion>): FillQuestion => ({ id: "f", type: "fill", prompt: "___", answers: ["2/3"], match: "fraction", ...extra });

  it("parses fractions, mixed numbers and whole numbers", () => {
    expect(parseFraction("5/6")).toMatchObject({ num: 5, den: 6, form: "fraction", lowest: true });
    expect(parseFraction(" 2 3/4 ")).toMatchObject({ num: 11, den: 4, form: "mixed" });
    expect(parseFraction("2+3/4")).toMatchObject({ num: 11, den: 4, form: "mixed" });
    expect(parseFraction("३/४")).toMatchObject({ num: 3, den: 4 });
    expect(parseFraction("4")).toMatchObject({ num: 4, den: 1, form: "integer" });
    expect(parseFraction("1/0")).toBeNull();
    expect(parseFraction("2 5/4")).toBeNull();
    expect(parseFraction("abc")).toBeNull();
  });

  it("checks value, simplest form and mixed form", () => {
    expect(checkFill(q({}), "4/6").correct).toBe(true);
    expect(checkFill(q({ simplest: true }), "4/6").correct).toBe(false);
    expect(checkFill(q({ simplest: true }), "2/3").correct).toBe(true);
    const mixed = q({ answers: ["2 3/4"], form: "mixed" });
    expect(checkFill(mixed, "2 3/4").correct).toBe(true);
    expect(checkFill(mixed, "11/4")).toMatchObject({ correct: false });
    expect(checkFill(q({ answers: ["11/4"] }), "2 3/4").correct).toBe(true);
  });

  it("gives the trap message for adding straight across, and exact-form mistakes first", () => {
    const add = q({ answers: ["5/6"], mistakes: [{ answers: ["2/5"], why: "trap" }] });
    expect(checkFill(add, "2/5")).toEqual({ correct: false, why: "trap" });
    expect(checkFill(add, "4/10")).toEqual({ correct: false, why: "trap" });
    const simp = q({ simplest: true, mistakes: [{ answers: ["6/9"], why: "keep gluing" }] });
    expect(checkFill(simp, "6/9")).toEqual({ correct: false, why: "keep gluing" });
    expect(checkFill(simp, "8/12").correct).toBe(false);
  });

  it("does gcd/lcm/fracTex", () => {
    expect(gcd(12, 18)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
    expect(fracTex(11, 4, { mixed: true })).toBe("2\\tfrac{3}{4}");
    expect(fracTex(8, 4, { mixed: true })).toBe("2");
  });
});
