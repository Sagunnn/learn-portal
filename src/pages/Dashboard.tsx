import { useRef, useState } from "react";
import { Link } from "react-router";
import { useProgress } from "../hooks/useProgress";
import { getSubject, lessons, lessonsForSubject, subjects } from "../lib/content";
import { dayKey, lastDays } from "../lib/date";
import { DAILY_GOAL, levelFor, liveStreak, progress } from "../lib/progress";
import { resumeTarget, subjectStats } from "../lib/stats";
import { themeFor } from "../lib/theme";
import { Button, Card, ProgressBar, ProgressRing, cx } from "../components/ui/primitives";
import { Bubble, Coach } from "../components/ui/Coach";

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
  const week = lastDays(7);
  const resume = resumeTarget(lessons, state);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-indigo-100/70 blur-2xl" />
          <h1 className="sr-only">Dashboard</h1>
          <Coach mood={todayXp >= DAILY_GOAL ? "cheer" : "happy"}>
            <Bubble tone="indigo">
              <span className="font-extrabold text-slate-900">
                {greeting()}! <span className="font-deva">नमस्ते</span> 👋
              </span>
              <br />
              {todayXp >= DAILY_GOAL
                ? "Daily goal smashed. Want to beat your streak record?"
                : todayXp > 0
                  ? `${DAILY_GOAL - todayXp} XP to go for today's goal.`
                  : streak > 0
                    ? `Keep your ${streak}-day streak alive: earn ${DAILY_GOAL} XP today.`
                    : "Pick a subject and earn 30 XP today."}
            </Bubble>
          </Coach>
          <div className="mt-5 flex items-center gap-4">
            <ProgressRing value={todayXp} max={DAILY_GOAL} size={64} stroke={7}>
              <span className="text-sm font-bold text-slate-800">{Math.min(todayXp, 999)}</span>
            </ProgressRing>
            <div className="text-sm text-slate-600">
              <div className="font-extrabold text-slate-800">
                {todayXp} / {DAILY_GOAL} XP today
              </div>
              <div>Lessons, quizzes and challenges fill the ring.</div>
            </div>
          </div>
          {resume && (
            <Link
              to={`/lesson/${resume.e.meta.id}`}
              className="press mt-5 flex items-center gap-3 rounded-2xl border-indigo-200 bg-indigo-50 p-3 hover:bg-white"
            >
              <span className="text-2xl" aria-hidden>
                {getSubject(resume.e.meta.subject)?.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Continue</span>
                <span className="block truncate font-semibold text-slate-800">{resume.e.meta.title}</span>
              </span>
              <span className="rounded-xl border-b-4 border-indigo-800 bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white">Resume →</span>
            </Link>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="text-3xl" aria-hidden>
              🔥
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{streak}</div>
            <div className="text-sm text-slate-500">day streak · best {state.streak.longest}</div>
          </Card>
          <Card className="p-5">
            <div className="text-3xl" aria-hidden>
              ⚡
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{state.xp}</div>
            <div className="text-sm text-slate-500">total XP · level {lvl.level}</div>
            <ProgressBar value={lvl.into} max={lvl.span} barClass="bg-amber-400" className="mt-2 h-1.5" label="Level progress" />
          </Card>
          <Card className="col-span-2 p-5">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-800">This week</span>
              <span className="text-slate-400">goal {DAILY_GOAL} XP/day</span>
            </div>
            <ol className="grid grid-cols-7 gap-1.5">
              {week.map((d) => {
                const xp = state.daily[d] ?? 0;
                const label = new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "narrow" });
                return (
                  <li key={d} className="flex flex-col items-center gap-1" title={`${d}: ${xp} XP`}>
                    <span
                      className={cx(
                        "grid size-8 place-items-center rounded-lg text-xs font-bold",
                        xp >= DAILY_GOAL ? "bg-emerald-500 text-white" : xp > 0 ? "bg-amber-200 text-amber-800" : "bg-slate-100 text-slate-300",
                        d === today && "ring-2 ring-slate-900 ring-offset-1",
                      )}
                    >
                      {xp >= DAILY_GOAL ? "✓" : xp > 0 ? xp : "·"}
                    </span>
                    <span className="text-[11px] text-slate-400">{label}</span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </section>

      {/* Subjects */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Subjects</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => {
            const t = themeFor(s.theme);
            const { total, completed } = subjectStats(lessonsForSubject(s.id), state);
            return (
              <Link
                key={s.id}
                to={`/subject/${s.id}`}
                className={cx(
                  "press group flex flex-col overflow-hidden rounded-2xl border-slate-200 bg-white",
                  "hover:-translate-y-1 hover:border-slate-300",
                  t.ring,
                )}
              >
                <div className={cx("flex items-end justify-between bg-gradient-to-br p-5 text-white", t.gradient)}>
                  <div>
                    <div className="text-xl font-extrabold">{s.name}</div>
                    {s.nameLocal && <div className="font-deva text-white/85">{s.nameLocal}</div>}
                  </div>
                  <span className="text-4xl drop-shadow-sm transition group-hover:scale-110" aria-hidden>
                    {s.icon}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <p className="flex-1 text-sm text-slate-600">{s.description}</p>
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs font-semibold">
                      <span className={t.text}>
                        {completed} of {total} chapter{total === 1 ? "" : "s"}
                      </span>
                      <span className="text-slate-400">{total ? Math.round((completed / total) * 100) : 0}%</span>
                    </div>
                    <ProgressBar value={completed} max={total || 1} barClass={t.bar} label={`${s.name} progress`} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
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
    <section className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-6 text-sm text-slate-500">
      <span className="mr-auto">Progress is saved in this browser.</span>
      <Button variant="ghost" size="sm" onClick={download}>
        Back up
      </Button>
      <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
        Restore
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        onClick={() => {
          if (confirm("Erase all XP, streaks and lesson progress on this device?")) progress.reset();
        }}
      >
        Reset
      </Button>
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
        <span role="status" className="w-full text-right text-slate-600">
          {msg}
        </span>
      )}
    </section>
  );
}
