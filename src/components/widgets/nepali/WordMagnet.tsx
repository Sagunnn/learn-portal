import { useState } from "react";
import { confettiAt } from "../../../lib/confetti";
import { Rich, cx } from "../../ui/primitives";
import { WidgetPanel, useReportState, type WidgetState } from "../controls";

/**
 * "Word Magnet Builder" (उपसर्ग र प्रत्यय). Tap a root word (मूल शब्द), then tap a
 * prefix or suffix tile to snap it on. Real words click together with their
 * English meaning; spelling changes (समाज + इक → सामाजिक) are highlighted.
 * Every word and tile carries an English helper.
 */
type Tile = { t: string; en: string };
type Made = { root: string; affix: string; word: string; display: string; en: string; morph?: string };

const PREFIXES: Tile[] = [
  { t: "प्र", en: "forward, more" },
  { t: "अप", en: "bad, opposite" },
  { t: "अनु", en: "after, following" },
  { t: "अधि", en: "over, above" },
  { t: "सु", en: "good" },
  { t: "बे", en: "without" },
  { t: "गैर", en: "non-, not" },
];
const PREFIX_ROOTS: Tile[] = [
  { t: "हार", en: "defeat / necklace" },
  { t: "गति", en: "speed" },
  { t: "मान", en: "respect" },
  { t: "यश", en: "fame" },
  { t: "शासन", en: "rule" },
  { t: "मार्ग", en: "path" },
  { t: "पुत्र", en: "son" },
  { t: "इमान", en: "honesty" },
  { t: "होस", en: "senses" },
  { t: "कार", en: "work" },
  { t: "कानुनी", en: "legal" },
  { t: "सरकारी", en: "governmental" },
];
const PREFIX_WORDS: Made[] = [
  { affix: "प्र", root: "हार", word: "प्रहार", display: "==प्र==हार", en: "attack, strike" },
  { affix: "प्र", root: "गति", word: "प्रगति", display: "==प्र==गति", en: "progress" },
  { affix: "अप", root: "मान", word: "अपमान", display: "==अप==मान", en: "insult" },
  { affix: "अप", root: "यश", word: "अपयश", display: "==अप==यश", en: "disgrace" },
  { affix: "अनु", root: "शासन", word: "अनुशासन", display: "==अनु==शासन", en: "discipline" },
  { affix: "अनु", root: "मान", word: "अनुमान", display: "==अनु==मान", en: "guess" },
  { affix: "अधि", root: "कार", word: "अधिकार", display: "==अधि==कार", en: "right, authority" },
  { affix: "सु", root: "मार्ग", word: "सुमार्ग", display: "==सु==मार्ग", en: "good path" },
  { affix: "सु", root: "पुत्र", word: "सुपुत्र", display: "==सु==पुत्र", en: "good son" },
  { affix: "बे", root: "इमान", word: "बेइमान", display: "==बे==इमान", en: "dishonest" },
  { affix: "बे", root: "होस", word: "बेहोस", display: "==बे==होस", en: "unconscious" },
  { affix: "बे", root: "कार", word: "बेकार", display: "==बे==कार", en: "useless" },
  { affix: "गैर", root: "कानुनी", word: "गैरकानुनी", display: "==गैर==कानुनी", en: "illegal" },
  { affix: "गैर", root: "सरकारी", word: "गैरसरकारी", display: "==गैर==सरकारी", en: "non-governmental" },
];

