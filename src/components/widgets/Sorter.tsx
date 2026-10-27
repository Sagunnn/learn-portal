import { useState, type DragEvent } from "react";
import { cx } from "../ui/primitives";
import { WidgetPanel, useReportState, type WidgetState } from "./controls";

/**
 * Sort cards into buckets. Drag a card (mouse), or tap a card then a bucket
 * (touch / keyboard). Wrong drops bounce back with the reason.
 * Decks: 0 = scalar vs vector, 1 = acids vs bases at home, 2 = the 5 kinds of अव्यय.
 */
type Bucket = { id: string; title: string; en?: string; sub: string; tone: "sage" | "indigo" | "rose" | "amber" | "sky" | "violet" };
type Card = { id: string; name: string; hint: string; kind: string; why: string };
type Deck = { lang?: "ne"; buckets: Bucket[]; cards: Card[] };

const DECKS: Deck[] = [
  {
    buckets: [
      { id: "scalar", title: "Scalar", sub: "Asks only: How much?", tone: "sage" },
      { id: "vector", title: "Vector", sub: "Asks: How much + which way?", tone: "indigo" },
    ],
    cards: [
      { id: "mass", name: "Mass", hint: "40 kg", kind: "scalar", why: "Mass is only an amount (40 kg). It doesn't point anywhere." },
      { id: "time", name: "Time", hint: "10 s", kind: "scalar", why: "Time has no direction on a map: 10 s is just 10 s." },
      { id: "speed", name: "Speed", hint: "5 m/s", kind: "scalar", why: "Speed only says how fast. Add a direction and it becomes velocity." },
      { id: "temp", name: "Temperature", hint: "30 °C", kind: "scalar", why: "30 °C doesn't point north or south. It's only an amount." },
      { id: "force", name: "Force", hint: "20 N →", kind: "vector", why: "A push or pull always has a direction: 20 N left is not the same as 20 N right." },
      { id: "velocity", name: "Velocity", hint: "5 m/s East", kind: "vector", why: "Velocity is speed with a direction, like 5 m/s East." },
      { id: "accel", name: "Acceleration", hint: "2 m/s² forward", kind: "vector", why: "Acceleration has a direction: speeding up forwards is different from braking." },
      { id: "disp", name: "Displacement", hint: "50 m North-East", kind: "vector", why: "Displacement is a straight arrow from start to finish, so it has a direction." },
    ],
  },
  {
    buckets: [
      { id: "acid", title: "Acid", sub: "Tastes sour", tone: "rose" },
      { id: "base", title: "Base", sub: "Tastes bitter, feels soapy", tone: "indigo" },
    ],
    cards: [
      { id: "lemon", name: "🍋 Lemon", hint: "citric acid", kind: "acid", why: "Lemons taste sour: they contain citric acid." },
      { id: "curd", name: "🥛 Curd", hint: "lactic acid", kind: "acid", why: "Curd tastes sour: it contains lactic acid." },
      { id: "vinegar", name: "🫙 Vinegar", hint: "acetic acid", kind: "acid", why: "Vinegar is sour: it is mostly water with acetic acid." },
      { id: "ant", name: "🐜 Ant sting", hint: "formic acid", kind: "acid", why: "An ant sting stings because it injects formic acid." },
      { id: "soap", name: "🧼 Soap", hint: "a base", kind: "base", why: "Soap feels slippery and tastes bitter: it's a base." },
      { id: "ash", name: "🪵 Wood ash", hint: "a base", kind: "base", why: "Wood ash in water feels soapy: it's a base." },
      { id: "soda", name: "🧁 Baking soda", hint: "a base", kind: "base", why: "Baking soda tastes bitter: it's a mild base." },
      { id: "lime", name: "🧱 Slaked lime", hint: "a base", kind: "base", why: "Slaked lime (used for whitewash and soil) is a base." },
    ],
  },
  {
    lang: "ne",
    buckets: [
      { id: "adverb", title: "क्रियाविशेषण", en: "Adverb", sub: "काम कसरी, कहिले?", tone: "sky" },
      { id: "post", title: "नामयोगी", en: "Postposition", sub: "नामसँग जोडिन्छ", tone: "sage" },
      { id: "conj", title: "संयोजक", en: "Conjunction", sub: "शब्द वा वाक्य जोड्छ", tone: "indigo" },
      { id: "interj", title: "विस्मयादिबोधक", en: "Interjection", sub: "मनको भाव", tone: "rose" },
      { id: "particle", title: "निपात", en: "Particle", sub: "जोड दिने सानो शब्द", tone: "amber" },
    ],
    cards: [
      { id: "bistarai", name: "बिस्तारै", hint: "slowly", kind: "adverb", why: "बिस्तारैले काम कसरी हुन्छ भन्छ: क्रियाविशेषण (adverb)।" },
      { id: "chadai", name: "चाँडै", hint: "quickly", kind: "adverb", why: "चाँडैले काम कसरी हुन्छ भन्छ: क्रियाविशेषण (adverb)।" },
      { id: "hijo", name: "हिजो", hint: "yesterday", kind: "adverb", why: "हिजोले काम कहिले भयो भन्छ: क्रियाविशेषण (adverb)।" },
      { id: "mathi", name: "माथि", hint: "above", kind: "post", why: "माथि नामपछि जोडिन्छ (टेबलमाथि): नामयोगी (postposition)।" },
      { id: "bhitra", name: "भित्र", hint: "inside", kind: "post", why: "भित्र नामपछि जोडिन्छ (घरभित्र): नामयोगी (postposition)।" },
      { id: "sanga", name: "सँग", hint: "with", kind: "post", why: "सँग नामपछि जोडिन्छ (साथीसँग): नामयोगी (postposition)।" },
      { id: "ra", name: "र", hint: "and", kind: "conj", why: "र ले दुई शब्द जोड्छ (भात र दाल): संयोजक (conjunction)।" },
      { id: "tara", name: "तर", hint: "but", kind: "conj", why: "तर ले दुई वाक्य जोड्छ: संयोजक (conjunction)।" },
      { id: "kinabhane", name: "किनभने", hint: "because", kind: "conj", why: "किनभने ले कारण जोड्छ: संयोजक (conjunction)।" },
      { id: "aaha", name: "आहा!", hint: "aha!", kind: "interj", why: "आहा! ले खुसी देखाउँछ: विस्मयादिबोधक (interjection)।" },
      { id: "aiya", name: "ऐया!", hint: "ouch!", kind: "interj", why: "ऐया! ले दुखाइ देखाउँछ: विस्मयादिबोधक (interjection)।" },
      { id: "dhat", name: "धत्!", hint: "darn!", kind: "interj", why: "धत्! ले झर्को देखाउँछ: विस्मयादिबोधक (interjection)।" },
      { id: "ta", name: "त", hint: "emphasis: 'though'", kind: "particle", why: "त ले कुरामा जोड दिन्छ (म त जान्छु): निपात (particle)।" },
      { id: "po", name: "पो", hint: "emphasis: 'so…!'", kind: "particle", why: "पो ले अचम्म वा जोड देखाउँछ (ऊ पो आयो): निपात (particle)।" },
      { id: "lau", name: "लौ", hint: "'okay then'", kind: "particle", why: "लौ ले कुराकानीमा जोड दिन्छ (लौ, जाऔँ): निपात (particle)।" },
    ],
  },
];

