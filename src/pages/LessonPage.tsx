import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import FlashcardDeck from "../components/lesson/FlashcardDeck";
import PrintSheet from "../components/lesson/PrintSheet";
import LearnRunner from "../components/lesson/LearnRunner";
import QuizRunner from "../components/quiz/QuizRunner";
import { Button, LangProvider, cx, langProps } from "../components/ui/primitives";
import { getLessonEntry, getSubject, loadLesson } from "../lib/content";
import { hud, type HudSection } from "../lib/hud";
import { progress } from "../lib/progress";
import { themeFor } from "../lib/theme";
import type { Lesson } from "../types/content";
import NotFound from "./NotFound";

type Tab = "learn" | "cards" | "quiz";

export default function LessonPage() {
  const { lessonId = "" } = useParams();
  const entry = getLessonEntry(lessonId);
  const [params, setParams] = useSearchParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!entry) return;
    let alive = true;
    setLesson(null);
    setError(null);
    loadLesson(lessonId)
      .then((l) => alive && setLesson(l))
      .catch((e: Error) => alive && setError(e.message));
    progress.touchLesson(lessonId);
    return () => {
      alive = false;
    };
  }, [lessonId, entry, retry]);

  // Section badges in the header HUD: one per interactive module, then Cards and Quiz.
  useEffect(() => {
    if (!lesson) return;
    const sections: HudSection[] = [];
    lesson.chunks.forEach((c, i) => {
      if (c.type === "interactive") {
        const n = sections.length + 1;
        sections.push({ id: `m${i}`, label: c.title ?? `Module ${n}`, icon: String(n), kind: "module", chunkIndex: i });
      }
    });
    if (!sections.length) sections.push({ id: "learn", label: "Learn", icon: "📖", kind: "learn" });
    if (lesson.flashcards?.length) sections.push({ id: "cards", label: "All flashcards known", icon: "🃏", kind: "cards" });
    if (lesson.quiz) sections.push({ id: "quiz", label: "Quiz passed", icon: "★", kind: "quiz" });
    hud.set({
      lessonId: lesson.meta.id,
      sections,
      passPercent: lesson.quiz?.passPercent ?? 70,
      cardIds: lesson.flashcards?.map((c) => c.id) ?? [],
    });
    return () => hud.set(null);
  }, [lesson]);

  useEffect(() => {
    if (entry) document.title = `${entry.meta.title} · Kakshya 7`;
    return () => {
      document.title = "Kakshya 7 · Learn";
    };
  }, [entry]);

  if (!entry) return <NotFound message="That lesson doesn't exist (yet)." />;

  const subject = getSubject(entry.meta.subject);
  const theme = themeFor(subject?.theme);
  const lang = entry.meta.lang ?? "en";
  const ne = lang === "ne";

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "learn", label: ne ? "पढौँ" : "Learn" },
    ...(entry.counts.flashcards ? [{ id: "cards" as Tab, label: ne ? "फ्ल्यासकार्ड" : "Flashcards", count: entry.counts.flashcards }] : []),
    ...(entry.counts.questions ? [{ id: "quiz" as Tab, label: ne ? "क्विज" : "Quiz", count: entry.counts.questions }] : []),
  ];
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = tabs.some((t) => t.id === requested) ? requested! : "learn";
  const setTab = (t: Tab) => {
    setParams(t === "learn" ? {} : { tab: t }, { replace: true });
    window.scrollTo({ top: 0 });
  };
  const titleLang = langProps(lang);

  return (
    <LangProvider value={lang}>
      {lesson?.cheatSheet && <PrintSheet sheet={lesson.cheatSheet} title={entry.meta.title} subject={subject?.name} />}
      <div className="space-y-6 print:hidden">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Link to="/" className="hover:text-slate-800">
            Dashboard
          </Link>
          <span aria-hidden>/</span>
          {subject && (
            <Link to={`/subject/${subject.id}`} className={cx("hover:underline", theme.text)}>
              {subject.icon} {subject.name}
            </Link>
          )}
        </nav>

        <header className="space-y-4">
          <div>
            <p className={cx("text-sm font-bold uppercase tracking-wider", theme.text)}>
              {ne ? "पाठ" : "Chapter"} {entry.meta.chapter}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{entry.meta.title}</h1>
            {entry.meta.titleLocal && (
              <p lang="ne" className="lang-ne text-lg text-slate-500">
                {entry.meta.titleLocal}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Lesson sections" className="inline-flex gap-1 rounded-2xl border-2 border-slate-200 bg-slate-100 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                lang={titleLang.lang}
                className={cx(
                  "rounded-xl border-b-4 px-4 py-1.5 text-sm font-bold transition-all duration-200 ease-out active:mb-1 active:translate-y-1 active:border-b-0",
                  titleLang.className,
                  tab === t.id ? "border-indigo-800 bg-indigo-600 text-white" : "border-transparent text-slate-600 hover:bg-white hover:text-slate-900",
                )}
              >
                {t.label}
                {t.count !== undefined && <span className={cx("ml-1.5 text-xs", tab === t.id ? "text-indigo-200" : "text-slate-400")}>{t.count}</span>}
              </button>
            ))}
          </div>
          {lesson?.cheatSheet && (
            <Button variant="secondary" size="sm" onClick={() => window.print()} title="Print a one-page formula and picture summary">
              🖨 {ne ? "एक पाने सारांश प्रिन्ट" : "Print 1-page summary"}
            </Button>
          )}
          </div>
        </header>

        <section role="tabpanel">
          {error ? (
            <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
              <p className="font-semibold text-rose-800">Couldn't load this lesson.</p>
              <p className="mt-1 text-sm text-rose-700">{error}</p>
              <Button className="mt-4" onClick={() => setRetry((r) => r + 1)}>
                Try again
              </Button>
            </div>
          ) : !lesson ? (
            <LessonSkeleton />
          ) : tab === "learn" ? (
            <LearnRunner
              key={lesson.meta.id}
              lesson={lesson}
              onCards={lesson.flashcards?.length ? () => setTab("cards") : undefined}
              onQuiz={lesson.quiz ? () => setTab("quiz") : undefined}
            />
          ) : tab === "cards" && lesson.flashcards ? (
            <FlashcardDeck
              key={lesson.meta.id}
              lessonId={lesson.meta.id}
              cards={lesson.flashcards}
              onQuiz={lesson.quiz ? () => setTab("quiz") : undefined}
            />
          ) : tab === "quiz" && lesson.quiz ? (
            <QuizRunner
              key={lesson.meta.id}
              lessonId={lesson.meta.id}
              quiz={lesson.quiz}
              onReviewCards={lesson.flashcards?.length ? () => setTab("cards") : undefined}
            />
          ) : null}
        </section>
      </div>
    </LangProvider>
  );
}

function LessonSkeleton() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-4" aria-label="Loading lesson">
      <div className="h-2.5 rounded-full bg-slate-200" />
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="h-6 w-1/2 rounded bg-slate-200" />
        <div className="h-4 rounded bg-slate-100" />
        <div className="h-4 w-5/6 rounded bg-slate-100" />
        <div className="h-4 w-2/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}
