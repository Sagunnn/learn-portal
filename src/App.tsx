import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import AppHeader from "./components/AppHeader";
import Dashboard from "./pages/Dashboard";
import SubjectPage from "./pages/SubjectPage";
import LessonPage from "./pages/LessonPage";
import NotFound from "./pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  // Braces matter: newer browsers return a Promise from scrollTo, and React would
  // try to call a returned value as the effect's cleanup and crash on navigation.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="min-h-dvh">
      <ScrollToTop />
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 print:max-w-none print:p-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subject/:subjectId" element={<SubjectPage />} />
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
