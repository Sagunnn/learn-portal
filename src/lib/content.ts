import subjectsFile from "../../content/subjects.json";
import lessonIndex from "virtual:lesson-index";
import type { Lesson, LessonIndexEntry, Subject } from "../types/content";

// Every lesson body becomes its own lazily-loaded chunk.
const loaders = import.meta.glob<Lesson>("/content/lessons/**/*.json", { import: "default" });

export const subjects: Subject[] = (subjectsFile as { subjects: Subject[] }).subjects;

const byChapter = (a: LessonIndexEntry, b: LessonIndexEntry) =>
  a.meta.chapter - b.meta.chapter || a.meta.title.localeCompare(b.meta.title);

export const lessons: LessonIndexEntry[] = [...lessonIndex].sort(byChapter);

export const getSubject = (id: string) => subjects.find((s) => s.id === id);
export const getLessonEntry = (id: string) => lessons.find((l) => l.meta.id === id);
export const lessonsForSubject = (subjectId: string) => lessons.filter((l) => l.meta.subject === subjectId);

const cache = new Map<string, Promise<Lesson>>();

export function loadLesson(id: string): Promise<Lesson> {
  const entry = getLessonEntry(id);
  const load = entry && loaders[entry.path];
  if (!load) return Promise.reject(new Error(`Lesson "${id}" not found`));
  if (!cache.has(id)) {
    const p = load().catch((e) => {
      cache.delete(id); // let a retry try again (e.g. flaky network)
      throw e;
    });
    cache.set(id, p);
  }
  return cache.get(id)!;
}