const TONES = {
  sage: { box: "border-emerald-300 bg-emerald-50/70", hot: "border-emerald-500 ring-emerald-200", text: "text-emerald-800", chip: "border-emerald-700 bg-emerald-500" },
  indigo: { box: "border-indigo-300 bg-indigo-50/70", hot: "border-indigo-500 ring-indigo-200", text: "text-indigo-800", chip: "border-indigo-800 bg-indigo-600" },
  rose: { box: "border-rose-300 bg-rose-50/70", hot: "border-rose-500 ring-rose-200", text: "text-rose-800", chip: "border-rose-700 bg-rose-500" },
  amber: { box: "border-amber-300 bg-amber-50/70", hot: "border-amber-500 ring-amber-200", text: "text-amber-800", chip: "border-amber-700 bg-amber-500" },
  sky: { box: "border-sky-300 bg-sky-50/70", hot: "border-sky-500 ring-sky-200", text: "text-sky-800", chip: "border-sky-700 bg-sky-500" },
  violet: { box: "border-violet-300 bg-violet-50/70", hot: "border-violet-500 ring-violet-200", text: "text-violet-800", chip: "border-violet-700 bg-violet-500" },
};

export default function Sorter({ deck: deckNo = 0, onState }: { deck?: number; onState?: (s: WidgetState) => void }) {
  const deck = DECKS[deckNo] ?? DECKS[0];
  const ne = deck.lang === "ne";
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ id: string; why: string; at: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hot, setHot] = useState<string | null>(null);

  const sorted = Object.keys(placed).length;
  useReportState({ sorted, mistakes }, onState);

  const drop = (id: string, bucket: string) => {
    const card = deck.cards.find((c) => c.id === id);
    if (!card || placed[id]) return;
    setPicked(null);
    setHot(null);
    if (card.kind === bucket) {
      setPlaced({ ...placed, [id]: bucket });
      setWrong(null);
    } else {
      setMistakes((m) => m + 1);
      setWrong({ id, why: card.why, at: Date.now() });
    }
  };

  const loose = deck.cards.filter((c) => !placed[c.id]);
  const deva = ne ? "lang-ne" : "";

  return (
    <WidgetPanel>
      <div className="flex items-center justify-between text-base font-bold text-slate-600">
        <span>{sorted === deck.cards.length ? "🎉 All sorted!" : picked ? "Now tap a bucket." : "Drag a card into a bucket, or tap a card then a bucket."}</span>
        <span className="tabular-nums">
          {sorted}/{deck.cards.length}
        </span>
      </div>

      <div className="flex min-h-14 flex-wrap gap-2">
        {loose.map((c, i) => (
          <button
            key={`${c.id}-${wrong?.id === c.id ? wrong.at : 0}`}
            type="button"
            draggable
            {...(i === 0 ? { "data-start": true } : {})}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", c.id);
              e.dataTransfer.effectAllowed = "move";
              setPicked(null);
            }}
            onClick={() => setPicked(picked === c.id ? null : c.id)}
            aria-pressed={picked === c.id}
            className={cx(
              "press min-h-[56px] cursor-grab rounded-2xl bg-white px-4 py-2 text-left active:cursor-grabbing",
              picked === c.id ? "border-amber-400 bg-amber-50 ring-4 ring-amber-200" : "border-slate-200 hover:border-slate-300",
              wrong?.id === c.id && "animate-shake border-rose-400",
            )}
          >
            <div className={cx("font-display text-lg font-semibold text-slate-900", deva)}>{c.name}</div>
            <div className="text-sm font-semibold text-slate-500">{deckNo === 1 ? "?" : c.hint}</div>
          </button>
        ))}
        {loose.length === 0 && <p className="text-base font-semibold text-emerald-700">Every card is in the right bucket. Nice sorting!</p>}
      </div>

      {wrong && (
        <div role="status" className="animate-rise rounded-2xl border-b-4 border-rose-500 bg-slate-900 px-4 py-3 text-base text-slate-100">
          <span className="mr-1 font-bold text-rose-300">Not that bucket:</span> <span className={deva}>{wrong.why}</span>
        </div>
      )}

      <div className={cx("grid gap-3", deck.buckets.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
        {deck.buckets.map((b, bi) => {
          const t = TONES[b.tone];
          const items = deck.cards.filter((c) => placed[c.id] === b.id);
          const odd = deck.buckets.length % 2 === 1 && bi === deck.buckets.length - 1;
          return (
            <div
              key={b.id}
              role="button"
              tabIndex={0}
              aria-label={`${b.en ?? b.title} bucket${picked ? ". Drop the picked card here." : ""}`}
              onClick={() => picked && drop(picked, b.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && picked && (e.preventDefault(), drop(picked, b.id))}
              onDragOver={(e) => {
                e.preventDefault();
                setHot(b.id);
              }}
              onDragLeave={() => setHot(null)}
              onDrop={(e: DragEvent) => {
                e.preventDefault();
                drop(e.dataTransfer.getData("text/plain"), b.id);
              }}
              className={cx(
                "min-h-32 rounded-2xl border-2 border-dashed p-3 transition-all duration-200",
                t.box,
                (hot === b.id || picked) && cx("border-solid ring-4", t.hot),
                picked && "cursor-pointer",
                odd && "sm:col-span-2",
              )}
            >
              <div className={cx("font-display text-lg font-semibold", t.text, deva)}>
                {b.title}
                {b.en && <span className="gloss-en">{b.en}</span>}
              </div>
              <div className={cx("mb-2 text-sm font-semibold text-slate-600", deva)}>{b.sub}</div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((c) => (
                  <span key={c.id} className={cx("animate-pop rounded-xl border-b-4 px-3 py-1 text-base font-semibold text-white", t.chip)}>
                    ✓ <span className={deva}>{c.name}</span> <span className="text-sm font-semibold text-white/85">· {c.hint}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </WidgetPanel>
  );
}
