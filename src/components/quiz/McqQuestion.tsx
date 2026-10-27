import { useEffect, useState } from "react";
import { shuffled } from "../../lib/answer";
import type { McqQuestion as Mcq } from "../../types/content";
import { Accordion, Rich, cx, useLang } from "../ui/primitives";
import { Feedback, WhyBubble } from "./Feedback";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function McqQuestion({
  question,
  onResolved,
  keyboard = false,
  review = false,
}: {
  question: Mcq;
  onResolved?: (r: { firstTry: boolean }) => void;
  /** Number/letter keys pick options. Only one question on screen should have this. */
  keyboard?: boolean;
  /** Show it already solved (for chunks the student passed earlier). */
  review?: boolean;
}) {
  const lang = useLang();
  const [order] = useState(() => {
    const idx = question.options.map((_, i) => i);
    return question.shuffle === false ? idx : shuffled(idx);
  });
  const [tried, setTried] = useState<Set<number>>(() => new Set());
  const [shown, setShown] = useState<number | null>(null); // option whose "why" is open
  const [shaking, setShaking] = useState<number | null>(null);
  const [solved, setSolved] = useState(review);

  const pick = (optIndex: number) => {
    if (solved) return;
    const opt = question.options[optIndex];
    if (opt.correct) {
      setSolved(true);
      setShown(null);
      onResolved?.({ firstTry: tried.size === 0 });
      return;
    }
    if (!tried.has(optIndex)) {
      setTried(new Set(tried).add(optIndex));
      setShaking(optIndex);
    }
    setShown(optIndex);
  };

  useEffect(() => {
    if (!keyboard || solved) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest("input,textarea")) return;
      const k = e.key.toUpperCase();
      const pos = /^[1-9]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k);
      if (pos >= 0 && pos < order.length) {
        e.preventDefault();
        pick(order[pos]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const correctIndex = question.options.findIndex((o) => o.correct);

  return (
    <div className="space-y-4">
      <Rich text={question.prompt} lang={question.lang} className="text-lg font-semibold text-slate-900" />

      {question.hint && !solved && (
        <Accordion title={lang === "ne" ? "सङ्केत चाहियो?" : "Need a hint?"} icon="💡" tone="amber">
          <Rich text={question.hint} lang={question.lang} className="text-slate-700" />
        </Accordion>
      )}

      <ul className="space-y-2.5" role="list">
        {order.map((optIndex, pos) => {
          const opt = question.options[optIndex];
          const isWrong = tried.has(optIndex);
          const isRight = solved && optIndex === correctIndex;
          return (
            <li key={optIndex}>
              <button
                type="button"
                onClick={() => pick(optIndex)}
                aria-disabled={solved}
                aria-describedby={shown === optIndex ? `why-${question.id}-${optIndex}` : undefined}
                onAnimationEnd={() => setShaking(null)}
                className={cx(
                  "flex w-full items-start gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left transition",
                  !solved && !isWrong && "border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:translate-y-px",
                  isWrong && "border-rose-300 bg-rose-50/70 text-slate-500",
                  shaking === optIndex && "animate-shake",
                  isRight && "animate-pop border-emerald-500 bg-emerald-50 text-emerald-900",
                  solved && !isRight && !isWrong && "border-slate-100 text-slate-400",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "grid size-7 shrink-0 place-items-center rounded-lg border text-sm font-bold",
                    isRight ? "border-emerald-500 bg-emerald-500 text-white" : isWrong ? "border-rose-300 bg-rose-100 text-rose-600" : "border-slate-200 text-slate-500",
                  )}
                >
                  {isRight ? "✓" : isWrong ? "✕" : LETTERS[pos]}
                </span>
                <Rich text={opt.text} inline lang={question.lang} className="pt-0.5" />
              </button>
              {shown === optIndex && opt.why && (
                <WhyBubble id={`why-${question.id}-${optIndex}`}>
                  <Rich text={opt.why} lang={question.lang} />
                </WhyBubble>
              )}
            </li>
          );
        })}
      </ul>

      {solved && <Feedback firstTry={tried.size === 0} explanation={question.explanation} review={review} />}
    </div>
  );
}