const SUFFIXES: Tile[] = [
  { t: "ई", en: "having, of" },
  { t: "इक", en: "related to" },
  { t: "आलु", en: "full of" },
  { t: "वान्", en: "having" },
  { t: "मान्", en: "having" },
  { t: "ता", en: "-ness" },
];
const SUFFIX_ROOTS: Tile[] = [
  { t: "समाज", en: "society" },
  { t: "धर्म", en: "religion" },
  { t: "इतिहास", en: "history" },
  { t: "विज्ञान", en: "science" },
  { t: "दया", en: "kindness" },
  { t: "झगडा", en: "quarrel" },
  { t: "धन", en: "wealth" },
  { t: "बल", en: "strength" },
  { t: "बुद्धि", en: "intelligence" },
  { t: "शक्ति", en: "power" },
  { t: "सुन्दर", en: "beautiful" },
  { t: "मानव", en: "human" },
  { t: "नेपाल", en: "Nepal" },
  { t: "पहाड", en: "hill" },
];
const SUFFIX_WORDS: Made[] = [
  { root: "समाज", affix: "इक", word: "सामाजिक", display: "==सा==माजिक", en: "social", morph: "स → सा" },
  { root: "धर्म", affix: "इक", word: "धार्मिक", display: "==धा==र्मिक", en: "religious", morph: "ध → धा" },
  { root: "इतिहास", affix: "इक", word: "ऐतिहासिक", display: "==ऐ==तिहासिक", en: "historical", morph: "इ → ऐ" },
  { root: "विज्ञान", affix: "इक", word: "वैज्ञानिक", display: "==वै==ज्ञानिक", en: "scientific", morph: "वि → वै" },
  { root: "दया", affix: "आलु", word: "दयालु", display: "दया==लु==", en: "kind-hearted" },
  { root: "झगडा", affix: "आलु", word: "झगडालु", display: "झगडा==लु==", en: "quarrelsome" },
  { root: "धन", affix: "वान्", word: "धनवान्", display: "धन==वान्==", en: "wealthy" },
  { root: "बल", affix: "वान्", word: "बलवान्", display: "बल==वान्==", en: "strong" },
  { root: "बुद्धि", affix: "मान्", word: "बुद्धिमान्", display: "बुद्धि==मान्==", en: "intelligent" },
  { root: "शक्ति", affix: "मान्", word: "शक्तिमान्", display: "शक्ति==मान्==", en: "powerful" },
  { root: "सुन्दर", affix: "ता", word: "सुन्दरता", display: "सुन्दर==ता==", en: "beauty" },
  { root: "मानव", affix: "ता", word: "मानवता", display: "मानव==ता==", en: "humanity" },
  { root: "धन", affix: "ई", word: "धनी", display: "ध==नी==", en: "rich" },
  { root: "नेपाल", affix: "ई", word: "नेपाली", display: "नेपा==ली==", en: "Nepali" },
  { root: "पहाड", affix: "ई", word: "पहाडी", display: "पहा==डी==", en: "of the hills" },
];

type Mode = "prefix" | "suffix";

