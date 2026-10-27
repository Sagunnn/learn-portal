import { useRef, useState, type FormEvent } from "react";
import { checkFill } from "../../lib/answer";
import { toText } from "../../lib/richText";
import type { FillQuestion as Fill, RichText } from "../../types/content";
import { Accordion, Button, Rich, cx, langProps, useLang } from "../ui/primitives";
import { Feedback, WhyBubble } from "./Feedback";
import HintLadder from "./HintLadder";
import { parseFraction, fracTex } from "../../lib/fraction";
import { Tex } from "../widgets/controls";

const DEVANAGARI = /[ऀ-ॿ]/;
const LATIN = /[a-z]/i;

export default function FillQuestion({
  question,
  onResolved,
  review = false,
}: {
  question: Fill;
  onResolved?: (r: { firstTry: boolean }) => void;
  keyboard?: boolean;
  review?: boolean;
}) {
  const inherited = useLang();
  const lang = question.lang ?? inherited;
  const ne = lang === "ne";
  const [value, setValue] = useState(review ? question.answers[0] : "");
  const [wrongCount, setWrongCount] = useState(0);
  const [wrong, setWrong] = useState<{ why?: RichText } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [solved, setSolved] = useState(review);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [before, after] = (() => {
    const text = toText(question.prompt);
    const i = text.indexOf("___");
    return i < 0 ? [text, null] : [text.slice(0, i), text.slice(i + 3)];
  })();

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (solved || !value.trim()) return;
    const result = checkFill(question, value);
    if (result.correct) {
      setSolved(true);
      setWrong(null);
      onResolved?.({ firstTry: wrongCount === 0 });
    } else {
      setWrongCount((n) => n + 1);
      setWrong({ why: result.why });
      setShaking(true);
      inputRef.current?.select();
    }
  };

  const reveal = () => {
    setValue(question.answers[0]);
    setSolved(true);
    setRevealed(true);
    setWrong(null);
    onResolved?.({ firstTry: false });
  };

  const isFraction = question.match === "fraction";
  const parsed = isFraction ? parseFraction(value) : null;
  const typed = parsed
    ? parsed.form === "mixed"
      ? fracTex(parsed.num, parsed.den, { mixed: true })
      : fracTex(parsed.num, parsed.den)
    : null;

  const mixedScripts = question.answers.some((a) => DEVANAGARI.test(a)) && question.answers.some((a) => LATIN.test(a));
  const lp = langProps(lang);

  const input = (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onAnimationEnd={() => setShaking(false)}
      disabled={solved}
      inputMode={question.match === "number" ? "decimal" : "text"}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      placeholder={question.placeholder ?? (isFraction ? "e.g. 3/4" : ne ? "उत्तर" : "answer")}
      aria-label={ne ? "उत्तर लेख्नुहोस्" : "Your answer"}
      className={cx(
        "mx-1 inline-block w-40 rounded-lg border-2 px-3 py-1 align-baseline font-semibold outline-none transition sm:w-48",
        lp.className,
        solved
          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
          : wrong
            ? cx("border-rose-400 bg-rose-50 text-rose-800", shaking && "animate-shake")
            : "border-slate-300 bg-white focus:border-indigo-500",
      )}
    />
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-lg font-semibold leading-loose text-slate-900">
        {after === null ? (
          <>
            <Rich text={before} lang={lang} />
            <div className="mt-3">{input}</div>
          </>
        ) : (
          <span lang={lp.lang} className={lp.className}>
            <Rich text={before} inline lang={lang} />
            {input}
            <Rich text={after} inline lang={lang} />
          </span>
        )}
      </div>

      {isFraction && !solved && (
        <p className="min-h-8 text-sm text-slate-500" aria-live="polite">
          {typed ? (
            <>
              You typed: <Tex tex={typed} className="text-base text-slate-900" />
            </>
          ) : value.trim() ? (
            "Write it like 5/6, or 2 3/4 for a mixed number."
          ) : (
            "Type a fraction with /, like 5/6. For a mixed number leave a space: 2 3/4."
          )}
        </p>
      )}

      {mixedScripts && !solved && (
        <p className="text-sm text-slate-500">
          {ne ? "नेपाली युनिकोड वा रोमन (English) अक्षरमा लेख्न सकिन्छ।" : "You can type in Nepali (Unicode) or Roman letters."}
        </p>
      )}

      {question.hint && !solved && (
        <Accordion title={ne ? "सङ्केत चाहियो?" : "Need a hint?"} icon="💡" tone="amber">
          <Rich text={question.hint} lang={lang} className="text-slate-700" />
        </Accordion>
      )}
      {question.hints && !solved && <HintLadder hints={question.hints} lang={lang} />}

      {wrong && (
        <WhyBubble title={wrong.why ? undefined : ne ? "अझै मिलेन" : "Not quite"}>
          {wrong.why ? (
            <Rich text={wrong.why} lang={lang} />
          ) : (
            <p>{ne ? "फेरि एकपटक जाँच गरेर प्रयास गर्नुहोस्।" : "Check your working and try again."}</p>
          )}
        </WhyBubble>
      )}

      {!solved && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!value.trim()}>
            {ne ? "जाँच गर्नुहोस्" : "Check"}
          </Button>
          {wrongCount >= 2 && (
            <Button variant="ghost" onClick={reveal}>
              {ne ? "उत्तर हेर्नुहोस्" : "Show answer"}
            </Button>
          )}
        </div>
      )}

      {solved && <Feedback firstTry={wrongCount === 0} explanation={question.explanation} review={review} revealed={revealed} />}
    </form>
  );
}
