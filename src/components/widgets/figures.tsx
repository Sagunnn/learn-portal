import { useId, type CSSProperties, type ReactNode } from "react";
import type { Visual } from "../../types/content";

/*
 * Pure SVG pictures of fractions. Every size comes from the numbers passed in;
 * the SVGs use a viewBox so they scale to any width. Interactive widgets wrap
 * these; hints and the print cheat sheet use them as still pictures.
 */

export const C = {
  blue: "#3b82f6",
  blueSoft: "#bfdbfe",
  orange: "#f97316",
  orangeSoft: "#fed7aa",
  yellow: "#fde047",
  green: "#22c55e",
  ink: "#0f172a",
  line: "#334155",
  grid: "#94a3b8",
  cut: "#7c3aed",
  empty: "#ffffff",
  frame: "#e2e8f0",
};

/** Stacked fraction drawn in SVG (numerator over a bar over denominator). */
export function SvgFrac({ x, y, n, d, size = 18, color = C.ink }: { x: number; y: number; n: number | string; d: number | string; size?: number; color?: string }) {
  const digits = Math.max(String(n).length, String(d).length);
  const half = (digits * size * 0.6 + 6) / 2;
  return (
    <g fill={color} fontSize={size} fontWeight={700} textAnchor="middle" fontFamily="Inter Variable, Inter, sans-serif">
      <text x={x} y={y - 5}>{n}</text>
      <line x1={x - half} x2={x + half} y1={y} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <text x={x} y={y + size + 1}>{d}</text>
    </g>
  );
}

const cutStyle = (delayMs: number): CSSProperties => ({ animationDelay: `${delayMs}ms` });

// ---- Fraction bar ---------------------------------------------------------------

/** A bar split into d equal blocks, n shaded; each block optionally cut into k pieces. */
export function FractionBar({ n, d, k = 1, color = C.blue, title }: { n: number; d: number; k?: number; color?: string; title?: string }) {
  const W = 600;
  const H = 90;
  const pad = 3;
  const w = (W - 2 * pad) / d;
  const cuts: { x: number; key: string; delay: number }[] = [];
  for (let i = 0; i < d; i++)
    for (let j = 1; j < k; j++) cuts.push({ x: pad + (i + j / k) * w, key: `${k}-${i}-${j}`, delay: j * 60 });
  const clip = useId();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title ?? `${n * k} of ${d * k} equal pieces shaded`}>
      <clipPath id={clip}>
        <rect x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} rx={10} />
      </clipPath>
      <rect x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} rx={10} fill={C.empty} />
      {/* Full-width rect scaled to n/d: transforms animate in every browser, SVG width doesn't. */}
      <rect
        x={pad}
        y={pad}
        width={W - 2 * pad}
        height={H - 2 * pad}
        fill={color}
        fillOpacity={0.85}
        clipPath={`url(#${clip})`}
        style={{ transform: `scaleX(${Math.max(0, Math.min(1, n / d))})`, transformOrigin: `${pad}px 0px`, transition: "transform 450ms ease" }}
      />
      {cuts.map((c) => (
        <line key={c.key} className="fig-cut" style={cutStyle(c.delay)} x1={c.x} x2={c.x} y1={pad + 4} y2={H - pad - 4} stroke={C.cut} strokeWidth={2} strokeDasharray="6 5" />
      ))}
      {Array.from({ length: d - 1 }, (_, i) => (
        <line key={`b${d}-${i}`} x1={pad + (i + 1) * w} x2={pad + (i + 1) * w} y1={pad} y2={H - pad} stroke={C.line} strokeWidth={3} />
      ))}
      <rect x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} rx={10} fill="none" stroke={C.line} strokeWidth={3} />
    </svg>
  );
}

// ---- Pie ---------------------------------------------------------------------------

const polar = (cx: number, cy: number, r: number, turns: number) => {
  const a = turns * 2 * Math.PI - Math.PI / 2; // start at 12 o'clock, go clockwise
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
};

