import type { ReactNode } from "react";
import { cx } from "./primitives";

/** Tara, the coach: a small geometric bot. Blinks; no clip-art. */
export function Mascot({ size = 52, mood = "happy", className }: { size?: number; mood?: "happy" | "cheer" | "think"; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={cx("shrink-0 animate-breathe", className)} aria-hidden>
      <defs>
        <linearGradient id="tara-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <line x1="24" y1="7" x2="24" y2="11" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="24.00,0.40 25.06,3.14 27.99,3.30 25.71,5.16 26.47,8.00 24.00,6.40 21.53,8.00 22.29,5.16 20.01,3.30 22.94,3.14" fill="#fbbf24" />
      <rect x="4" y="10" width="40" height="34" rx="13" fill="url(#tara-g)" />
      <rect x="4" y="38" width="40" height="6" rx="3" fill="#4338ca" opacity="0.45" />
      <circle cx="11" cy="31" r="3" fill="#c4b5fd" />
      <circle cx="37" cy="31" r="3" fill="#c4b5fd" />
      <g className="tara-eyes">
        <ellipse cx="17" cy="25" rx="4.2" ry={mood === "think" ? 3 : 5} fill="white" />
        <ellipse cx="31" cy="25" rx="4.2" ry={mood === "think" ? 3 : 5} fill="white" />
        <circle cx={mood === "think" ? 19 : 18} cy={mood === "think" ? 24 : 26} r="2.1" fill="#1e1b4b" />
        <circle cx={mood === "think" ? 33 : 32} cy={mood === "think" ? 24 : 26} r="2.1" fill="#1e1b4b" />
      </g>
      {mood === "cheer" ? (
        <path d="M17 33 q7 7 14 0 z" fill="white" />
      ) : mood === "think" ? (
        <path d="M19 35 h10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M18 33 q6 5 12 0" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** The coach on the left, speech bubbles on the right. The newest bubble animates in. */
export function Coach({ children, mood, className }: { children: ReactNode; mood?: "happy" | "cheer" | "think"; className?: string }) {
  return (
    <div className={cx("flex items-start gap-3", className)}>
      <div className="sticky top-20 pt-1">
        <Mascot mood={mood} />
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">{children}</div>
    </div>
  );
}

export function Bubble({ children, tone = "plain", isNew = false }: { children: ReactNode; tone?: "plain" | "indigo"; isNew?: boolean }) {
  return (
    <div
      className={cx(
        "relative w-fit max-w-full rounded-3xl rounded-tl-md border-2 px-5 py-3.5 text-lg font-semibold leading-relaxed",
        tone === "indigo" ? "border-indigo-100 bg-indigo-50 text-slate-800" : "border-slate-200 bg-white text-slate-800",
        isNew && "animate-bubble",
      )}
    >
      {children}
    </div>
  );
}
