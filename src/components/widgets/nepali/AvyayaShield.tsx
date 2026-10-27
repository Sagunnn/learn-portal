import { useState } from "react";
import { cx } from "../../ui/primitives";
import { WidgetPanel, useReportState, type WidgetState } from "../controls";

/**
 * "Unbreakable Word" tester (अव्यय). Swap the subject (केटा / केटी / केटाहरू) and the
 * tense: the noun and verb change, but the अव्यय stays locked in its shield.
 * Every Nepali word has an English helper; an English translation updates live.
 */
type Subj = 0 | 1 | 2; // boy, girl, boys
type Tense = 0 | 1 | 2; // present, past, future

const SUBJECTS = [
  { ne: "केटा", en: "boy", eng: "The boy" },
  { ne: "केटी", en: "girl", eng: "The girl" },
  { ne: "केटाहरू", en: "boys", eng: "The boys" },
];
const TENSES = [
  { ne: "वर्तमान", en: "present" },
  { ne: "भूत", en: "past" },
  { ne: "भविष्यत्", en: "future" },
];

type Sentence = {
  avyaya: string;
  avEn: string;
  kind: string;
  kindEn: string;
  /** Nepali verb forms: [tense][subject] */
  verb: string[][];
  verbEn: string;
  /** build the Nepali tokens around subject / avyaya / verb */
  layout: ("S" | "A" | "V" | { w: string; en: string; joinNext?: boolean })[];
  /** English forms: [present3sg, presentPl, past, future] */
  eng: [string, string, string, string];
  english: (s: string, v: string) => string;
};

const SENTENCES: Sentence[] = [
  {
    avyaya: "बिस्तारै",
    avEn: "slowly",
    kind: "क्रियाविशेषण",
    kindEn: "adverb",
    verb: [
      ["हिँड्छ", "हिँड्छे", "हिँड्छन्"],
      ["हिँड्यो", "हिँडी", "हिँडे"],
      ["हिँड्नेछ", "हिँड्नेछे", "हिँड्नेछन्"],
    ],
    verbEn: "walk",
    layout: ["S", "A", "V"],
    eng: ["walks", "walk", "walked", "will walk"],
    english: (s, v) => `${s} ${v} slowly.`,
  },
  {
    avyaya: "माथि",
    avEn: "above, on",
    kind: "नामयोगी",
    kindEn: "postposition",
    verb: [
      ["चढ्छ", "चढ्छे", "चढ्छन्"],
      ["चढ्यो", "चढी", "चढे"],
      ["चढ्नेछ", "चढ्नेछे", "चढ्नेछन्"],
    ],
    verbEn: "climb",
    layout: ["S", { w: "टेबल", en: "table", joinNext: true }, "A", "V"],
    eng: ["climbs", "climb", "climbed", "will climb"],
    english: (s, v) => `${s} ${v} onto the table.`,
  },
  {
    avyaya: "र",
    avEn: "and",
    kind: "संयोजक",
    kindEn: "conjunction",
    verb: [
      ["खान्छ", "खान्छे", "खान्छन्"],
      ["खायो", "खाई", "खाए"],
      ["खानेछ", "खानेछे", "खानेछन्"],
    ],
    verbEn: "eat",
    layout: ["S", { w: "भात", en: "rice" }, "A", { w: "दाल", en: "lentils" }, "V"],
    eng: ["eats", "eat", "ate", "will eat"],
    english: (s, v) => `${s} ${v} rice and lentils.`,
  },
  {
    avyaya: "ओहो!",
    avEn: "wow!",
    kind: "विस्मयादिबोधक",
    kindEn: "interjection",
    verb: [
      ["जित्छ", "जित्छे", "जित्छन्"],
      ["जित्यो", "जिती", "जिते"],
      ["जित्नेछ", "जित्नेछे", "जित्नेछन्"],
    ],
    verbEn: "win",
    layout: ["A", "S", "V"],
    eng: ["wins", "win", "won", "will win"],
    english: (s, v) => `Wow! ${s} ${v}.`,
  },
  {
    avyaya: "पो",
    avEn: "so…! (surprise)",
    kind: "निपात",
    kindEn: "particle",
    verb: [
      ["आउँछ", "आउँछे", "आउँछन्"],
      ["आयो", "आई", "आए"],
      ["आउनेछ", "आउनेछे", "आउनेछन्"],
    ],
    verbEn: "come",
    layout: ["S", "A", "V"],
    eng: ["comes", "come", "came", "will come"],
    english: (s, v) => `Oh, so ${s.toLowerCase()} ${v}!`,
  },
];