export default function WordMagnet({ onState }: { onState?: (s: WidgetState) => void }) {
  const [mode, setMode] = useState<Mode>("prefix");
  const [root, setRoot] = useState<string | null>(null);
  const [affix, setAffix] = useState<string | null>(null);
  const [result, setResult] = useState<{ made: Made | null; key: number } | null>(null);
  const [found, setFound] = useState<Record<string, Made & { mode: Mode }>>({});

  const list = Object.values(found);
  const prefixFound = list.filter((m) => m.mode === "prefix").length;
  const suffixFound = list.filter((m) => m.mode === "suffix").length;
  const morph = list.some((m) => m.morph) ? 1 : 0;
  useReportState({ prefixFound, suffixFound, found: list.length, morph }, onState);

  const roots = mode === "prefix" ? PREFIX_ROOTS : SUFFIX_ROOTS;
  const tiles = mode === "prefix" ? PREFIXES : SUFFIXES;
  const words = mode === "prefix" ? PREFIX_WORDS : SUFFIX_WORDS;
  const rootTile = roots.find((r) => r.t === root);
  const affixTile = tiles.find((a) => a.t === affix);

  const tryBuild = (r: string | null, a: string | null, el?: HTMLElement | null) => {
    if (!r || !a) return setResult(null);
    const made = words.find((w) => w.root === r && w.affix === a) ?? null;
    setResult({ made, key: Date.now() });
    if (made && !found[made.word]) {
      setFound((f) => ({ ...f, [made.word]: { ...made, mode } }));
      confettiAt(el, 0.6);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setRoot(null);
    setAffix(null);
    setResult(null);
  };

  const slot = (tile: Tile | undefined, kind: "affix" | "root", placeholder: string) => (
    <div
      className={cx(
        "flex min-h-[92px] min-w-[96px] flex-col items-center justify-center rounded-2xl border-2 px-3 py-2 transition-all duration-300",
        tile
          ? kind === "affix"
            ? "border-b-4 border-rose-500 bg-rose-100"
            : "border-b-4 border-slate-400 bg-white"
          : "border-dashed border-slate-300 bg-slate-50 text-slate-400",
        result?.made && "magnet-snap",
      )}
    >
      {tile ? (
        <>
          <span className="lang-ne font-display text-3xl font-semibold text-slate-900">{tile.t}</span>
          <span className="gloss-en !ml-0 mt-1">{tile.en}</span>
        </>
      ) : (
        <span className="text-center text-sm font-semibold">{placeholder}</span>
      )}
    </div>
  );

  return (
    <WidgetPanel>
      <div className="grid grid-cols-2 gap-2">
        {(["prefix", "suffix"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => switchMode(m)}
            className={cx(
              "min-h-[60px] rounded-2xl border-2 border-b-4 px-3 py-2 font-display transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2",
              mode === m ? "border-indigo-700 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            <span className="lang-ne text-xl font-semibold">{m === "prefix" ? "उपसर्ग" : "प्रत्यय"}</span>
            <span className={cx("ml-2 text-sm font-bold", mode === m ? "text-indigo-100" : "text-slate-400")}>{m === "prefix" ? "prefix: goes in front" : "suffix: goes at the end"}</span>
          </button>
        ))}
      </div>

      {/* the magnet board */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {mode === "prefix" ? slot(affixTile, "affix", "उपसर्ग") : slot(rootTile, "root", "मूल शब्द")}
          <span className="font-display text-3xl font-semibold text-slate-400">+</span>
          {mode === "prefix" ? slot(rootTile, "root", "मूल शब्द") : slot(affixTile, "affix", "प्रत्यय")}
          <span className="font-display text-3xl font-semibold text-slate-400">=</span>
          <div
            key={result?.key ?? "empty"}
            className={cx(
              "flex min-h-[92px] min-w-[150px] flex-col items-center justify-center rounded-2xl border-2 px-4 py-2",
              result?.made ? "animate-pop border-b-4 border-emerald-600 bg-emerald-50" : result ? "animate-shake border-rose-300 bg-rose-50" : "border-dashed border-slate-300 bg-slate-50",
            )}
          >
            {result?.made ? (
              <>
                <Rich text={result.made.display} inline className="lang-ne font-display text-3xl font-semibold text-emerald-900 [&_mark]:bg-amber-200" />
                <span className="gloss-en !ml-0 mt-1 !bg-emerald-100 !text-emerald-800">{result.made.en}</span>
                {result.made.morph && (
                  <span className="mt-1 rounded-full bg-amber-100 px-2 text-sm font-bold text-amber-800">
                    spelling change: <span className="lang-ne">{result.made.morph}</span>
                  </span>
                )}
              </>
            ) : result ? (
              <span className="text-center text-base font-semibold text-rose-700">That's not a word we know. Try another tile!</span>
            ) : (
              <span className="text-center text-sm font-semibold text-slate-400">new word</span>
            )}
          </div>
        </div>
      </div>

      {/* step 1: root words; step 2: tiles */}
      <div>
        <div className="mb-2 font-display text-base font-semibold text-slate-700">
          1 · Tap a <span className="lang-ne">मूल शब्द</span>
          <span className="gloss-en">root word</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {roots.map((r, i) => (
            <button
              key={r.t}
              type="button"
              aria-pressed={root === r.t}
              {...(i === 0 ? { "data-start": true } : {})}
              onClick={(e) => {
                setRoot(r.t);
                tryBuild(r.t, affix, e.currentTarget);
              }}
              className={cx(
                "flex min-h-[56px] flex-col items-center justify-center rounded-2xl border-2 border-b-4 px-3 py-1 transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2",
                root === r.t ? "border-slate-700 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
              )}
            >
              <span className="lang-ne text-xl font-semibold leading-tight">{r.t}</span>
              <span className={cx("text-xs font-bold", root === r.t ? "text-slate-300" : "text-slate-400")}>{r.en}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 font-display text-base font-semibold text-slate-700">
          2 · Snap on a{mode === "prefix" ? "n " : " "}
          <span className="lang-ne">{mode === "prefix" ? "उपसर्ग" : "प्रत्यय"}</span>
          <span className="gloss-en">{mode === "prefix" ? "prefix" : "suffix"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {tiles.map((a) => (
            <button
              key={a.t}
              type="button"
              aria-pressed={affix === a.t}
              onClick={(e) => {
                setAffix(a.t);
                tryBuild(root, a.t, e.currentTarget);
              }}
              className={cx(
                "flex min-h-[64px] min-w-[72px] flex-col items-center justify-center rounded-2xl border-2 border-b-4 px-3 py-1 transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2",
                affix === a.t ? "border-rose-700 bg-rose-500 text-white" : "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100",
              )}
            >
              <span className="lang-ne text-2xl font-semibold leading-tight">{a.t}</span>
              <span className={cx("text-xs font-bold", affix === a.t ? "text-rose-100" : "text-rose-400")}>{a.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* collection */}
      {list.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="mb-2 font-display text-base font-semibold text-emerald-800">Words you built · {list.length}</div>
          <div className="flex flex-wrap gap-2">
            {list.map((m) => (
              <span key={m.word} className="rounded-xl bg-white px-3 py-1 shadow-sm">
                <span className="lang-ne text-lg font-semibold text-slate-900">{m.word}</span>
                <span className="gloss-en">{m.en}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </WidgetPanel>
  );
}
