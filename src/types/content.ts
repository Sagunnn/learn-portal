// Mirrors schema/lesson.schema.json and schema/subjects.schema.json.
// If you change one, change the other.

/** A string, or an array of lines (each line is a paragraph). */
export type RichText = string | string[];
export type Lang = "en" | "ne";

export type ThemeName = "emerald" | "indigo" | "rose" | "amber" | "sky" | "violet";

export interface Subject {
  id: string;
  name: string;
  nameLocal?: string;
  description: string;
  icon: string;
  /** SVG icon name: flask, atom, calculator, compass, book, feather, globe, leaf */
  iconKey?: string;
  theme: ThemeName;
}

export interface LessonMeta {
  id: string;
  subject: string;
  chapter: number;
  title: string;
  titleLocal?: string;
  summary: string;
  lang?: Lang;
  estMinutes?: number;
  tags?: string[];
  draft?: boolean;
}

export interface LessonIndexEntry {
  path: string;
  meta: LessonMeta;
  counts: { chunks: number; flashcards: number; questions: number };
  passPercent: number;
}

// ---- Learn path chunks ---------------------------------------------------

interface ChunkBase {
  lang?: Lang;
}

export interface TextChunk extends ChunkBase {
  type: "text";
  title?: string;
  body: RichText;
}

export interface CalloutChunk extends ChunkBase {
  type: "callout";
  variant: "tip" | "remember" | "warning" | "example" | "fact";
  title?: string;
  body: RichText;
}

export interface FormulaChunk extends ChunkBase {
  type: "formula";
  title?: string;
  items: { tex: string; label?: string }[];
  caption?: RichText;
}

export type MorphemeRole = "prefix" | "root" | "suffix";

export interface WordBreakdownChunk extends ChunkBase {
  type: "wordBreakdown";
  title?: string;
  intro?: RichText;
  items: { word: string; parts: { text: string; role: MorphemeRole }[]; meaning?: RichText }[];
}

export interface TableChunk extends ChunkBase {
  type: "table";
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface PracticeChunk extends ChunkBase {
  type: "practice";
  title?: string;
  problem: RichText;
  hint?: RichText;
  steps: RichText[];
  answer: RichText;
}

export interface CheckChunk {
  type: "check";
  lang?: undefined;
  question: Question;
}

export interface ImageChunk extends ChunkBase {
  type: "image";
  src: string;
  alt: string;
  caption?: RichText;
}

export type WidgetName =
  | "equivalentFractions"
  | "mixedNumberTank"
  | "gridMerger"
  | "areaOverlap"
  | "gridRunner"
  | "vectorSorter"
  | "skateTrack"
  | "cratePush"
  | "workDetector"
  | "indicatorLab"
  | "phScale"
  | "neutralization"
  | "cureGame"
  | "reactionLab"
  | "equationBalancer";

/** A challenge goal value: an exact number, or a range. */
export type GoalValue = number | { min?: number; max?: number };

export interface InteractiveChunk extends ChunkBase {
  type: "interactive";
  widget: WidgetName;
  title?: string;
  intro?: RichText;
  /** Starting values for the widget's controls. */
  props?: Record<string, number>;
  /** Things to try, shown under the widget (ticked by the student). */
  tasks?: RichText[];
  /** Sandbox challenges, auto-checked: solved when every key in `goal` matches the widget's state. */
  challenges?: { id: string; text: RichText; goal: Record<string, GoalValue>; xp?: number }[];
}

export type Chunk =
  | InteractiveChunk
  | TextChunk
  | CalloutChunk
  | FormulaChunk
  | WordBreakdownChunk
  | TableChunk
  | PracticeChunk
  | CheckChunk
  | ImageChunk;

// ---- Flashcards & quiz ------------------------------------------------------

export interface Flashcard {
  id: string;
  front: RichText;
  back: RichText;
  tag?: string;
  lang?: Lang;
}

/** A step in a progressive hint ladder: text, optionally with a picture. */
export type Hint = RichText | { text: RichText; visual?: Visual };

/** Static fraction pictures, usable in hints and the print cheat sheet. */
export type Visual =
  | { kind: "bar"; n: number; d: number; k?: number }
  | { kind: "pie"; n: number; d: number; k?: number }
  | { kind: "tank"; n: number; d: number }
  | { kind: "sum"; a: [number, number]; b: [number, number] }
  | { kind: "product"; a: [number, number]; b: [number, number] }
  | { kind: "triangle"; top: string; left: string; right: string }
  | { kind: "ph" };

export interface McqOption {
  text: RichText;
  correct?: true;
  why?: RichText;
}

export interface McqQuestion {
  id: string;
  type: "mcq";
  prompt: RichText;
  options: McqOption[];
  explanation?: RichText;
  hint?: RichText;
  hints?: Hint[];
  shuffle?: boolean;
  lang?: Lang;
}

export interface FillQuestion {
  id: string;
  type: "fill";
  prompt: RichText;
  answers: string[];
  match?: "text" | "number" | "fraction";
  tolerance?: number;
  /** fraction match: the answer must be in lowest terms */
  simplest?: boolean;
  /** fraction match: required way of writing it */
  form?: "any" | "mixed" | "improper";
  caseSensitive?: boolean;
  mistakes?: { answers: string[]; why: RichText }[];
  placeholder?: string;
  explanation?: RichText;
  hint?: RichText;
  hints?: Hint[];
  lang?: Lang;
}

export type Question = McqQuestion | FillQuestion;

export interface Quiz {
  passPercent?: number;
  questions: Question[];
}

export interface CheatSheet {
  title?: string;
  intro?: RichText;
  items: {
    title: string;
    tex?: string;
    body?: RichText;
    visual?: Visual;
    table?: { headers: string[]; rows: string[][] };
    /** span both columns */
    wide?: boolean;
  }[];
}

export interface Lesson {
  meta: LessonMeta;
  chunks: Chunk[];
  flashcards?: Flashcard[];
  quiz?: Quiz;
  cheatSheet?: CheatSheet;
}
