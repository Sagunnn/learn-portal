import { createContext, useContext, useId, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { renderRich } from "../../lib/richText";
import type { Lang, RichText } from "../../types/content";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

// ---- Language context: chunks inherit the lesson's language ---------------

const LangContext = createContext<Lang>("en");
export const LangProvider = LangContext.Provider;
export const useLang = () => useContext(LangContext);

export function langProps(lang: Lang | undefined) {
  return lang === "ne" ? { lang: "ne", className: "lang-ne" } : { className: "" };
}

// ---- Rich text ---------------------------------------------------------------

export function Rich({
  text,
  inline = false,
  lang,
  className,
}: {
  text: RichText;
  inline?: boolean;
  lang?: Lang;
  className?: string;
}) {
  const inherited = useLang();
  const key = Array.isArray(text) ? text.join("\n") : text;
  const html = useMemo(() => renderRich(key, { inline }), [key, inline]);
  const l = langProps(lang ?? inherited);
  const Tag = inline ? "span" : "div";
  return (
    <Tag lang={l.lang} className={cx(!inline && "rich", l.className, className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

// ---- Buttons -------------------------------------------------------------------

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger" | "energy" | "custom";

// Colour roles: indigo = direction/primary, emerald = success, amber = energy, rose = opposing.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white border-indigo-800 hover:bg-indigo-500",
  success: "bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-400",
  danger: "bg-rose-500 text-white border-rose-700 hover:bg-rose-400",
  energy: "bg-amber-400 text-amber-950 border-amber-600 hover:bg-amber-300",
  secondary: "border-2 bg-white text-slate-700 border-slate-200 border-b-slate-300 hover:bg-slate-50",
  ghost: "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  custom: "",
};

/**
 * Tactile "3D push" button: a chunky bottom edge that squashes on click
 * (border-b-4 → 0, moved down 4px; the bottom margin keeps the layout still).
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  const flat = variant === "ghost";
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 rounded-2xl font-display font-semibold tracking-wide transition-all duration-200 ease-out",
        !flat && "border-b-4 active:mb-1 active:translate-y-1 active:border-b-0",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "sm" && "min-h-[44px] px-4 py-2 text-base",
        size === "md" && "min-h-[56px] px-6 py-3 text-lg",
        size === "lg" && "min-h-[60px] px-8 py-3.5 text-xl",
        VARIANTS[variant],
        className,
      )}
    />
  );
}

// ---- Progress bar -------------------------------------------------------------

export function ProgressBar({
  value,
  max = 1,
  barClass = "bg-indigo-500",
  className,
  label,
}: {
  value: number;
  max?: number;
  barClass?: string;
  className?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cx("h-3 w-full overflow-hidden rounded-full bg-slate-200", className)}
    >
      <div className={cx("h-full rounded-full transition-[width] duration-500 ease-out", barClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---- Accordion -----------------------------------------------------------------

export function Accordion({
  title,
  icon,
  children,
  tone = "slate",
  defaultOpen = false,
  onToggle,
}: {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  tone?: "slate" | "amber" | "emerald";
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const tones = {
    slate: "border-slate-200 bg-white",
    amber: "border-amber-200 bg-amber-50/60",
    emerald: "border-emerald-200 bg-emerald-50/60",
  };
  return (
    <div className={cx("rounded-2xl border-2", tones[tone])}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen(!open);
          onToggle?.(!open);
        }}
        className="flex min-h-[52px] w-full items-center gap-2 rounded-2xl px-4 py-3 text-left font-display text-lg font-semibold text-slate-800"
      >
        {icon && <span aria-hidden>{icon}</span>}
        <span className="flex-1">{title}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={cx("size-5 text-slate-400 transition-transform", open && "rotate-180")}
          fill="currentColor"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
        </svg>
      </button>
      <div id={id} className={cx("grid transition-[grid-template-rows] duration-300", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden" inert={!open}>
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ---- Misc -------------------------------------------------------------------------

/** Warm white card with a sand border and a soft, diffused shadow. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-3xl border-2 border-slate-200 bg-white shadow-cozy", className)}>{children}</div>;
}

export function ProgressRing({ value, max, size = 56, stroke = 6, className, children }: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className={cx("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-slate-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={cx("fill-none transition-[stroke-dashoffset] duration-700", pct >= 1 ? "stroke-emerald-500" : "stroke-amber-400")}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
