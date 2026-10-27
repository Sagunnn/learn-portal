import { addDays, dayKey } from "./date";

// ---- XP rules -------------------------------------------------------------

export const XP = {
  lessonComplete: 20,
  lessonReview: 5,
  checkCorrect: 2,
  quizCorrect: 5,
  quizPerfectBonus: 10,
  cardKnown: 1,
  challenge: 5,
} as const;

export const DAILY_GOAL = 30;

/** Level n starts at 50·n·(n−1) XP: 0, 100, 300, 600, 1000 … */
export function levelFor(xp: number) {
  let level = 1;
  while (50 * (level + 1) * level <= xp) level++;
  const start = 50 * level * (level - 1);
  const next = 50 * (level + 1) * level;
  return { level, into: xp - start, span: next - start };
}

// ---- State shape ------------------------------------------------------------

export interface LessonProgress {
  /** Index of the furthest Learn chunk revealed, for resuming. */
  learnIndex?: number;
  completedAt?: string;
  quizBest?: number; // percent
  quizAttempts?: number;
  cardsKnown?: string[];
  /** Sandbox challenges solved inside interactive modules. */
  challengesDone?: string[];
  lastVisited?: string;
}

export interface ProgressState {
  version: 1;
  xp: number;
  streak: { current: number; longest: number; lastActive: string | null };
  /** dayKey → XP earned that day (kept for ~90 days). */
  daily: Record<string, number>;
  lessons: Record<string, LessonProgress>;
}

export const emptyState = (): ProgressState => ({
  version: 1,
  xp: 0,
  streak: { current: 0, longest: 0, lastActive: null },
  daily: {},
  lessons: {},
});

// ---- Pure updates (unit-tested) ---------------------------------------------

export function withXp(state: ProgressState, amount: number, today = dayKey()): ProgressState {
  if (amount <= 0) return state;
  const { streak } = state;
  let current = streak.current;
  if (streak.lastActive !== today) {
    current = streak.lastActive === addDays(today, -1) ? current + 1 : 1;
  }
  const daily: Record<string, number> = {};
  const cutoff = addDays(today, -90);
  for (const [k, v] of Object.entries(state.daily)) if (k >= cutoff) daily[k] = v;
  daily[today] = (daily[today] ?? 0) + amount;
  return {
    ...state,
    xp: state.xp + amount,
    daily,
    streak: { current, longest: Math.max(streak.longest, current), lastActive: today },
  };
}

/** The streak as it stands today: it's broken if the last active day was before yesterday. */
export function liveStreak(state: ProgressState, today = dayKey()): number {
  const last = state.streak.lastActive;
  return last === today || last === addDays(today, -1) ? state.streak.current : 0;
}

function patchLesson(state: ProgressState, id: string, patch: Partial<LessonProgress>): ProgressState {
  return { ...state, lessons: { ...state.lessons, [id]: { ...state.lessons[id], ...patch } } };
}

function isState(x: unknown): x is ProgressState {
  const s = x as ProgressState;
  return !!s && s.version === 1 && typeof s.xp === "number" && !!s.streak && !!s.daily && !!s.lessons;
}

// ---- Store (localStorage-backed, shared across tabs) --------------------------

const KEY = "kakshya7:progress:v1";
let state: ProgressState = read();
const listeners = new Set<() => void>();
const xpListeners = new Set<(amount: number) => void>();

function read(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return isState(parsed) ? { ...emptyState(), ...parsed } : emptyState();
  } catch {
    return emptyState(); // private mode / blocked storage: progress lives in memory only
  }
}

function commit(next: ProgressState) {
  if (next === state) return;
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — keep going in memory */
  }
  listeners.forEach((fn) => fn());
}

function gain(next: ProgressState, amount: number) {
  commit(withXp(next, amount));
  if (amount > 0) xpListeners.forEach((fn) => fn(amount));
  return amount;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = read();
      listeners.forEach((fn) => fn());
    }
  });
}

export const progress = {
  get: () => state,

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },

  /** Fires with the amount whenever XP is earned (for the "+5 XP" pop). */
  onXp(fn: (amount: number) => void) {
    xpListeners.add(fn);
    return () => void xpListeners.delete(fn);
  },

  touchLesson(id: string) {
    commit(patchLesson(state, id, { lastVisited: new Date().toISOString() }));
  },

  setLearnIndex(id: string, index: number) {
    const prev = state.lessons[id]?.learnIndex ?? 0;
    if (index !== prev) commit(patchLesson(state, id, { learnIndex: index }));
  },

  /** Returns XP earned. */
  completeLesson(id: string): number {
    const first = !state.lessons[id]?.completedAt;
    const next = patchLesson(state, id, { completedAt: state.lessons[id]?.completedAt ?? new Date().toISOString() });
    return gain(next, first ? XP.lessonComplete : XP.lessonReview);
  },

  checkAnswered(firstTry: boolean): number {
    return firstTry ? gain(state, XP.checkCorrect) : 0;
  },

  recordQuiz(id: string, correct: number, total: number) {
    const percent = total ? Math.round((correct / total) * 100) : 0;
    const prev = state.lessons[id];
    const isBest = percent > (prev?.quizBest ?? -1);
    const next = patchLesson(state, id, {
      quizBest: Math.max(percent, prev?.quizBest ?? 0),
      quizAttempts: (prev?.quizAttempts ?? 0) + 1,
    });
    const xp = correct * XP.quizCorrect + (total > 0 && correct === total ? XP.quizPerfectBonus : 0);
    gain(next, xp);
    return { percent, isBest, xp, previousBest: prev?.quizBest };
  },

  setCardKnown(id: string, cardId: string, known: boolean): number {
    const set = new Set(state.lessons[id]?.cardsKnown ?? []);
    const wasKnown = set.has(cardId);
    if (known === wasKnown) return 0;
    known ? set.add(cardId) : set.delete(cardId);
    const next = patchLesson(state, id, { cardsKnown: [...set] });
    return known ? gain(next, XP.cardKnown) : (commit(next), 0);
  },

  /** Returns XP earned (0 if this challenge was already solved). */
  completeChallenge(id: string, challengeId: string, xp: number = XP.challenge): number {
    const done = state.lessons[id]?.challengesDone ?? [];
    if (done.includes(challengeId)) return 0;
    return gain(patchLesson(state, id, { challengesDone: [...done, challengeId] }), xp);
  },

  resetCards(id: string) {
    commit(patchLesson(state, id, { cardsKnown: [] }));
  },

  exportJson(): string {
    return JSON.stringify({ app: "kakshya7", exportedAt: new Date().toISOString(), progress: state }, null, 2);
  },

  importJson(text: string): boolean {
    try {
      const data = JSON.parse(text);
      const candidate = data?.progress ?? data;
      if (!isState(candidate)) return false;
      commit({ ...emptyState(), ...candidate });
      return true;
    } catch {
      return false;
    }
  },

  reset() {
    commit(emptyState());
  },
};
