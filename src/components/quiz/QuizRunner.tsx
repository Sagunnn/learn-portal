import { useEffect, useRef, useState } from "react";
import { useProgress } from "../../hooks/useProgress";
import { confetti } from "../../lib/confetti";
import { progress } from "../../lib/progress";
import { Mascot } from "../ui/Coach";
import type { Question, Quiz } from "../../types/content";
import { Button, Card, Rich, cx, useLang } from "../ui/primitives";
import QuestionView from "./QuestionView";

type Phase = "intro" | "running" | "summary";
interface Summary {
  correct: number;
  total: number;
  percent: number;
  xp: number;
  isBest: boolean;
  previousBest?: number;
}

const correctAnswer = (q: Question) => (q.type === "mcq" ? q.options.find((o) => o.correct)!.text : q.answers[0]);

export default function QuizRunner({ lessonId, quiz, onReviewCards }: { lessonId: string; quiz: Quiz; onReviewCards?: () => void }) {
  const lang = useLang();
  const ne = lang === "ne";
  const best = useProgress().lessons[lessonId]?.quizBest;
  const pass = quiz.passPercent ?? 70;
  const total = quiz.questions.length;

  const [phase, setPhase] = useState<Phase>("intro");
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<(boolean | undefined)[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const resolved = results[index] !== undefined;
  const isLast = index === total - 1;

  const start = () => {
    setAttempt((a) => a + 1);
    setIndex(0);
    setResults([]);
    setSummary(null);
    setPhase("running");
  };

  const next = () => {
    if (!resolved) return;
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    const correct = results.filter(Boolean).length;
    const result = progress.recordQuiz(lessonId, correct, total);
    setSummary({ correct, total, ...result });
    setPhase("summary");
    if (result.percent >= pass) confetti(innerWidth / 2, innerHeight * 0.45, result.percent === 100 ? 2.5 : 1.5);
  };

  // Enter moves on once the current question is answered.
  useEffect(() => {
    if (phase !== "running" || !resolved) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !(e.target as HTMLElement)?.closest("button,a,textarea")) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (phase === "running") cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [index, phase]);

  if (phase === "intro") {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <Mascot size={72} mood="happy" className="mx-auto" />
        <h2 className="mt-3 text-2xl font-bold text-slate-900">{ne ? "अभ्यास परीक्षा" : "Quiz time"}</h2>
        <p className="mt-2 text-slate-600">
          {total} {ne ? "प्रश्न" : total === 1 ? "question" : "questions"} · {ne ? "पास" : "pass mark"} {pass}%
        </p>
        <p className="mt-1 text-base text-slate-500">
          {ne
            ? "पहिलो प्रयासमा सही भएमा मात्र अङ्क गनिन्छ। गलत उत्तरले किन गलत भयो भनेर देखाउँछ।"
            : "Only first tries count toward your score. Wrong answers tell you why they're wrong, then you can try again."}
        </p>
        {best !== undefined && (
          <p className="mt-4 inline-block rounded-full bg-slate-100 px-3 py-1 text-base font-semibold text-slate-700">
            {ne ? "उत्कृष्ट" : "Best"}: {best}%
          </p>
        )}
        <div className="mt-6">
          <Button size="lg" onClick={start}>
            {ne ? "सुरु गरौँ" : best !== undefined ? "Try again" : "Start quiz"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-slate-400">{ne ? "किबोर्ड: 1–4 छान्न, Enter अगाडि बढ्न" : "Keyboard: 1–4 to choose, Enter to continue"}</p>
      </Card>
    );
  }

  if (phase === "summary" && summary) {
    const passed = summary.percent >= pass;
    const missed = quiz.questions.filter((_, i) => results[i] === false);
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Card className="animate-pop p-8 text-center">
          <div className="text-6xl" aria-hidden>
            {summary.percent === 100 ? "🏆" : passed ? "🌟" : "💪"}
          </div>
          <h2 className="mt-3 text-4xl font-extrabold text-slate-900">
            {summary.correct} / {summary.total}
          </h2>
          <p className="mt-1 text-lg font-semibold text-slate-600">{summary.percent}%</p>
          <p className="mt-3 text-slate-600">
            {summary.percent === 100
              ? ne ? "पूरै सही! अद्भुत।" : "Perfect score!"
              : passed
                ? ne ? "राम्रो! तपाईं पास हुनुभयो।" : "Nice work — you passed."
                : ne ? `पास हुन ${pass}% चाहिन्छ। फेरि प्रयास गर्नुहोस्!` : `You need ${pass}% to pass. Have another go!`}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-base font-semibold">
            <span className="rounded-2xl border-2 border-b-4 border-amber-300 bg-amber-100 px-3 py-1 font-extrabold text-amber-800">⚡ +{summary.xp} XP</span>
            {summary.isBest && summary.previousBest !== undefined && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                {ne ? "नयाँ रेकर्ड!" : "New best!"} ({summary.previousBest}% → {summary.percent}%)
              </span>
            )}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={start}>{ne ? "फेरि खेल्नुहोस्" : "Retry quiz"}</Button>
            {onReviewCards && (
              <Button variant="secondary" onClick={onReviewCards}>
                {ne ? "फ्ल्यासकार्ड" : "Review flashcards"}
              </Button>
            )}
          </div>
        </Card>

        {missed.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-3 font-bold text-slate-900">{ne ? "दोहोर्‍याउनुपर्ने प्रश्न" : "Worth another look"}</h3>
            <ul className="divide-y divide-slate-100">
              {missed.map((q) => (
                <li key={q.id} className="py-3">
                  <Rich text={q.prompt} lang={q.lang} className="text-slate-700" />
                  <div className="mt-1 text-base">
                    <span className="font-semibold text-emerald-700">{ne ? "उत्तर" : "Answer"}: </span>
                    <Rich text={correctAnswer(q)} inline lang={q.lang} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  const q = quiz.questions[index];
  return (
    <div className="mx-auto max-w-2xl">
      {/* Segmented progress: green = first-try right, rose = needed another go */}
      <div className="mb-4 flex items-center gap-3">
        <ol className="flex flex-1 gap-1" aria-label={`Question ${index + 1} of ${total}`}>
          {quiz.questions.map((qq, i) => (
            <li
              key={qq.id}
              className={cx(
                "h-2 flex-1 rounded-full transition-colors",
                results[i] === true ? "bg-emerald-500" : results[i] === false ? "bg-rose-400" : i === index ? "bg-slate-400" : "bg-slate-200",
              )}
            />
          ))}
        </ol>
        <span className="text-base font-semibold tabular-nums text-slate-500">
          {index + 1}/{total}
        </span>
      </div>

      <Card className="p-5 sm:p-7">
        <div ref={cardRef} className="scroll-mt-24">
          <QuestionView
            key={`${attempt}-${q.id}`}
            question={q}
            keyboard
            onResolved={({ firstTry }) =>
              setResults((r) => {
                const copy = [...r];
                copy[index] = firstTry;
                return copy;
              })
            }
          />
        </div>
      </Card>

      <div className="sticky bottom-4 mt-4 flex justify-end">
        <Button size="lg" variant={resolved ? "success" : "primary"} disabled={!resolved} onClick={next} className="min-w-40">
          {isLast ? (ne ? "नतिजा हेर्नुहोस्" : "See results") : ne ? "अर्को" : "Next"} →
        </Button>
      </div>
    </div>
  );
}
