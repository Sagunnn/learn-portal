import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import FlashcardDeck from "../components/lesson/FlashcardDeck";
import LearnRunner from "../components/lesson/LearnRunner";
import QuizRunner from "../components/quiz/QuizRunner";
import { Button, LangProvider, cx, langProps } from "../components/ui/primitives";
import { getLessonEntry, getSubject, loadLesson } from "../lib/content";
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
      <div className="space-y-6">
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{entry.meta.title}</h1>
            {entry.meta.titleLocal && (
              <p lang="ne" className="lang-ne text-lg text-slate-500">
                {entry.meta.titleLocal}
              </p>
            )}
          </div>

          <div role="tablist" aria-label="Lesson sections" className="inline-flex rounded-xl bg-slate-200/70 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                lang={titleLang.lang}
                className={cx(
                  "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
                  titleLang.className,
                  tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
                )}
              >
                {t.label}
                {t.count !== undefined && <span className="ml-1.5 text-xs text-slate-400">{t.count}</span>}
              </button>
            ))}
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
