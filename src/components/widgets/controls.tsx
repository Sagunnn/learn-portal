import { useEffect, useId, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { renderRich } from "../../lib/richText";
import { cx } from "../ui/primitives";

/** KaTeX math, inline or display. */
export function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => renderRich(display ? `$$${tex}$$` : `$${tex}$`, { inline: true }), [tex, display]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Chunky slider: a big round thumb, with [−] and [+] arcade buttons either side. */
export function Slider({
  label,
  value,
  min,
  max,
  onChange,
  color = "#4f46e5",
  hint,
  step = 1,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
  hint?: string;
  step?: number;
}) {
  const id = useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const nudge = (d: number) => onChange(Math.min(max, Math.max(min, Math.round((value + d * step) * 1000) / 1000)));
  const btn =
    "grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-b-4 border-slate-200 bg-white text-2xl font-black text-slate-700 transition-all duration-150 hover:bg-slate-50 active:mb-[3px] active:translate-y-[3px] active:border-b-2 disabled:opacity-30";
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-display text-base font-semibold text-slate-700">
          {label}
        </label>
        <span className="font-display text-2xl font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} onClick={() => nudge(-1)} disabled={value <= min} aria-label="Decrease">
          −
        </button>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={hint}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range min-w-0 flex-1"
          style={{ "--thumb": color, background: `linear-gradient(to right, ${color} ${pct}%, #e2e8f0 ${pct}%)` } as CSSProperties}
        />
        <button type="button" className={btn} onClick={() => nudge(1)} disabled={value >= max} aria-label="Increase">
          +
        </button>
      </div>
    </div>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  color = "#0f172a",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  const btn =
    "grid size-12 place-items-center rounded-2xl border-2 border-b-4 border-slate-200 bg-white text-2xl font-black text-slate-700 transition-all duration-150 hover:bg-slate-50 active:mb-[3px] active:translate-y-[3px] active:border-b-2 disabled:opacity-30";
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-base font-semibold text-slate-700">{label}</span>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>
        −
      </button>
      <output className="w-12 text-center font-display text-3xl font-bold tabular-nums" style={{ color }} aria-live="polite">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
        +
      </button>
    </div>
  );
}

/** Big equation strip under a visual. */
/** The one formula line under a drawing, on a calm sage panel. */
export function EquationBar({ tex, children, className }: { tex: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-3xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-slate-800", className)}>
      <div className="overflow-x-auto text-base sm:text-xl" aria-live="polite">
        <Tex tex={tex} display />
      </div>
      {children && <div className="mt-1 text-base font-semibold text-slate-600">{children}</div>}
    </div>
  );
}

export function WidgetPanel({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

/**
 * ONE big colour-coded badge above a drawing, instead of tables of numbers.
 * Each part is a coloured pill: { icon, label, value, tone }.
 */
export function StatBadge({ parts }: { parts: { icon?: string; label: string; value: ReactNode; tone: "sage" | "periwinkle" | "honey" | "coral" | "brick" | "plain" }[] }) {
  const tones = {
    sage: "bg-emerald-100 text-emerald-800",
    periwinkle: "bg-violet-100 text-violet-800",
    honey: "bg-amber-100 text-amber-900",
    coral: "bg-indigo-100 text-indigo-900",
    brick: "bg-rose-100 text-rose-800",
    plain: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="flex flex-wrap items-stretch justify-center gap-2 rounded-3xl border-2 border-slate-200 bg-white p-2" aria-live="polite">
      {parts.map((p, i) => (
        <div key={i} className={cx("flex items-center gap-2 rounded-2xl px-4 py-2", tones[p.tone])}>
          {p.icon && (
            <span aria-hidden className="text-xl">
              {p.icon}
            </span>
          )}
          <span className="text-base font-bold opacity-80">{p.label}</span>
          <span className="font-display text-xl font-bold tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export type WidgetState = Record<string, number>;

/**
 * Reports a widget's state to its chunk (for auto-checked challenges) whenever it
 * changes. The starting state isn't reported until the student changes something.
 */
export function useReportState(state: WidgetState, onState?: (s: WidgetState) => void) {
  const key = JSON.stringify(state);
  const initial = useRef(key);
  const changed = useRef(false);
  useEffect(() => {
    if (!changed.current && key === initial.current) return;
    changed.current = true;
    onState?.(JSON.parse(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
