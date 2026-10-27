import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "../../ui/primitives";

/** Physics colour roles: vectors/direction indigo, scalars emerald, force/energy amber, friction rose. */
export const P = {
  vector: "#4f46e5",
  scalar: "#10b981",
  force: "#f59e0b",
  friction: "#f43f5e",
  ink: "#0f172a",
  line: "#334155",
  muted: "#94a3b8",
};

/**
 * Runs `step(dt)` every animation frame while `running` is true (dt in seconds,
 * capped so a background tab doesn't make objects teleport).
 */
export function useAnimationLoop(running: boolean, step: (dt: number) => void) {
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      stepRef.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

/** Straight SVG arrow with a triangular head. Draws nothing when shorter than 2px. */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color,
  width = 5,
  head = 14,
  glow = false,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width?: number;
  head?: number;
  glow?: boolean;
  dashed?: boolean;
}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 2) return null;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const h = Math.min(head, len * 0.6);
  const bx = x2 - ux * h;
  const by = y2 - uy * h;
  const px = -uy * h * 0.55;
  const py = ux * h * 0.55;
  return (
    <g style={glow ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? "8 6" : undefined} />
      <polygon points={`${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`} fill={color} />
    </g>
  );
}

/** A live number card: colour-coded, with the "how much / which way" question it answers. */
export function Readout({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone: "vector" | "scalar" | "force" | "friction" | "plain";
}) {
  const tones = {
    vector: "border-indigo-300 bg-indigo-50 text-indigo-900",
    scalar: "border-emerald-300 bg-emerald-50 text-emerald-900",
    force: "border-amber-300 bg-amber-50 text-amber-900",
    friction: "border-rose-300 bg-rose-50 text-rose-900",
    plain: "border-slate-200 bg-white text-slate-900",
  };
  return (
    <div className={cx("rounded-2xl border-2 border-b-4 px-3 py-2", tones[tone])}>
      <div className="text-[11px] font-extrabold uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-xl font-extrabold tabular-nums sm:text-2xl">{value}</div>
      {sub && <div className="text-xs font-semibold opacity-75">{sub}</div>}
    </div>
  );
}

/** Small 3D toggle chip (scenario tabs, surface picker). */
export function Chip({ active, onClick, children, tone = "indigo" }: { active: boolean; onClick: () => void; children: ReactNode; tone?: "indigo" | "slate" }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "rounded-2xl border-2 border-b-4 px-3 py-1.5 text-sm font-bold transition-all duration-200 ease-out active:mb-[2px] active:translate-y-[2px] active:border-b-2",
        active
          ? tone === "indigo"
            ? "border-indigo-700 bg-indigo-600 text-white"
            : "border-slate-800 bg-slate-700 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

/** A simple geometric person (no clip-art). `lean` tilts the body in degrees; `scale` < 1 for a kid. */
export function Person({ x, y, color, lean = 0, scale = 1, flip = false, shake = false }: { x: number; y: number; color: string; lean?: number; scale?: number; flip?: boolean; shake?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <g className={shake ? "phys-shake" : undefined} transform={`rotate(${lean})`}>
        <rect x={-9} y={-58} width={18} height={34} rx={8} fill={color} />
        <circle cx={0} cy={-70} r={10} fill="#fcd9b8" stroke={P.line} strokeWidth={1.5} />
        <line x1={-5} y1={-26} x2={-9} y2={0} stroke={P.line} strokeWidth={5} strokeLinecap="round" />
        <line x1={5} y1={-26} x2={9} y2={0} stroke={P.line} strokeWidth={5} strokeLinecap="round" />
        <line x1={4} y1={-50} x2={20} y2={-42} stroke={P.line} strokeWidth={4} strokeLinecap="round" />
      </g>
    </g>
  );
}

export const round1 = (v: number) => Math.round(v * 10) / 10;
export const fmt = (v: number, digits = 1) => (Math.abs(v) < 0.05 && digits === 1 ? "0.0" : v.toFixed(digits));
