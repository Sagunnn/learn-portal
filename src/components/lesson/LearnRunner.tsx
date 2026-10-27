import { useEffect, useMemo, useState } from "react";
import { useProgress } from "../../hooks/useProgress";
import { confetti } from "../../lib/confetti";
import { progress } from "../../lib/progress";
import { splitStory } from "../../lib/story";
import type { Chunk, Lesson } from "../../types/content";
import { Mascot } from "../ui/Coach";
import { Button, ProgressBar, useLang } from "../ui/primitives";
import ChunkView from "./ChunkView";
import { LessonIdContext } from "./LessonContext";

/** Next-presses a chunk takes: one per speech bubble for text, otherwise one. */
const stepsIn = (c: Chunk) => (c.type === "text" ? splitStory(c.body).length : 1);

/**
 * The Learn path as a Duolingo-style wizard: ONE activity card on stage at a
 * time, a progress bar on top and big Back / Next buttons at the bottom.
 * A "check" card keeps Next locked until it's answered. The furthest card is
 * saved, so a reload resumes there; a finished lesson opens on its trophy card.
 */
export default function LearnRunner({ lesson, onCards, onQuiz }: { lesson: Lesson; onCards?: () => void; onQuiz?: () => void }) {
  const ne = useLang() === "ne";
  const { id } = lesson.meta;
  const last = lesson.chunks.length - 1;
  const saved = useProgress().lessons[id];
  const steps = useMemo(() => lesson.chunks.map(stepsIn), [lesson]);
  const totalSteps = steps.reduce((a, b) => a + b, 0);

  const [init] = useState(() => {
    const done = !!saved?.completedAt && (saved.learnIndex ?? 0) >= last;
    const start = done ? 0 : Math.min(saved?.learnIndex ?? 0, last);
    // Checks before this point were answered on an earlier visit (all of them if finished).
    return { done, start, answeredBefore: done ? last + 1 : start };
  });
  const [index, setIndex] = useState(init.start);
  const [seg, setSeg] = useState(init.start > 0 ? steps[init.start] - 1 : 0);
  const [furthest, setFurthest] = useState(init.start);
  const [answeredBefore, setAnsweredBefore] = useState(init.answeredBefore);
  const [answered, setAnswered] = useState<Set<number>>(() => new Set());
  const [finished, setFinished] = useState<{ xp: number } | null>(() => (init.done ? { xp: 0 } : null));

  const chunk = lesson.chunks[index];
  const isAnswered = (i: number) => lesson.chunks[i].type !== "check" || answered.has(i) || i < answeredBefore;
  const locked = !isAnswered(index);
  const moreBubbles = seg < steps[index] - 1;
  const atStart = index === 0 && seg === 0;
  const stepNow = steps.slice(0, index).reduce((a, b) => a + b, 0) + seg + 1;
  const isLast = index === last && !moreBubbles;

  const top = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const next = () => {
    if (locked || finished) return;
    if (moreBubbles) return setSeg(seg + 1);
    if (index < last) {
      const n = index + 1;
      setIndex(n);
      setSeg(0);
      if (n > furthest) {
        setFurthest(n);
        progress.setLearnIndex(id, n);
      }
      top();
      return;
    }
    setFinished({ xp: progress.completeLesson(id) });
    confetti(innerWidth / 2, innerHeight * 0.55, 2);
    top();
  };

  const back = () => {
    if (finished) return;
    if (seg > 0) return setSeg(seg - 1);
    if (index > 0) {
      setIndex(index - 1);
      setSeg(steps[index - 1] - 1);
      top();
    }
  };

  const review = () => {
    setFinished(null);
    setAnsweredBefore(last + 1);
    setIndex(0);
    setSeg(0);
    top();
  };

  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,button,a,select,[role=button]")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (finished) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="animate-pop rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-cozy sm:p-10">
          <Mascot size={96} mood="cheer" className="mx-auto" />
          <h2 className="mt-4 text-3xl font-semibold text-slate-800">{ne ? "पाठ पूरा भयो!" : "Lesson complete!"}</h2>
          <p className="mt-2 text-lg text-slate-600">{ne ? "अब फ्ल्यासकार्ड वा क्विज?" : "Lock it in with flashcards or the quiz."}</p>
          {finished.xp > 0 && (
            <p className="mt-5 inline-block rounded-2xl bg-amber-100 px-5 py-2 font-display text-xl font-semibold text-amber-900">⚡ +{finished.xp} XP</p>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {onQuiz && <Button onClick={onQuiz}>{ne ? "क्विज खेल्नुहोस्" : "Take the quiz"} ➔</Button>}
            {onCards && (
              <Button variant="secondary" onClick={onCards}>
                🃏 {ne ? "फ्ल्यासकार्ड" : "Flashcards"}
              </Button>
            )}
            <Button variant="secondary" onClick={review}>
              ↺ {ne ? "फेरि हेर्नुहोस्" : "Review the lesson"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hint = locked
    ? ne ? "अगाडि बढ्न प्रश्नको उत्तर दिनुहोस्।" : "Answer to unlock Next."
    : chunk.type === "interactive"
      ? ne ? "चलाएर हेर्नुभयो?" : "Played with it? Then go on!"
      : chunk.type === "practice"
        ? ne ? "आफैँ हल गर्नुभयो?" : "Tried it yourself?"
        : "";

  return (
    <LessonIdContext.Provider value={id}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center gap-3">
          <ProgressBar
            value={stepNow}
            max={totalSteps}
            barClass="bg-gradient-to-r from-emerald-400 to-sky-600"
            className="h-4"
            label="Lesson progress"
          />
          <span className="shrink-0 font-display text-base font-semibold tabular-nums text-slate-500">
            {stepNow}/{totalSteps}
          </span>
        </div>

        {/* the stage: one activity at a time */}
        <section key={index} className="animate-rise rounded-3xl border border-slate-200 bg-white p-5 shadow-cozy sm:p-8">
          <ChunkView
            chunk={chunk}
            reveal={seg + 1}
            review={chunk.type === "check" && index < answeredBefore}
            onResolved={({ firstTry }) => {
              setAnswered((a) => new Set(a).add(index));
              progress.checkAnswered(firstTry);
            }}
          />
        </section>

        {/* Duolingo-style stepper bar */}
        <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-slate-200 bg-white/95 px-4 pb-4 pt-3 shadow-[0_-4px_24px_rgb(15_23_42/0.06)] backdrop-blur sm:mx-0 sm:rounded-t-3xl sm:border-x sm:px-5">
          {hint && (
            <p className="mb-2 text-center text-base font-semibold text-slate-500" aria-live="polite">
              {hint}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="lg" onClick={back} disabled={atStart} className="shrink-0" aria-label="Back">
              ⬅ <span className="hidden sm:inline">{ne ? "पछाडि" : "Back"}</span>
            </Button>
            <Button size="lg" variant={isLast ? "success" : "primary"} disabled={locked} onClick={next} className="flex-1">
              {isLast ? (ne ? "पाठ सक्नुहोस् 🎉" : "Finish 🎉") : moreBubbles ? (ne ? "अगाडि ➔" : "Next ➔") : ne ? "अर्को गतिविधि ➔" : "Next Activity ➔"}
            </Button>
          </div>
        </div>
      </div>
    </LessonIdContext.Provider>
  );
}
