import { ArrowRight, Settings } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { useProgress } from "../hooks/useProgress";
import { lessons, lessonsForSubject, subjects } from "../lib/content";
import { dayKey, lastDays } from "../lib/date";
import { DAILY_GOAL, progress } from "../lib/progress";
import { lessonStatus, resumeTarget } from "../lib/stats";
import { themeFor } from "../lib/theme";
import SubjectIcon from "../components/ui/SubjectIcon";
import { Button, cx } from "../components/ui/primitives";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/**
 * Streak, XP and level live only in the header. The dashboard is a compact
 * "Continue learning" hero (with the week tracker) and a 3-column subject grid.
 */
export default function Dashboard() {
  const state = useProgress();
  const today = dayKey();
  const todayXp = state.daily[today] ?? 0;

  // Continue the last lesson opened; otherwise start the first unfinished one.
  const resume = resumeTarget(lessons, state)?.e ?? lessons.find((l) => !state.lessons[l.meta.id]?.completedAt) ?? lessons[0];
  const started = !!state.lessons[resume?.meta.id ?? ""]?.lastVisited;

  return (
    <div className="space-y-8">
      <h1 className="sr-only">Dashboard</h1>

      {/* Compact hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white shadow-lg shadow-indigo-500/20 sm:max-h-[160px] sm:px-8 sm:py-4">
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 right-40 size-40 rounded-full bg-white/5" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-display text-2xl font-semibold leading-tight">
              {greeting()}!
            </p>
            <p className="mt-0.5 text-base text-indigo-100">
              {todayXp >= DAILY_GOAL ? "Daily goal done. Great work!" : `${todayXp} / ${DAILY_GOAL} XP today`}
            </p>
            {resume && (
              <Link
                to={`/lesson/${resume.meta.id}`}
                className="mt-2.5 inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-2xl border-b-4 border-indigo-200 bg-white px-5 py-1.5 font-display text-lg font-semibold text-indigo-700 transition-all hover:bg-indigo-50 active:mb-1 active:translate-y-1 active:border-b-0"
              >
                <span className="truncate">
                  {started ? "Continue" : "Start"}: {resume.meta.title}
                </span>
                <ArrowRight size={20} strokeWidth={2.75} className="shrink-0" aria-hidden />
              </Link>
            )}
          </div>

          {/* week tracker */}
          <ol className="hidden shrink-0 gap-1.5 rounded-2xl bg-white/10 p-2 sm:flex" aria-label="XP this week">
            {lastDays(7).map((d) => {
              const xp = state.daily[d] ?? 0;
              return (
                <li key={d} className="flex flex-col items-center gap-1" title={`${d}: ${xp} XP`}>
                  <span
                    className={cx(
                      "grid size-7 place-items-center rounded-full text-sm font-bold",
                      xp >= DAILY_GOAL ? "bg-emerald-400 text-emerald-950" : xp > 0 ? "bg-amber-300 text-amber-950" : "bg-white/15 text-white/50",
                      d === today && "ring-2 ring-white",
                    )}
                  >
                    {xp >= DAILY_GOAL ? "✓" : ""}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-100">{new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Subjects bento grid */}
      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold text-slate-900">Choose a subject</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {subjects.map((s) => {
            const t = themeFor(s.theme);
            const entries = lessonsForSubject(s.id);
            const done = entries.filter((e) => state.lessons[e.meta.id]?.completedAt).length;
            return (
              <Link
                key={s.id}
                to={`/subject/${s.id}`}
                className={cx(
                  "group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-cozy transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",
                  t.ring,
                )}
              >
                <div className={cx("relative flex h-32 items-center justify-center bg-gradient-to-br text-white", t.gradient)}>
                  <span className="pointer-events-none absolute -left-6 -top-6 size-24 rounded-full bg-white/15" aria-hidden />
                  <span className="pointer-events-none absolute -bottom-8 right-4 size-20 rounded-full bg-white/10" aria-hidden />
                  <span className="relative grid size-20 place-items-center rounded-3xl bg-white/20 ring-1 ring-white/40 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3">
                    <SubjectIcon subject={s} size={44} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="font-display text-2xl font-semibold text-slate-900">{s.name}</div>
                  <div className="text-base text-slate-500">{s.description}</div>

                  <div className="mt-4">
                    <div className="flex gap-1" aria-hidden>
                      {entries.map((e) => {
                        const st = lessonStatus(e, state.lessons[e.meta.id]);
                        return (
                          <span
                            key={e.meta.id}
                            className={cx("h-2.5 flex-1 rounded-full", st === "mastered" || st === "done" ? t.bar : st === "started" ? "bg-slate-300" : "bg-slate-200")}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-1.5 text-sm font-bold text-slate-500">
                      {done}/{entries.length} chapters
                    </div>
                  </div>

                  <span
                    className={cx(
                      "mt-5 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-b-4 font-display text-lg font-semibold text-white transition-all group-active:mb-1 group-active:translate-y-1 group-active:border-b-0",
                      t.button,
                    )}
                  >
                    Explore <ArrowRight size={20} strokeWidth={2.75} aria-hidden />
                  </span>
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
    <details className="rounded-3xl border border-slate-200 bg-white px-5 py-3 text-base text-slate-500">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-display font-semibold text-slate-600">
        <Settings size={18} aria-hidden /> Settings & backup
      </summary>
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
