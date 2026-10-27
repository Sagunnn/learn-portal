import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useProgress } from "../hooks/useProgress";
import { useHud, type HudLesson, type HudSection } from "../lib/hud";
import { levelFor, liveStreak, progress, type ProgressState } from "../lib/progress";
import { cx } from "./ui/primitives";

/** Sticky HUD: section badges for the open lesson, streak flame, XP + level bar. */
export default function AppHeader() {
  const state = useProgress();
  const lesson = useHud();
  const streak = liveStreak(state);
  const lvl = levelFor(state.xp);
  const [pops, setPops] = useState<{ id: number; amount: number }[]>([]);
  const [bump, setBump] = useState(0);

  useEffect(
    () =>
      progress.onXp((amount) => {
        const id = Date.now() + Math.random();
        setPops((p) => [...p, { id, amount }]);
        setBump((b) => b + 1);
        setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1200);
      }),
    [],
  );

  return (
    <header className="sticky top-0 z-30 border-b-2 border-slate-200 bg-slate-50/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 rounded-xl font-extrabold tracking-tight text-slate-900" aria-label="Kakshya 7 home">
          <span className="grid size-10 place-items-center rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 font-deva text-xl text-amber-100" aria-hidden>
            ७
          </span>
          <span className="hidden font-display text-xl font-semibold sm:inline">
            Kakshya <span className="text-indigo-600">7</span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">{lesson && <SectionBadges lesson={lesson} state={state} />}</div>

        <span
          title={`${streak}-day streak (best ${state.streak.longest})`}
          className={cx(
            "flex h-10 shrink-0 items-center gap-1 rounded-2xl border-2 border-b-4 px-2.5 text-base font-extrabold",
            streak > 0 ? "border-orange-200 bg-orange-50 text-orange-600" : "border-slate-200 bg-white text-slate-400",
          )}
        >
          <span aria-hidden className={cx("text-lg", streak === 0 && "grayscale")}>
            🔥
          </span>
          {streak}
          <span className="sr-only">day streak</span>
        </span>

        <div
          title={`Level ${lvl.level}: ${lvl.into} / ${lvl.span} XP to the next level`}
          className="relative flex h-10 shrink-0 items-center gap-2 rounded-2xl border-2 border-b-4 border-amber-200 bg-amber-50 px-2.5"
        >
          <span key={bump} aria-hidden className={cx("text-lg", bump > 0 && "animate-pop")}>
            ⚡
          </span>
          <div className="w-14 sm:w-24">
            <div className="flex items-baseline justify-between text-[11px] font-extrabold leading-none text-amber-800">
              <span>Lv {lvl.level}</span>
              <span className="tabular-nums">{state.xp}</span>
            </div>
            <div
              className="mt-1 h-2 overflow-hidden rounded-full bg-amber-200/70"
              role="progressbar"
              aria-label="XP to next level"
              aria-valuemin={0}
              aria-valuemax={lvl.span}
              aria-valuenow={lvl.into}
            >
              <div className="h-full rounded-full bg-amber-500 transition-[width] duration-700 ease-out" style={{ width: `${(lvl.into / lvl.span) * 100}%` }} />
            </div>
          </div>
          {pops.map((p) => (
            <span key={p.id} aria-hidden className="pointer-events-none absolute right-1 top-full animate-float-up text-base font-extrabold text-amber-600">
              +{p.amount}
            </span>
          ))}
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {pops.length ? `+${pops[pops.length - 1].amount} XP` : ""}
      </span>
    </header>
  );
}

function isLit(s: HudSection, lesson: HudLesson, state: ProgressState) {
  const p = state.lessons[lesson.lessonId];
  if (!p) return false;
  switch (s.kind) {
    case "module":
      return !!p.completedAt || (p.learnIndex ?? 0) > (s.chunkIndex ?? 0);
    case "learn":
      return !!p.completedAt;
    case "cards": {
      const known = new Set(p.cardsKnown ?? []);
      return lesson.cardIds.length > 0 && lesson.cardIds.every((id) => known.has(id));
    }
    case "quiz":
      return (p.quizBest ?? 0) >= lesson.passPercent;
  }
}

function SectionBadges({ lesson, state }: { lesson: HudLesson; state: ProgressState }) {
  // Remember what was already lit, so only a badge that lights up *now* gets the pop.
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);
  const lit = lesson.sections.map((s) => isLit(s, lesson, state));
  const fresh = lesson.sections.map((s, i) => lit[i] && !first.current && !seen.current.has(s.id));
  useEffect(() => {
    lesson.sections.forEach((s, i) => lit[i] && seen.current.add(s.id));
    first.current = false;
  });

  const litCount = lit.filter(Boolean).length;
  return (
    <>
      {/* Phones: compact dots so many sections still fit next to the streak and XP. */}
      <ol className="flex items-center gap-1 sm:hidden" aria-label={`Lesson sections: ${litCount} of ${lit.length} done`}>
        {lesson.sections.map((s, i) => (
          <li
            key={s.id}
            className={cx(
              "size-2.5 rounded-full transition-colors duration-300",
              lit[i] ? (s.kind === "quiz" ? "bg-amber-400" : "bg-emerald-500") : "bg-slate-300",
              fresh[i] && "animate-badge",
            )}
          />
        ))}
      </ol>
    <ol className="hidden items-center gap-1.5 sm:flex" aria-label="Lesson sections">
      {lesson.sections.map((s, i) => (
        <li
          key={s.id}
          title={`${s.label}${lit[i] ? " ✓" : ""}`}
          className={cx(
            "grid size-8 place-items-center rounded-xl border-2 border-b-4 text-base font-extrabold transition-colors duration-300 sm:size-9",
            lit[i]
              ? s.kind === "quiz"
                ? "border-amber-500 bg-amber-400 text-amber-950"
                : "border-emerald-600 bg-emerald-500 text-white"
              : "border-slate-200 bg-white text-slate-300",
            fresh[i] && "animate-badge",
          )}
        >
          <span aria-hidden className={lit[i] ? undefined : "opacity-40 grayscale"}>
            {s.icon}
          </span>
          <span className="sr-only">
            {s.label} {lit[i] ? "done" : "not done yet"}
          </span>
        </li>
      ))}
    </ol>
    </>
  );
}
