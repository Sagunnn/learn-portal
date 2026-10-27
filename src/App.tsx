import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import AppHeader from "./components/AppHeader";
import Dashboard from "./pages/Dashboard";
import SubjectPage from "./pages/SubjectPage";
import LessonPage from "./pages/LessonPage";
import NotFound from "./pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="min-h-dvh">
      <ScrollToTop />
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 print:max-w-none print:p-0">
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
