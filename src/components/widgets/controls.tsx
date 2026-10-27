import { useEffect, useId, useMemo, useRef, type ReactNode } from "react";
import { renderRich } from "../../lib/richText";
import { cx } from "../ui/primitives";

/** KaTeX math, inline or display. */
export function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => renderRich(display ? `$$${tex}$$` : `$${tex}$`, { inline: true }), [tex, display]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Repeats `fn` while a button is held (first after 380 ms, then every 90 ms). */
function useHoldRepeat(fn: () => void) {
  const timer = useRef<number | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      fnRef.current();
      const loop = (delay: number) => {
        timer.current = window.setTimeout(() => {
          fnRef.current();
          loop(90);
        }, delay);
      };
      loop(380);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fnRef.current();
      }
    },
  };
}

/**
 * Big arcade stepper: [ − ]  value  [ + ] (hold to repeat), with optional preset pills.
 * Replaces fiddly range sliders. A thin bar under the value shows where it sits in its range.
 */
export function Slider({
  label,
  value,
  min,
  max,
  onChange,
  color = "#4f46e5",
  hint,
  step = 1,
  unit,
  presets,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
  hint?: string;
  step?: number;
  unit?: string;
  presets?: { label: ReactNode; value: number }[];
}) {
  const id = useId();
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 1000) / 1000));
  const valueRef = useRef(value);
  valueRef.current = value;
  const down = useHoldRepeat(() => onChange(clamp(valueRef.current - step)));
  const up = useHoldRepeat(() => onChange(clamp(valueRef.current + step)));
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const btn =
    "grid size-14 shrink-0 select-none place-items-center rounded-2xl border-2 border-b-4 border-slate-200 bg-white text-3xl font-black text-slate-700 transition-all duration-100 hover:bg-slate-50 active:mb-[3px] active:translate-y-[3px] active:border-b-2 disabled:opacity-30 touch-manipulation";
  return (
    <div role="group" aria-labelledby={id}>
      <div id={id} className="mb-2 font-display text-base font-semibold text-slate-700">
        {label}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} {...down} disabled={value <= min} aria-label="Decrease">
          −
        </button>
        <div className="min-w-0 flex-1 text-center">
          <output className="block font-display text-4xl font-semibold tabular-nums leading-none" style={{ color }} aria-live="polite" aria-label={hint}>
            {value > 0 && min < 0 ? "+" : ""}
            {value}
            {unit && <span className="ml-1 text-lg text-slate-400">{unit}</span>}
          </output>
          <div className="mx-auto mt-2 h-2 max-w-48 overflow-hidden rounded-full bg-slate-100" aria-hidden>
            <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
        <button type="button" className={btn} {...up} disabled={value >= max} aria-label="Increase">
          +
        </button>
      </div>
      {presets && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {presets.map((p, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={value === p.value}
              onClick={() => onChange(clamp(p.value))}
              className={cx(
                "min-h-[44px] rounded-full border-2 border-b-4 px-4 font-display text-base font-semibold transition-all active:mb-[2px] active:translate-y-[2px] active:border-b-2",
                value === p.value ? "border-indigo-700 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A value pill drawn inside an SVG, e.g. "50 N →" on an arrow. */
export function SvgPill({
  x,
  y,
  text,
  fill = "#ffffff",
  color = "#0f172a",
  stroke = "#cbd5e1",
  size = 15,
  anchor = "middle",
}: {
  x: number;
  y: number;
  text: string;
  fill?: string;
  color?: string;
  stroke?: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
}) {
  const w = text.length * size * 0.58 + 22;
  const h = size + 14;
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return (
    <g style={{ transition: "transform 200ms" }}>
      <rect x={left} y={y - h / 2} width={w} height={h} rx={h / 2} fill={fill} stroke={stroke} strokeWidth={2} />
      <text x={left + w / 2} y={y + size * 0.36} textAnchor="middle" fontSize={size} fontWeight={800} fill={color} fontFamily="Fredoka Variable, Nunito Variable, sans-serif">
        {text}
      </text>
    </g>
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
