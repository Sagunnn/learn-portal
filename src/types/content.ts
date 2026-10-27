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

export type Chunk =
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
  shuffle?: boolean;
  lang?: Lang;
}

export interface FillQuestion {
  id: string;
  type: "fill";
  prompt: RichText;
  answers: string[];
  match?: "text" | "number";
  tolerance?: number;
  caseSensitive?: boolean;
  mistakes?: { answers: string[]; why: RichText }[];
  placeholder?: string;
  explanation?: RichText;
  hint?: RichText;
  lang?: Lang;
}

export type Question = McqQuestion | FillQuestion;

export interface Quiz {
  passPercent?: number;
  questions: Question[];
}

export interface Lesson {
  meta: LessonMeta;
  chunks: Chunk[];
  flashcards?: Flashcard[];
  quiz?: Quiz;
}
