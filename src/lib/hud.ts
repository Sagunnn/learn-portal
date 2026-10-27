import { useSyncExternalStore } from "react";

/**
 * What the header HUD shows for the lesson that's open: one badge per section
 * (each interactive module, then Flashcards and Quiz). LessonPage sets it;
 * the header works out which badges are lit from saved progress.
 */
export interface HudSection {
  id: string;
  label: string;
  icon: string;
  kind: "module" | "learn" | "cards" | "quiz";
  chunkIndex?: number;
}

export interface HudLesson {
  lessonId: string;
  sections: HudSection[];
  passPercent: number;
  cardIds: string[];
}

let current: HudLesson | null = null;
const listeners = new Set<() => void>();

export const hud = {
  get: () => current,
  set(next: HudLesson | null) {
    current = next;
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};

export const useHud = () => useSyncExternalStore(hud.subscribe, hud.get, hud.get);