export default function AvyayaShield({ onState }: { onState?: (s: WidgetState) => void }) {
  const [si, setSi] = useState(0);
  const [subj, setSubj] = useState<Subj>(0);
  const [tense, setTense] = useState<Tense>(0);
  const [toggles, setToggles] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const [flash, setFlash] = useState(0); // re-keys the changing words so they pop

  useReportState({ toggles, seen: seen.size, sentence: si }, onState);

  const s = SENTENCES[si];
  const verb = s.verb[tense][subj];
  const engVerb = tense === 0 ? (subj === 2 ? s.eng[1] : s.eng[0]) : tense === 1 ? s.eng[2] : s.eng[3];

  const change = (fn: () => void) => {
    fn();
    setToggles((t) => t + 1);
    setFlash((f) => f + 1);
  };

  const word = (w: string, en: string, changing: boolean, key: string) => (
    <span key={key + (changing ? flash : "")} className={cx("inline-flex flex-col items-center rounded-2xl px-3 py-2", changing ? "animate-pop bg-amber-100 ring-2 ring-amber-300" : "bg-slate-100")}>
      <span className="lang-ne font-display text-3xl font-semibold text-slate-900">{w}</span>
      <span className="text-xs font-bold text-slate-500">{en}</span>
    </span>
  );

  return (
    <WidgetPanel>
      {/* pick a sentence */}
      <div>
        <div className="mb-2 font-display text-base font-semibold text-slate-700">
          Pick an <span className="lang-ne">अव्यय</span>
          <span className="gloss-en">indeclinable word</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SENTENCES.map((x, i) => (
            <button
              key={x.avyaya}
              type="button"
              aria-pressed={si === i}
              onClick={() => {
                setSi(i);
                setSeen((v) => new Set(v).add(i));
              }}
              className={cx(
                "flex min-h-[56px] flex-col items-center justify-center rounded-2xl border-2 border-b-4 px-4 py-1 transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2",
                si === i ? "border-indigo-700 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
              )}
            >
              <span className="lang-ne text-xl font-semibold leading-tight">{x.avyaya}</span>
              <span className={cx("text-xs font-bold", si === i ? "text-indigo-100" : "text-slate-400")}>{x.avEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* the sentence stage */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-indigo-50/60 to-white px-3 py-6">
        <div className="flex flex-wrap items-end justify-center gap-2">
          {s.layout.map((t, i) => {
            if (t === "S") return word(SUBJECTS[subj].ne, SUBJECTS[subj].en, true, "s");
            if (t === "V") return word(verb + "।", s.verbEn, true, "v");
            if (t === "A")
              return (
                <span key="a" className="relative inline-flex flex-col items-center">
                  <span className="mb-1 whitespace-nowrap rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">🔒 never changes</span>
                  <span className="shield-glow inline-flex flex-col items-center rounded-2xl border-2 border-indigo-400 bg-white px-4 py-2">
                    <span className="lang-ne font-display text-3xl font-semibold text-indigo-700">{s.avyaya}</span>
                    <span className="text-xs font-bold text-indigo-400">{s.avEn}</span>
                  </span>
                </span>
              );
            return word(t.w, t.en, false, `w${i}`);
          })}
        </div>
        <p className="mt-4 text-center text-lg font-semibold text-slate-500">
          “{s.english(SUBJECTS[subj].eng, engVerb)}”
        </p>
        <p className="mt-1 text-center text-sm font-bold text-slate-500">
          <span className="lang-ne">{s.avyaya}</span> is a <span className="lang-ne">{s.kind}</span>
          <span className="gloss-en">{s.kindEn}</span>
        </p>
      </div>

      {/* toggles */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 font-display text-base font-semibold text-slate-700">
            Change the subject: <span className="lang-ne">लिङ्ग</span>
            <span className="gloss-en">gender</span> / <span className="lang-ne">वचन</span>
            <span className="gloss-en">number</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((x, i) => (
              <button
                key={x.ne}
                type="button"
                aria-pressed={subj === i}
                {...(i === 1 ? { "data-start": true } : {})}
                onClick={() => subj !== i && change(() => setSubj(i as Subj))}
                className={cx(
                  "flex min-h-[60px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-b-4 px-3 py-1 transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2",
                  subj === i ? "border-amber-600 bg-amber-400 text-amber-950" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                )}
              >
                <span className="lang-ne text-xl font-semibold leading-tight">{x.ne}</span>
                <span className="text-xs font-bold opacity-70">{x.en}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 font-display text-base font-semibold text-slate-700">
            Change the <span className="lang-ne">काल</span>
            <span className="gloss-en">tense</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TENSES.map((x, i) => (
              <button
                key={x.ne}
                type="button"
                aria-pressed={tense === i}
                onClick={() => tense !== i && change(() => setTense(i as Tense))}
                className={cx(
                  "flex min-h-[60px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-b-4 px-3 py-1 transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2",
                  tense === i ? "border-amber-600 bg-amber-400 text-amber-950" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                )}
              >
                <span className="lang-ne text-xl font-semibold leading-tight">{x.ne}</span>
                <span className="text-xs font-bold opacity-70">{x.en}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-base font-semibold text-slate-600" aria-live="polite">
        You changed things {toggles} time{toggles === 1 ? "" : "s"}. The <span className="lang-ne">अव्यय</span> changed{" "}
        <strong className="text-indigo-700">0 times</strong>!
      </p>
    </WidgetPanel>
  );
}
