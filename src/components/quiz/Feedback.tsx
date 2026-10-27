import { useState, type ReactNode } from "react";
import type { RichText } from "../../types/content";
import { Rich, useLang } from "../ui/primitives";

/** Speech-bubble "tooltip" attached under a wrong answer. Inline (not floating) so it never clips on phones. */
export function WhyBubble({ id, children, title }: { id?: string; children: ReactNode; title?: string }) {
  const lang = useLang();
  return (
    <div
      id={id}
      role="status"
      className="relative mt-2 animate-rise rounded-xl bg-slate-900 px-4 py-3 text-sm text-slate-100 shadow-lg before:absolute before:-top-1.5 before:left-6 before:size-3 before:rotate-45 before:bg-slate-900"
    >
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-rose-300">
        {title ?? (lang === "ne" ? "किन मिलेन?" : "Why not?")}
      </div>
      <div className="[&_strong]:text-white [&_mark]:bg-amber-300/90">{children}</div>
    </div>
  );
}

const PRAISE_EN = ["Correct!", "Nice!", "Exactly right!", "Spot on!"];
const PRAISE_NE = ["सही!", "स्याबास!", "एकदम ठीक!"];

export function Feedback({ firstTry, explanation, review, revealed }: {
  firstTry: boolean;
  explanation?: RichText;
  review?: boolean;
  revealed?: boolean;
}) {
  const lang = useLang();
  const [roll] = useState(() => Math.floor(Math.random() * 12));
  const praise = lang === "ne" ? PRAISE_NE : PRAISE_EN;
  const heading = review
    ? lang === "ne" ? "उत्तर" : "Answer"
    : revealed
      ? lang === "ne" ? "सही उत्तर यो हो" : "Here's the answer"
      : firstTry
        ? praise[roll % praise.length]
        : lang === "ne" ? "अब मिल्यो!" : "Got it now!";
  return (
    <div role="status" className="animate-rise rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex items-center gap-2 font-bold text-emerald-800">
        <span aria-hidden>{revealed ? "📘" : "🎉"}</span> {heading}
      </div>
      {explanation && <Rich text={explanation} className="mt-1 text-slate-700" />}
    </div>
  );
}
