import type { LessonIndexEntry } from "../types/content";
import type { LessonProgress, ProgressState } from "./progress";

export type LessonStatus = "new" | "started" | "done" | "mastered";

/** "mastered" = Learn path finished and the quiz passed (or there is no quiz). */
export function lessonStatus(entry: LessonIndexEntry, p: LessonProgress | undefined): LessonStatus {
  if (!p) return "new";
  if (p.completedAt && (entry.counts.questions === 0 || (p.quizBest ?? 0) >= entry.passPercent)) return "mastered";
  if (p.completedAt) return "done";
  if (p.learnIndex || p.lastVisited || p.quizAttempts) return "started";
  return "new";
}

export function subjectStats(entries: LessonIndexEntry[], state: ProgressState) {
  const completed = entries.filter((e) => state.lessons[e.meta.id]?.completedAt).length;
  return { total: entries.length, completed };
}

/** Most recently opened lesson that isn't finished yet. */
export function resumeTarget(entries: LessonIndexEntry[], state: ProgressState) {
  return entries
    .map((e) => ({ e, p: state.lessons[e.meta.id] }))
    .filter(({ p }) => p?.lastVisited && !p.completedAt)
    .sort((a, b) => (b.p!.lastVisited! > a.p!.lastVisited! ? 1 : -1))[0];
}
