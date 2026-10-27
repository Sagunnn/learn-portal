import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useProgress } from "../hooks/useProgress";
import { levelFor, liveStreak, progress } from "../lib/progress";
import { cx } from "./ui/primitives";

export default function AppHeader() {
  const state = useProgress();
  const streak = liveStreak(state);
  const { level } = levelFor(state.xp);
  const [pops, setPops] = useState<{ id: number; amount: number }[]>([]);

  useEffect(
    () =>
      progress.onXp((amount) => {
        const id = Date.now() + Math.random();
        setPops((p) => [...p, { id, amount }]);
        setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1200);
      }),
    [],
  );

  return (
    <header className="sticky top-0 z-30 print:hidden border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-lg font-bold tracking-tight text-slate-900">
          <span className="grid size-8 place-items-center rounded-lg bg-slate-900 font-deva text-lg text-amber-400" aria-hidden>
            ७
          </span>
          <span>
            Kakshya <span className="text-slate-400">7</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 text-sm font-semibold">
          <span
            title={`${streak}-day streak`}
            className={cx(
              "flex items-center gap-1 rounded-full px-2.5 py-1",
              streak > 0 ? "bg-orange-50 text-orange-600" : "bg-slate-100 text-slate-400",
            )}
          >
            <span aria-hidden className={streak > 0 ? "" : "grayscale"}>🔥</span>
            {streak}
            <span className="sr-only">day streak</span>
          </span>
          <span title="Total XP" className="relative flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
            <span aria-hidden>⚡</span>
            {state.xp}
            <span className="sr-only">XP</span>
            {pops.map((p) => (
              <span
                key={p.id}
                aria-hidden
                className="pointer-events-none absolute right-1 top-full animate-float-up text-xs font-bold text-amber-600"
              >
                +{p.amount}
              </span>
            ))}
          </span>
          <span title="Level" className="hidden rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 sm:inline">
            Lv {level}
          </span>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {pops.length ? `+${pops[pops.length - 1].amount} XP` : ""}
      </span>
    </header>
  );
}