function sectorPath(cx: number, cy: number, r: number, from: number, to: number) {
  if (to - from >= 1) return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

/** A circle split into d equal sectors, n shaded; each sector optionally cut into k. */
export function FractionPie({ n, d, k = 1, color = C.blue, title }: { n: number; d: number; k?: number; color?: string; title?: string }) {
  const S = 220;
  const cx = S / 2;
  const cy = S / 2;
  const r = S / 2 - 6;
  const cuts: { t: number; key: string; delay: number }[] = [];
  for (let i = 0; i < d; i++) for (let j = 1; j < k; j++) cuts.push({ t: (i + j / k) / d, key: `${k}-${i}-${j}`, delay: j * 60 });
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="block h-auto w-full" role="img" aria-label={title ?? `circle with ${n * k} of ${d * k} slices shaded`}>
      <circle cx={cx} cy={cy} r={r} fill={C.empty} />
      {n > 0 && <path d={sectorPath(cx, cy, r, 0, n / d)} fill={color} fillOpacity={0.85} />}
      {cuts.map((c) => {
        const [x, y] = polar(cx, cy, r - 3, c.t);
        return (
          <line
            key={c.key}
            className="fig-radius"
            style={{ ...cutStyle(c.delay), transformOrigin: `${cx}px ${cy}px` }}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={C.cut}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        );
      })}
      {d > 1 &&
        Array.from({ length: d }, (_, i) => {
          const [x, y] = polar(cx, cy, r, i / d);
          return <line key={`r${d}-${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke={C.line} strokeWidth={3} />;
        })}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.line} strokeWidth={3} />
    </svg>
  );
}

// ---- Container tank (improper → mixed) ----------------------------------------------

/** n pieces poured into containers that each hold d pieces. */
export function Tank({ n, d, title }: { n: number; d: number; title?: string }) {
  const W = 640;
  const labelW = 90;
  const h = 46;
  const gap = 14;
  const slotW = (W - labelW - 10) / d;
  const containers = Math.max(1, Math.ceil(n / d));
  const H = containers * (h + gap) - gap + 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title ?? `${n} pieces in containers of ${d}`}>
      {Array.from({ length: containers }, (_, c) => {
        const y = 4 + c * (h + gap);
        const inThis = Math.min(d, Math.max(0, n - c * d));
        const full = inThis === d;
        return (
          <g key={`${d}-${c}`}>
            <rect x={4} y={y} width={W - labelW - 10} height={h} rx={10} fill={full ? "#eff6ff" : C.empty} />
            {Array.from({ length: inThis }, (_, i) => (
              <rect
                key={`${d}-${c}-${i}`}
                className="fig-drop"
                x={4 + i * slotW + 3}
                y={y + 3}
                width={slotW - 6}
                height={h - 6}
                rx={6}
                fill={full ? C.blue : C.orange}
                fillOpacity={0.9}
              />
            ))}
            {Array.from({ length: d - 1 }, (_, i) => (
              <line key={i} x1={4 + (i + 1) * slotW} x2={4 + (i + 1) * slotW} y1={y} y2={y + h} stroke={C.grid} strokeWidth={1.5} />
            ))}
            <rect x={4} y={y} width={W - labelW - 10} height={h} rx={10} fill="none" stroke={C.line} strokeWidth={2.5} />
            {full ? (
              <text x={W - labelW / 2} y={y + h / 2 + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.blue}>
                1 whole
              </text>
            ) : (
              <SvgFrac x={W - labelW / 2} y={y + h / 2 - 1} n={inThis} d={d} size={15} color={C.orange} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---- Grid merger (adding unlike denominators) -----------------------------------------

export type MergePhase = 0 | 1 | 2;

/**
 * Box A: b1 columns, a1 shaded. Box B: b2 rows, a2 shaded.
 * Phase 1 lays the other box's lines over each, so both become a b1×b2 grid.
 * Phase 2 pours both shadings into result grid(s).
 */
export function MergeGrids({ a, b, phase = 2, title }: { a: [number, number]; b: [number, number]; phase?: MergePhase; title?: string }) {
  const [a1, b1] = a;
  const [a2, b2] = b;
  const S = 210;
  const W = 560;
  const cells = b1 * b2;
  const blue = a1 * b2;
  const orange = a2 * b1;
  const total = blue + orange;
  const resultBoxes = Math.max(1, Math.ceil(total / cells));
  const top = 10;
  const row2 = top + S + 88;
  const H = phase === 2 ? row2 + S + 70 : top + S + 70;
  const ax = 22;
  const bx = W - 22 - S;
  const cw = S / b1;
  const rh = S / b2;

  const box = (x: number, y: number, children: ReactNode) => (
    <g>
      <rect x={x} y={y} width={S} height={S} fill={C.empty} />
      {children}
      <rect x={x} y={y} width={S} height={S} fill="none" stroke={C.line} strokeWidth={3} />
    </g>
  );
  const vLines = (x: number, y: number, overlay: boolean) =>
    Array.from({ length: b1 - 1 }, (_, i) => (
      <line
        key={`v${b1}-${i}-${overlay}`}
        className={overlay ? "fig-draw-y" : undefined}
        style={overlay ? cutStyle(i * 90) : undefined}
        x1={x + (i + 1) * cw}
        x2={x + (i + 1) * cw}
        y1={y}
        y2={y + S}
        stroke={overlay ? C.cut : C.line}
        strokeWidth={overlay ? 2 : 2.5}
        strokeDasharray={overlay ? "6 4" : undefined}
      />
    ));
  const hLines = (x: number, y: number, overlay: boolean) =>
    Array.from({ length: b2 - 1 }, (_, i) => (
      <line
        key={`h${b2}-${i}-${overlay}`}
        className={overlay ? "fig-draw-x" : undefined}
        style={overlay ? cutStyle(i * 90) : undefined}
        x1={x}
        x2={x + S}
        y1={y + (i + 1) * rh}
        y2={y + (i + 1) * rh}
        stroke={overlay ? C.cut : C.line}
        strokeWidth={overlay ? 2 : 2.5}
        strokeDasharray={overlay ? "6 4" : undefined}
      />
    ));

  const labelY = top + S + 36;
  const resW = resultBoxes * S + (resultBoxes - 1) * 24;
  const rx0 = (W - resW) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title ?? `adding ${a1}/${b1} and ${a2}/${b2}`}>
      {box(ax, top, <>
        <rect x={ax} y={top} width={a1 * cw} height={S} fill={C.blue} fillOpacity={0.8} />
        {vLines(ax, top, false)}
        {phase >= 1 && hLines(ax, top, true)}
      </>)}
      <text x={W / 2} y={top + S / 2 + 14} textAnchor="middle" fontSize={44} fontWeight={700} fill={C.line}>+</text>
      {box(bx, top, <>
        <rect x={bx} y={top} width={S} height={a2 * rh} fill={C.orange} fillOpacity={0.8} />
        {hLines(bx, top, false)}
        {phase >= 1 && vLines(bx, top, true)}
      </>)}
      {phase === 0 ? (
        <>
          <SvgFrac x={ax + S / 2} y={labelY} n={a1} d={b1} color={C.blue} size={22} />
          <SvgFrac x={bx + S / 2} y={labelY} n={a2} d={b2} color={C.orange} size={22} />
        </>
      ) : (
        <>
          <SvgFrac x={ax + S / 2} y={labelY} n={blue} d={cells} color={C.blue} size={22} />
          <SvgFrac x={bx + S / 2} y={labelY} n={orange} d={cells} color={C.orange} size={22} />
        </>
      )}

      {phase === 2 && (
        <g>
          <text x={W / 2} y={row2 - 22} textAnchor="middle" fontSize={34} fontWeight={700} fill={C.line}>=</text>
          {Array.from({ length: resultBoxes }, (_, r) => {
            const x0 = rx0 + r * (S + 24);
            return (
              <g key={r}>
                <rect x={x0} y={row2} width={S} height={S} fill={C.empty} />
                {Array.from({ length: cells }, (_, i) => {
                  // Column by column, so A's blue lands exactly where it was in Box A.
                  const t = r * cells + i;
                  const col = Math.floor(i / b2);
                  const row = i % b2;
                  const fill = t < blue ? C.blue : t < total ? C.orange : null;
                  return fill ? (
                    <rect
                      key={`${r}-${i}-${fill}`}
                      className="fig-pop"
                      style={{ ...cutStyle(Math.min(t, 40) * 35), transformOrigin: `${x0 + (col + 0.5) * cw}px ${row2 + (row + 0.5) * rh}px` }}
                      x={x0 + col * cw}
                      y={row2 + row * rh}
                      width={cw}
                      height={rh}
                      fill={fill}
                      fillOpacity={0.8}
                    />
                  ) : null;
                })}
                {Array.from({ length: b1 - 1 }, (_, i) => (
                  <line key={`rv${i}`} x1={x0 + (i + 1) * cw} x2={x0 + (i + 1) * cw} y1={row2} y2={row2 + S} stroke={C.grid} strokeWidth={1.5} />
                ))}
                {Array.from({ length: b2 - 1 }, (_, i) => (
                  <line key={`rh${i}`} x1={x0} x2={x0 + S} y1={row2 + (i + 1) * rh} y2={row2 + (i + 1) * rh} stroke={C.grid} strokeWidth={1.5} />
                ))}
                <rect x={x0} y={row2} width={S} height={S} fill="none" stroke={C.line} strokeWidth={3} />
                <SvgFrac x={x0 + S / 2} y={row2 + S + 32} n={Math.min(cells, total - r * cells)} d={cells} color={C.ink} size={22} />
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

// ---- Area overlap (multiplying) ----------------------------------------------------------

/** Unit square: a/b of the columns blue, c/d of the rows yellow, overlap green. */
export function OverlapGrid({ a, b, title }: { a: [number, number]; b: [number, number]; title?: string }) {
  const [n1, d1] = a;
  const [n2, d2] = b;
  const S = 320;
  const pad = 4;
  const cw = S / d1;
  const rh = S / d2;
  return (
    <svg viewBox={`0 0 ${S + 2 * pad} ${S + 2 * pad}`} className="block h-auto w-full" role="img" aria-label={title ?? `${n1 * n2} of ${d1 * d2} squares green`}>
      {Array.from({ length: d1 * d2 }, (_, i) => {
        const col = i % d1;
        const row = Math.floor(i / d1);
        const inBlue = col < n1;
        const inYellow = row < n2;
        const fill = inBlue && inYellow ? C.green : inBlue ? C.blueSoft : inYellow ? "#fef9c3" : C.empty;
        return (
          <rect
            key={`${d1}-${d2}-${i}`}
            x={pad + col * cw}
            y={pad + row * rh}
            width={cw}
            height={rh}
            style={{ fill, transition: "fill 300ms ease" }}
            stroke={C.grid}
            strokeWidth={1}
          />
        );
      })}
      {/* Outline the blue columns and the yellow rows so both stay visible under the green. */}
      {n1 > 0 && <rect x={pad} y={pad} width={n1 * cw} height={S} fill="none" stroke={C.blue} strokeWidth={4} />}
      {n2 > 0 && <rect x={pad} y={pad} width={S} height={n2 * rh} fill="none" stroke="#ca8a04" strokeWidth={4} strokeDasharray="10 6" />}
      <rect x={pad} y={pad} width={S} height={S} fill="none" stroke={C.line} strokeWidth={3} />
    </svg>
  );
}

// ---- Dispatcher for hints / cheat sheet ---------------------------------------------------

export function VisualFigure({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case "bar":
      return <FractionBar n={visual.n} d={visual.d} k={visual.k} />;
    case "pie":
      return (
        <div className="mx-auto max-w-40">
          <FractionPie n={visual.n} d={visual.d} k={visual.k} />
        </div>
      );
    case "tank":
      return <Tank n={visual.n} d={visual.d} />;
    case "sum":
      return <MergeGrids a={visual.a} b={visual.b} phase={2} />;
    case "product":
      return (
        <div className="mx-auto max-w-56">
          <OverlapGrid a={visual.a} b={visual.b} />
        </div>
      );
  }
}
