import { Fragment, useId, type ReactNode } from "react";

/**
 * Chemical formulas with real subscripts. "2H2SO4" → 2H₂SO₄ (a leading number is
 * the coefficient, other digits are subscripts); a trailing + or − is a charge.
 */
function tokens(formula: string) {
  const m = /^(\d*)(.*?)([+-]?)$/.exec(formula)!;
  const [, coef, body, charge] = m;
  const parts: { text: string; sub: boolean }[] = [];
  for (const t of body.match(/\d+|[^\d]+/g) ?? []) parts.push({ text: t, sub: /^\d+$/.test(t) });
  return { coef, parts, charge };
}

/** HTML formula. */
export function Chem({ f, className }: { f: string; className?: string }) {
  const { coef, parts, charge } = tokens(f);
  return (
    <span className={className}>
      {coef}
      {parts.map((p, i) => (p.sub ? <sub key={i}>{p.text}</sub> : <Fragment key={i}>{p.text}</Fragment>))}
      {charge && <sup>{charge === "-" ? "−" : "+"}</sup>}
    </span>
  );
}

/** SVG <text> children for a formula (use inside <text>). */
export function ChemSvg({ f }: { f: string }) {
  const { coef, parts, charge } = tokens(f);
  return (
    <>
      {coef}
      {parts.map((p, i) =>
        p.sub ? (
          <tspan key={i} baselineShift="sub" fontSize="70%">
            {p.text}
          </tspan>
        ) : (
          <tspan key={i}>{p.text}</tspan>
        ),
      )}
      {charge && (
        <tspan baselineShift="super" fontSize="70%">
          {charge === "-" ? "−" : "+"}
        </tspan>
      )}
    </>
  );
}

/** KaTeX for a formula, with an optional state symbol: tex("H2SO4", "aq") → H₂SO₄₍aq₎. */
export function tex(formula: string, state?: "aq" | "l" | "s" | "g" | "up" | "down") {
  const { coef, parts, charge } = tokens(formula);
  let out = coef;
  for (const p of parts) out += p.sub ? `_{${p.text}}` : `\\text{${p.text}}`;
  if (charge) out += `^{${charge === "-" ? "-" : "+"}}`;
  if (state === "up") return out + "\\uparrow";
  if (state === "down") return out + "\\downarrow";
  if (state) out += `{}_{(\\text{${state}})}`;
  return out;
}

// ---- Universal indicator colours -------------------------------------------------

const UI_STOPS: [number, [number, number, number]][] = [
  [0, [185, 28, 28]],
  [1, [220, 38, 38]],
  [3, [249, 115, 22]],
  [4.5, [245, 158, 11]],
  [5.5, [250, 204, 21]],
  [6.4, [163, 230, 53]],
  [7, [16, 185, 129]],
  [8, [20, 184, 166]],
  [9, [59, 130, 246]],
  [10.5, [79, 70, 229]],
  [12, [124, 58, 237]],
  [14, [107, 33, 168]],
];

/** Universal indicator colour for a pH (red → orange → yellow → green 7 → blue → purple). */
export function uiColor(ph: number): string {
  const p = Math.max(0, Math.min(14, ph));
  for (let i = 1; i < UI_STOPS.length; i++) {
    const [p1, c1] = UI_STOPS[i];
    const [p0, c0] = UI_STOPS[i - 1];
    if (p <= p1) {
      const t = (p - p0) / (p1 - p0);
      const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return "rgb(107, 33, 168)";
}

export const phKind = (ph: number) => (ph < 6.95 ? "acid" : ph > 7.05 ? "base" : "neutral");

/** A glass beaker/tube outline with a liquid whose colour fades (700 ms) and level animates. */
export function Vessel({
  x,
  y,
  w,
  h,
  level,
  color,
  opacity = 0.85,
  kind = "beaker",
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1 of the height */
  level: number;
  color: string;
  opacity?: number;
  kind?: "beaker" | "tube" | "flask";
  children?: ReactNode;
}) {
  const lh = Math.max(0, Math.min(1, level)) * (h - 6);
  const glass =
    kind === "tube"
      ? `M${x} ${y} V${y + h - w / 2} a${w / 2} ${w / 2} 0 0 0 ${w} 0 V${y}`
      : kind === "flask"
        ? `M${x + w * 0.38} ${y} V${y + h * 0.35} L${x} ${y + h - 6} Q${x} ${y + h} ${x + 6} ${y + h} H${x + w - 6} Q${x + w} ${y + h} ${x + w} ${y + h - 6} L${x + w * 0.62} ${y + h * 0.35} V${y}`
        : `M${x} ${y} V${y + h - 8} Q${x} ${y + h} ${x + 8} ${y + h} H${x + w - 8} Q${x + w} ${y + h} ${x + w} ${y + h - 8} V${y}`;
  // Stable per mounted vessel: Safari doesn't re-resolve a clip-path whose id changes.
  const clipId = "vessel" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <g>
      <clipPath id={clipId}>
        <path d={glass + " Z"} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect x={x - 2} y={y} width={w + 4} height={h} fill="#f8fafc" opacity={0.5} />
        <rect
          x={x - 2}
          y={y + h - lh}
          width={w + 4}
          height={lh + 2}
          style={{ fill: color, opacity, transition: "fill 700ms ease, y 500ms ease, height 500ms ease, opacity 700ms ease" }}
        />
        {children}
      </g>
      <path d={glass} fill="none" stroke="#475569" strokeWidth={3} strokeLinejoin="round" />
      <path d={`M${x + 5} ${y + 8} v${h * 0.5}`} stroke="white" strokeWidth={3} opacity={0.6} strokeLinecap="round" />
    </g>
  );
}

/** Rising bubbles inside a liquid (pure CSS keyframes). */
export function Bubbles({ x, y, w, h, count = 10, size = 4, fast = false, color = "white" }: { x: number; y: number; w: number; h: number; count?: number; size?: number; fast?: boolean; color?: string }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const bx = x + ((i * 37) % 100) / 100 * w;
        const delay = ((i * 53) % 100) / 100;
        const dur = (fast ? 0.9 : 1.8) + ((i * 29) % 10) / 10;
        return (
          <circle
            key={i}
            className="chem-bubble"
            cx={bx}
            cy={y + h}
            r={size * (0.6 + ((i * 17) % 10) / 20)}
            fill={color}
            fillOpacity={0.75}
            stroke="white"
            strokeWidth={1}
            style={{ animationDuration: `${dur}s`, animationDelay: `${delay * dur}s`, ["--rise" as string]: `${-h}px` }}
          />
        );
      })}
    </g>
  );
}
