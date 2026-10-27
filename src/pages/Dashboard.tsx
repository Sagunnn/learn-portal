import { useRef, useState } from "react";
import { Link } from "react-router";
import { useProgress } from "../hooks/useProgress";
import { getSubject, lessons, lessonsForSubject, subjects } from "../lib/content";
import { dayKey, lastDays } from "../lib/date";
import { DAILY_GOAL, levelFor, liveStreak, progress } from "../lib/progress";
import { resumeTarget, subjectStats } from "../lib/stats";
import { themeFor } from "../lib/theme";
import { Bubble, Coach } from "../components/ui/Coach";
import { Button, ProgressBar, ProgressRing, cx } from "../components/ui/primitives";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const state = useProgress();
  const today = dayKey();
  const todayXp = state.daily[today] ?? 0;
  const streak = liveStreak(state);
  const lvl = levelFor(state.xp);
  const resume = resumeTarget(lessons, state);

  const line =
    todayXp >= DAILY_GOAL
      ? "Daily goal done! Anything more is a bonus."
      : todayXp > 0
        ? `${DAILY_GOAL - todayXp} XP more for today's goal.`
        : streak > 0
          ? `Keep your ${streak}-day streak going today!`
          : "Pick a subject. Let's earn 30 XP today!";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="sr-only">Dashboard</h1>

      {/* one calm "today" card */}
      <section className="rounded-3xl border-4 border-slate-100 bg-white p-6 shadow-cozy sm:p-8">
        <Coach mood={todayXp >= DAILY_GOAL ? "cheer" : "happy"}>
          <Bubble tone="indigo">
            <span className="font-display text-xl font-semibold text-slate-800">
              {greeting()}! <span className="font-deva">नमस्ते</span> 👋
            </span>
            <br />
            {line}
          </Bubble>
        </Coach>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 sm:justify-between">
          <div className="flex items-center gap-4">
            <ProgressRing value={todayXp} max={DAILY_GOAL} size={84} stroke={10}>
              <span className="font-display text-xl font-semibold text-slate-800">{Math.min(todayXp, 999)}</span>
            </ProgressRing>
            <div>
              <div className="font-display text-xl font-semibold text-slate-800">
                {todayXp} / {DAILY_GOAL} XP
              </div>
              <div className="text-base text-slate-500">today's goal</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-orange-50 px-4 py-3 text-center">
              <div className="text-2xl" aria-hidden>
                🔥
              </div>
              <div className="font-display text-xl font-semibold text-orange-700">{streak}</div>
              <div className="text-base text-slate-500">day streak</div>
            </div>
            <div className="min-w-28 rounded-2xl bg-amber-50 px-4 py-3 text-center">
              <div className="text-2xl" aria-hidden>
                ⭐
              </div>
              <div className="font-display text-xl font-semibold text-amber-800">Level {lvl.level}</div>
              <ProgressBar value={lvl.into} max={lvl.span} barClass="bg-amber-400" className="mt-1 h-2" label="Level progress" />
            </div>
          </div>
        </div>

        <ol className="mt-6 flex justify-center gap-2" aria-label="This week">
          {lastDays(7).map((d) => {
            const xp = state.daily[d] ?? 0;
            return (
              <li key={d} className="flex flex-col items-center gap-1" title={`${d}: ${xp} XP`}>
                <span
                  className={cx(
                    "grid size-9 place-items-center rounded-full text-base font-bold",
                    xp >= DAILY_GOAL ? "bg-emerald-500 text-white" : xp > 0 ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-300",
                    d === today && "ring-4 ring-orange-200",
                  )}
                >
                  {xp >= DAILY_GOAL ? "✓" : xp > 0 ? "•" : ""}
                </span>
                <span className="text-sm font-semibold text-slate-400">{new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "narrow" })}</span>
              </li>
            );
          })}
        </ol>

        {resume && (
          <Link
            to={`/lesson/${resume.e.meta.id}`}
            className="press mt-6 flex items-center gap-4 rounded-3xl border-orange-200 bg-orange-50 p-4 hover:bg-orange-100"
          >
            <span className="text-3xl" aria-hidden>
              {getSubject(resume.e.meta.subject)?.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold uppercase tracking-wide text-slate-400">Keep going</span>
              <span className="block truncate font-display text-xl font-semibold text-slate-800">{resume.e.meta.title}</span>
            </span>
            <span className="font-display text-2xl text-indigo-600">➔</span>
          </Link>
        )}
      </section>

      {/* subjects: big, friendly cards, one per row */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-800">Choose a subject</h2>
        {subjects.map((s) => {
          const t = themeFor(s.theme);
          const { total, completed } = subjectStats(lessonsForSubject(s.id), state);
          return (
            <Link
              key={s.id}
              to={`/subject/${s.id}`}
              className={cx("press group flex items-center gap-5 rounded-3xl border-slate-200 bg-white p-5 shadow-cozy hover:-translate-y-1 sm:p-6", t.ring)}
            >
              <span className={cx("grid size-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br text-4xl", t.gradient)} aria-hidden>
                <span className="transition group-hover:scale-110">{s.icon}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl font-semibold text-slate-800">{s.name}</span>
                {s.nameLocal && <span className="block font-deva text-lg text-slate-500">{s.nameLocal}</span>}
                <span className="mt-2 flex items-center gap-3">
                  <ProgressBar value={completed} max={total || 1} barClass={t.bar} className="max-w-56" label={`${s.name} progress`} />
                  <span className={cx("shrink-0 text-base font-bold", t.text)}>
                    {completed}/{total}
                  </span>
                </span>
              </span>
              <span className="font-display text-3xl text-slate-300 transition group-hover:text-indigo-500" aria-hidden>
                ➔
              </span>
            </Link>
          );
        })}
      </section>

      <BackupPanel />
    </div>
  );
}

/** localStorage is per-browser, so let the student carry progress to another device. */
function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([progress.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kakshya7-progress-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restore = async (file: File) => {
    const ok = progress.importJson(await file.text());
    setMsg(ok ? "Progress restored." : "That file isn't a Kakshya 7 backup.");
  };

  return (
    <details className="rounded-3xl border-2 border-slate-200 bg-white/60 px-5 py-3 text-base text-slate-500">
      <summary className="cursor-pointer font-display font-semibold text-slate-600">⚙️ Settings & backup</summary>
      <p className="mt-2">Progress is saved in this browser only.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={download}>
          Back up
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          Restore
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-rose-600 hover:bg-rose-50"
          onClick={() => {
            if (confirm("Erase all XP, streaks and lesson progress on this device?")) progress.reset();
          }}
        >
          Reset everything
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void restore(f);
          e.target.value = "";
        }}
      />
      {msg && (
        <p role="status" className="mt-2 text-slate-600">
          {msg}
        </p>
      )}
    </details>
  );
}
