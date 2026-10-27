import { BookOpen, Flame, Layers, Star, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useProgress } from "../hooks/useProgress";
import { useHud, type HudLesson, type HudSection } from "../lib/hud";
import { levelFor, liveStreak, progress, type ProgressState } from "../lib/progress";
import { cx } from "./ui/primitives";

/**
 * Sticky HUD — the ONLY place streak, XP and level appear: three compact pills,
 * plus one badge per section of the open lesson.
 */
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

  const pill = "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 font-display text-base font-semibold tabular-nums";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 rounded-xl" aria-label="Kakshya 7 home">
          <span className="grid size-10 place-items-center rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 font-display text-xl font-semibold text-white" aria-hidden>
            7
          </span>
          <span className="hidden font-display text-xl font-semibold text-slate-900 sm:inline">
            Kakshya <span className="text-indigo-600">7</span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">{lesson && <SectionBadges lesson={lesson} state={state} />}</div>

        <span
          title={`${streak}-day streak (best ${state.streak.longest})`}
          className={cx(pill, streak > 0 ? "border-orange-200 bg-orange-50 text-orange-600" : "border-slate-200 bg-white text-slate-400")}
        >
          <Flame size={18} strokeWidth={2.5} className={streak > 0 ? "fill-orange-400" : undefined} aria-hidden />
          {streak}
          <span className="sr-only">day streak</span>
        </span>

        <span title={`${state.xp} XP`} className={cx(pill, "relative border-amber-200 bg-amber-50 text-amber-700")}>
          <Zap key={bump} size={18} strokeWidth={2.5} className={cx("fill-amber-400", bump > 0 && "animate-pop")} aria-hidden />
          {state.xp}
          <span className="hidden sm:inline">XP</span>
          {pops.map((p) => (
            <span key={p.id} aria-hidden className="pointer-events-none absolute right-1 top-full animate-float-up text-base font-bold text-amber-600">
              +{p.amount}
            </span>
          ))}
        </span>

        <span
          title={`Level ${lvl.level}: ${lvl.into} / ${lvl.span} XP to the next level`}
          className={cx(pill, "relative hidden overflow-hidden border-indigo-200 bg-indigo-50 text-indigo-700 sm:flex")}
        >
          <Star size={17} strokeWidth={2.5} className="fill-indigo-300" aria-hidden />
          Lv {lvl.level}
          <span className="absolute inset-x-0 bottom-0 h-1 bg-indigo-100" aria-hidden>
            <span className="block h-full bg-indigo-500 transition-[width] duration-700" style={{ width: `${(lvl.into / lvl.span) * 100}%` }} />
          </span>
        </span>
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

const KIND_ICON = { learn: BookOpen, cards: Layers, quiz: Star } as const;

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
      {/* Phones: compact dots so many sections still fit next to the pills. */}
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
        {lesson.sections.map((s, i) => {
          const Icon = s.kind === "module" ? null : KIND_ICON[s.kind];
          return (
            <li
              key={s.id}
              title={`${s.label}${lit[i] ? " ✓" : ""}`}
              className={cx(
                "grid size-9 place-items-center rounded-xl border-2 border-b-4 font-display text-sm font-semibold transition-colors duration-300",
                lit[i]
                  ? s.kind === "quiz"
                    ? "border-amber-500 bg-amber-400 text-amber-950"
                    : "border-emerald-600 bg-emerald-500 text-white"
                  : "border-slate-200 bg-white text-slate-300",
                fresh[i] && "animate-badge",
              )}
            >
              {Icon ? <Icon size={16} strokeWidth={2.5} aria-hidden /> : <span aria-hidden>{s.icon}</span>}
              <span className="sr-only">
                {s.label} {lit[i] ? "done" : "not done yet"}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
