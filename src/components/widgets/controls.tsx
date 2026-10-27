import { useEffect, useId, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { renderRich } from "../../lib/richText";
import { cx } from "../ui/primitives";

/** KaTeX math, inline or display. */
export function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => renderRich(display ? `$$${tex}$$` : `$${tex}$`, { inline: true }), [tex, display]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

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
  step?: number;
  onChange: (v: number) => void;
  color?: string;
  hint?: string;
}) {
  const id = useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <label htmlFor={id} className="font-semibold text-slate-700">
          {label}
        </label>
        <span className="font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={hint}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range w-full"
        style={{ "--thumb": color, background: `linear-gradient(to right, ${color} ${pct}%, #e2e8f0 ${pct}%)` } as CSSProperties}
      />
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
    "grid size-10 place-items-center rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-700 shadow-[0_2px_0_0_rgb(226_232_240)] transition hover:bg-slate-50 active:translate-y-px active:shadow-none disabled:opacity-30";
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>
        −
      </button>
      <output className="w-10 text-center text-2xl font-bold tabular-nums" style={{ color }} aria-live="polite">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
        +
      </button>
    </div>
  );
}

/** Big equation strip under a visual. */
export function EquationBar({ tex, children, className }: { tex: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl bg-slate-900 px-4 py-4 text-center text-white [&_.katex]:text-white", className)}>
      <div className="overflow-x-auto text-sm sm:text-2xl" aria-live="polite">
        <Tex tex={tex} display />
      </div>
      {children && <div className="mt-1 text-sm text-slate-300">{children}</div>}
    </div>
  );
}

export function WidgetPanel({ children }: { children: ReactNode }) {
  return <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">{children}</div>;
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
