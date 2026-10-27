import { useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "../../hooks/useProgress";
import { confetti } from "../../lib/confetti";
import { progress } from "../../lib/progress";
import { splitStory } from "../../lib/story";
import type { Chunk, Lesson } from "../../types/content";
import { Mascot } from "../ui/Coach";
import { Button, Card, ProgressBar, useLang } from "../ui/primitives";
import ChunkView from "./ChunkView";
import { LessonIdContext } from "./LessonContext";

/** How many Continue presses a chunk takes: one per speech bubble for text, otherwise one. */
const stepsIn = (c: Chunk) => (c.type === "text" ? splitStory(c.body).length : 1);

/**
 * The chunked Learn path. Continue reveals the next speech bubble, or the next
 * chunk once the current one is fully shown. A "check" chunk locks Continue
 * until answered. The chunk position is saved; finished lessons reopen fully
 * revealed for review.
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
  const steps = useMemo(() => lesson.chunks.map(stepsIn), [lesson]);
  const totalSteps = steps.reduce((a, b) => a + b, 0);

  const [init] = useState(() => {
    const done = !!saved?.completedAt && (saved.learnIndex ?? 0) >= last;
    const start = done ? last : Math.min(saved?.learnIndex ?? 0, last);
    return { done, start, resumedAt: done ? last + 1 : start };
  });
  const [revealed, setRevealed] = useState(init.start);
  // Bubbles shown in the current chunk; on resume the whole chunk is shown.
  const [seg, setSeg] = useState(init.start > 0 || init.done ? steps[init.start] - 1 : 0);
  const [resumedAt, setResumedAt] = useState(init.resumedAt);
  const [answered, setAnswered] = useState<Set<number>>(() => new Set());
  const [finished, setFinished] = useState<{ xp: number; returning: boolean } | null>(() =>
    init.done ? { xp: 0, returning: true } : null,
  );
  const chunkRefs = useRef<(HTMLElement | null)[]>([]);
  const doneRef = useRef<HTMLDivElement>(null);
  const scrollMode = useRef<"start" | "end" | null>(init.start > 0 && !init.done ? "start" : null);

  const current = lesson.chunks[revealed];
  const isAnswered = (i: number) => lesson.chunks[i].type !== "check" || answered.has(i) || i < resumedAt;
  const locked = !isAnswered(revealed);
  const stepNow = steps.slice(0, revealed).reduce((a, b) => a + b, 0) + seg + 1;
  const moreBubbles = seg < steps[revealed] - 1;

  const advance = () => {
    if (locked || finished) return;
    if (moreBubbles) {
      scrollMode.current = "end";
      setSeg(seg + 1);
    } else if (revealed < last) {
      scrollMode.current = "start";
      setRevealed(revealed + 1);
      setSeg(0);
      progress.setLearnIndex(id, revealed + 1);
    } else {
      setFinished({ xp: progress.completeLesson(id), returning: false });
      confetti(innerWidth / 2, innerHeight * 0.6, 2);
    }
  };

  const restart = () => {
    progress.setLearnIndex(id, 0);
    scrollMode.current = null;
    setAnswered(new Set());
    setResumedAt(0);
    setRevealed(0);
    setSeg(0);
    setFinished(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const mode = scrollMode.current;
    if (!mode) return;
    chunkRefs.current[revealed]?.scrollIntoView({ behavior: "smooth", block: mode === "start" ? "start" : "nearest" });
  }, [revealed, seg]);

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

  const prompt = locked
    ? ne ? "अगाडि बढ्न माथिको प्रश्नको उत्तर दिनुहोस्।" : "Answer the question to unlock Continue."
    : moreBubbles
      ? ne ? "अझै छ…" : "There's more…"
      : current.type === "practice"
        ? ne ? "आफैँ हल गरेर हेर्नुभयो?" : "Tried it yourself?"
        : current.type === "interactive"
          ? ne ? "चलाएर हेर्नुभयो?" : "Played with it? Then continue."
          : ne ? "तयार हुनुहुन्छ?" : "Ready? Press Enter or tap Continue.";

  return (
    <LessonIdContext.Provider value={id}>
      <div className="mx-auto max-w-2xl">
        {finished?.returning ? (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-b-4 border-emerald-300 bg-emerald-50 px-4 py-3">
            <span className="font-bold text-emerald-800">✓ {ne ? "यो पाठ सकिएको छ। तल दोहोर्‍याउनुहोस्।" : "Chapter finished. Review it below."}</span>
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
            <ProgressBar value={stepNow} max={totalSteps} barClass="bg-indigo-500" className="h-3.5" label="Lesson progress" />
            <span className="shrink-0 text-sm font-extrabold tabular-nums text-slate-500">
              {stepNow}/{totalSteps}
            </span>
            {(revealed > 0 || seg > 0) && (
              <button type="button" onClick={restart} className="shrink-0 text-sm font-bold text-slate-400 hover:text-slate-700">
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
                "scroll-mt-24 " +
                (chunk.type === "text" ? "" : "rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-5 sm:p-6") +
                (i === revealed && !finished && seg === 0 ? " animate-rise" : "")
              }
            >
              <ChunkView
                chunk={chunk}
                reveal={i === revealed && !finished ? seg + 1 : undefined}
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
              <Mascot size={72} mood="cheer" className="mx-auto" />
              <h2 className="mt-3 text-2xl font-extrabold text-slate-900">{ne ? "पाठ पूरा भयो!" : "Lesson complete!"}</h2>
              <p className="mt-1 text-slate-600">{ne ? "अब फ्ल्यासकार्ड वा क्विज?" : "Lock it in: flashcards or the quiz?"}</p>
              {finished.xp > 0 && (
                <p className="mt-4 inline-block rounded-2xl border-2 border-b-4 border-amber-300 bg-amber-100 px-4 py-1.5 font-extrabold text-amber-800">
                  ⚡ +{finished.xp} XP
                </p>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {onQuiz && <Button onClick={onQuiz}>{ne ? "क्विज खेल्नुहोस्" : "Take the quiz"} →</Button>}
                {onCards && (
                  <Button variant="secondary" onClick={onCards}>
                    {ne ? "फ्ल्यासकार्ड" : "Flashcards"}
                  </Button>
                )}
                <Button variant="ghost" onClick={restart}>
                  {ne ? "सुरुबाट फेरि" : "Start over"}
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="sticky bottom-0 z-10 -mx-4 mt-6 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent px-4 pb-4 pt-8 sm:mx-0 sm:px-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500" aria-live="polite">
                {prompt}
              </p>
              <Button
                size="lg"
                variant={revealed === last && !moreBubbles ? "success" : "primary"}
                disabled={locked}
                onClick={advance}
                className="min-w-40 shrink-0"
              >
                {revealed === last && !moreBubbles ? (ne ? "पाठ सक्नुहोस्" : "Finish") : ne ? "अगाडि बढौँ" : "Continue"} →
              </Button>
            </div>
          </div>
        )}
      </div>
    </LessonIdContext.Provider>
  );
}
