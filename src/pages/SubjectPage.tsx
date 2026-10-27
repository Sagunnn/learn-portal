import { Link, useParams } from "react-router";
import { useProgress } from "../hooks/useProgress";
import { getSubject, lessonsForSubject } from "../lib/content";
import { lessonStatus, subjectStats, type LessonStatus } from "../lib/stats";
import { themeFor } from "../lib/theme";
import { ProgressBar, cx } from "../components/ui/primitives";
import NotFound from "./NotFound";

const STATUS: Record<LessonStatus, { label: string; className: string }> = {
  new: { label: "Start", className: "bg-slate-100 text-slate-600" },
  started: { label: "In progress", className: "bg-amber-100 text-amber-800" },
  done: { label: "Completed", className: "bg-sky-100 text-sky-800" },
  mastered: { label: "Mastered ★", className: "bg-emerald-100 text-emerald-800" },
};

export default function SubjectPage() {
  const { subjectId = "" } = useParams();
  const state = useProgress();
  const subject = getSubject(subjectId);
  if (!subject) return <NotFound />;

  const t = themeFor(subject.theme);
  const entries = lessonsForSubject(subject.id);
  const { total, completed } = subjectStats(entries, state);

  return (
    <div className="space-y-6">
      <Link to="/" className="text-base font-semibold text-slate-500 hover:text-slate-800">
        ← Dashboard
      </Link>

      <header className={cx("rounded-3xl bg-gradient-to-br p-6 text-white shadow-cozy sm:p-8", t.gradient)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{subject.name}</h1>
            {subject.nameLocal && <p className="font-deva text-lg text-white/85">{subject.nameLocal}</p>}
            <p className="mt-2 max-w-prose text-white/90">{subject.description}</p>
          </div>
          <span className="text-5xl" aria-hidden>
            {subject.icon}
          </span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <ProgressBar value={completed} max={total || 1} barClass="bg-white" className="bg-white/25" label="Subject progress" />
          <span className="shrink-0 text-base font-semibold">
            {completed}/{total}
          </span>
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No chapters yet. Add a JSON file to <code>content/lessons/{subject.id}/</code>.
        </p>
      ) : (
        <ol className="space-y-3">
          {entries.map((e) => {
            const p = state.lessons[e.meta.id];
            const status = lessonStatus(e, p);
            const s = STATUS[status];
            return (
              <li key={e.meta.id}>
                <Link
                  to={`/lesson/${e.meta.id}`}
                  className="press flex items-center gap-4 rounded-3xl border-slate-200 bg-white p-5 shadow-cozy hover:-translate-y-0.5 hover:border-orange-200"
                >
                  <span
                    className={cx(
                      "grid size-12 shrink-0 place-items-center rounded-2xl border-b-4 text-lg font-extrabold",
                      status === "mastered" ? "border-emerald-700 bg-emerald-500 text-white" : cx("border-black/10", t.soft, t.text),
                    )}
                  >
                    {status === "mastered" ? "✓" : e.meta.chapter}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-semibold text-slate-800">{e.meta.title}</span>
                    {e.meta.titleLocal && <span className="block font-deva text-slate-500">{e.meta.titleLocal}</span>}
                    <span className="mt-1 block text-base text-slate-500">{e.meta.summary}</span>
                    <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-400">
                      {e.meta.estMinutes && <span>⏱ {e.meta.estMinutes} min</span>}
                      <span>📖 {e.counts.chunks} steps</span>
                      {e.counts.flashcards > 0 && <span>🃏 {e.counts.flashcards} cards</span>}
                      {e.counts.questions > 0 && <span>❓ {e.counts.questions} questions</span>}
                      {p?.quizBest !== undefined && <span className="font-semibold text-slate-600">Best quiz: {p.quizBest}%</span>}
                    </span>
                  </span>
                  <span className={cx("hidden shrink-0 rounded-full px-3 py-1 text-sm font-semibold sm:inline", s.className)}>{s.label}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
