import { useEffect, useRef, useState } from "react";
import { useProgress } from "../../hooks/useProgress";
import { progress } from "../../lib/progress";
import type { Lesson } from "../../types/content";
import { Button, Card, ProgressBar, useLang } from "../ui/primitives";
import ChunkView from "./ChunkView";

/**
 * The chunked Learn path. One chunk is revealed per "Continue"; earlier chunks
 * stay on screen so the student can glance back. A "check" chunk locks
 * Continue until it's answered. Position is saved, so a reload resumes, and a
 * finished lesson reopens fully revealed for review.
 */
export default function LearnRunner({
  lesson,
  onCards,
  onQuiz,
}: {
  lesson: Lesson;
  onCards?: () => void;
  onQuiz?: () => void;
}) {
  const ne = useLang() === "ne";
  const { id } = lesson.meta;
  const last = lesson.chunks.length - 1;
  const saved = useProgress().lessons[id];

  const [init] = useState(() => {
    const done = !!saved?.completedAt && (saved.learnIndex ?? 0) >= last;
    const start = done ? last : Math.min(saved?.learnIndex ?? 0, last);
    // Check chunks before this index were answered on an earlier visit.
    return { done, start, resumedAt: done ? last + 1 : start };
  });
  const [revealed, setRevealed] = useState(init.start);
  const [resumedAt, setResumedAt] = useState(init.resumedAt);
  const [answered, setAnswered] = useState<Set<number>>(() => new Set());
  const [finished, setFinished] = useState<{ xp: number; returning: boolean } | null>(() =>
    init.done ? { xp: 0, returning: true } : null,
  );
  const chunkRefs = useRef<(HTMLElement | null)[]>([]);
  const doneRef = useRef<HTMLDivElement>(null);
  // Scroll to the current step when resuming mid-lesson, and after each Continue.
  const shouldScroll = useRef(init.start > 0 && !init.done);

  const current = lesson.chunks[revealed];
  const isAnswered = (i: number) => lesson.chunks[i].type !== "check" || answered.has(i) || i < resumedAt;
  const locked = !isAnswered(revealed);

  const advance = () => {
    if (locked || finished) return;
    if (revealed < last) {
      shouldScroll.current = true;
      setRevealed(revealed + 1);
      progress.setLearnIndex(id, revealed + 1);
    } else {
      setFinished({ xp: progress.completeLesson(id), returning: false });
    }
  };

  const restart = () => {
    progress.setLearnIndex(id, 0);
    shouldScroll.current = false;
    setAnswered(new Set());
    setResumedAt(0);
    setRevealed(0);
    setFinished(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!shouldScroll.current) return;
    chunkRefs.current[revealed]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [revealed]);

  useEffect(() => {
    if (finished && !finished.returning) doneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [finished]);

  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || (e.target as HTMLElement)?.closest("input,textarea,button,a,summary,select")) return;
      e.preventDefault();
      advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const nextSteps = (
    <div className="flex flex-wrap justify-center gap-2">
      {onQuiz && <Button onClick={onQuiz}>{ne ? "क्विज खेल्नुहोस्" : "Take the quiz"} →</Button>}
      {onCards && (
        <Button variant="secondary" onClick={onCards}>
          {ne ? "फ्ल्यासकार्ड" : "Flashcards"}
        </Button>
      )}
      <Button variant="ghost" onClick={restart}>
        {ne ? "सुरुबाट फेरि पढ्नुहोस्" : "Start over"}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      {finished?.returning ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="font-semibold text-emerald-800">
            ✓ {ne ? "यो पाठ सकिएको छ। तल दोहोर्‍याउनुहोस्।" : "You've finished this chapter. Review it below."}
          </span>
          <span className="ml-auto flex gap-2">
            {onQuiz && (
              <Button size="sm" onClick={onQuiz}>
                {ne ? "क्विज" : "Quiz"} →
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={restart}>
              {ne ? "सुरुबाट" : "Start over"}
            </Button>
          </span>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-3">
          <ProgressBar value={revealed + 1} max={last + 1} barClass="bg-indigo-500" label="Lesson progress" />
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-500">
            {revealed + 1}/{last + 1}
          </span>
          {revealed > 0 && (
            <button type="button" onClick={restart} className="shrink-0 text-sm font-semibold text-slate-400 hover:text-slate-700">
              {ne ? "सुरुबाट" : "Restart"}
            </button>
          )}
        </div>
      )}

      <ol className="space-y-4">
        {lesson.chunks.slice(0, revealed + 1).map((chunk, i) => (
          <li
            key={i}
            ref={(el) => {
              chunkRefs.current[i] = el;
            }}
            className={
              "scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" +
              (i === revealed && !finished ? " animate-rise" : "")
            }
          >
            <ChunkView
              chunk={chunk}
              review={chunk.type === "check" && i < resumedAt}
              onResolved={({ firstTry }) => {
                setAnswered((a) => new Set(a).add(i));
                progress.checkAnswered(firstTry);
              }}
            />
          </li>
        ))}
      </ol>

      {finished ? (
        <div ref={doneRef} className="mt-6">
          <Card className="animate-pop p-8 text-center">
            <div className="text-5xl" aria-hidden>
              🎉
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{ne ? "पाठ पूरा भयो!" : "Lesson complete!"}</h2>
            <p className="mt-2 text-slate-600">
              {ne ? "अब फ्ल्यासकार्डले दोहोर्‍याउनुहोस् वा क्विजमा आफूलाई जाँच्नुहोस्।" : "Lock it in with flashcards, or test yourself with the quiz."}
            </p>
            {finished.xp > 0 && (
              <p className="mt-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">+{finished.xp} XP</p>
            )}
            <div className="mt-6">{nextSteps}</div>
          </Card>
        </div>
      ) : (
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent px-4 pb-4 pt-8 sm:mx-0 sm:px-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500" aria-live="polite">
              {locked
                ? ne ? "अगाडि बढ्न माथिको प्रश्नको उत्तर दिनुहोस्।" : "Answer the question to continue."
                : current.type === "practice"
                  ? ne ? "आफैँ हल गरेर हेर्नुभयो?" : "Tried it yourself?"
                  : current.type === "interactive"
                    ? ne ? "चलाएर हेर्नुभयो? अनि अगाडि बढ्नुहोस्।" : "Played with it? Then continue."
                    : ne ? "तयार हुनुहुन्छ?" : "Press Enter or tap Continue"}
            </p>
            <Button size="lg" variant={revealed === last ? "success" : "primary"} disabled={locked} onClick={advance} className="min-w-40 shrink-0">
              {revealed === last ? (ne ? "पाठ सक्नुहोस्" : "Finish lesson") : ne ? "अगाडि बढौँ" : "Continue"} →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
