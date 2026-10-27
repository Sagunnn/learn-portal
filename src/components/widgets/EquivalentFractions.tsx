import { useState } from "react";
import { gcd, simplify } from "../../lib/fraction";
import { EquationBar, Slider, WidgetPanel, useReportState, type WidgetState } from "./controls";
import { C, FractionPie, SvgFrac } from "./figures";

/**
 * Module 1 — "Knife & Glue", by direct touch:
 *  tap pieces to shade them · ✂️ cuts every piece into one more slice (they pop apart)
 *  · 🧴 glues back to simplest form. The shaded amount never changes.
 */
const W = 640;
const H = 150;
const BAR_X = 70;
const BAR_W = 500;
const BAR_Y = 34;
const BAR_H = 84;

export default function EquivalentFractions({ a: a0 = 2, b: b0 = 3, k: k0 = 1, onState }: { a?: number; b?: number; k?: number; onState?: (s: WidgetState) => void }) {
  const [b, setB] = useState(clamp(b0, 1, 10));
  const [a, setA] = useState(clamp(a0, 0, b0));
  const [k, setK] = useState(clamp(k0, 1, 6));
  const [cutKey, setCutKey] = useState(0);
  const [glued, setGlued] = useState(false);

  const top = a * k;
  const bottom = b * k;
  const g = gcd(top || bottom, bottom);
  useReportState({ a, b, k, top, bottom }, onState);

  const cut = () => {
    if (k >= 6) return;
    setK(k + 1);
    setCutKey((c) => c + 1);
    setGlued(false);
  };
  const glue = () => {
    if (top === 0 || g <= 1) return;
    const [n, d] = simplify(top, bottom);
    setA(n);
    setB(d);
    setK(1);
    setGlued(true);
  };
  const tapPiece = (block: number) => {
    // tap a block to shade up to it; tap the last shaded block again to un-shade it
    setA(a === block + 1 ? block : block + 1);
    setGlued(false);
  };

  // Pieces pop apart a little once they're cut.
  const total = bottom;
  const gap = k > 1 ? 5 : 0;
  const blockGap = k > 1 ? 9 : 0;
  const pieceW = (BAR_W - gap * (total - 1) - (blockGap - gap) * (b - 1)) / total;
  const pieceX = (i: number) => BAR_X + i * (pieceW + gap) + Math.floor(i / k) * (blockGap - gap);
  const shadedEnd = top > 0 ? pieceX(top - 1) + pieceW : BAR_X;
  const labelX = Math.max(BAR_X + 34, (BAR_X + shadedEnd) / 2);

  const tex =
    k === 1 ? `\\dfrac{${a}}{${b}}` : `\\dfrac{${a}}{${b}} = \\dfrac{${a} \\times ${k}}{${b} \\times ${k}} = \\dfrac{${top}}{${bottom}}`;
  const pct = b ? Math.round((a / b) * 1000) / 10 : 0;

  return (
    <WidgetPanel>
      <div className="rounded-3xl border border-slate-200 bg-white p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="img" aria-label={`${top} of ${bottom} pieces shaded`}>
          {/* pieces: tap to shade */}
          <g data-start>
            {Array.from({ length: total }, (_, i) => {
              const block = Math.floor(i / k);
              const shaded = i < top;
              return (
                <rect
                  key={`${b}-${k}-${i}`}
                  role="button"
                  aria-label={`Shade ${block + 1} of ${b}`}
                  onClick={() => tapPiece(block)}
                  x={0}
                  y={BAR_Y}
                  width={Math.max(2, pieceW)}
                  height={BAR_H}
                  rx={k > 1 ? 6 : 10}
                  className="cursor-pointer"
                  fill={shaded ? C.blue : "#f1f5f9"}
                  stroke={C.line}
                  strokeWidth={3}
                  style={{ transform: `translateX(${pieceX(i)}px)`, transition: "transform 380ms cubic-bezier(0.34,1.56,0.64,1), fill 300ms" }}
                />
              );
            })}
          </g>
          {/* scissor sweep on each cut */}
          {cutKey > 0 && (
            <line key={cutKey} className="cut-sweep" x1={BAR_X - 10} x2={BAR_X + BAR_W + 10} y1={BAR_Y + BAR_H / 2} y2={BAR_Y + BAR_H / 2} stroke={C.cut} strokeWidth={3} strokeDasharray="8 6" opacity={0.7} />
          )}
          {/* the fraction, stacked, inside the shaded part */}
          {top > 0 && (
            <g className="pointer-events-none">
              <rect x={labelX - 30} y={BAR_Y + 8} width={60} height={BAR_H - 16} rx={14} fill="white" opacity={0.92} />
              <SvgFrac x={labelX} y={BAR_Y + BAR_H / 2 + 2} n={top} d={bottom} size={22} color={C.ink} />
            </g>
          )}
          {/* ✂️ knife and 🧴 glue: tap the drawing */}
          <g role="button" aria-label="Cut every piece" className="cursor-pointer" onClick={cut} opacity={k >= 6 ? 0.35 : 1}>
            <circle cx={BAR_X + BAR_W + 36} cy={BAR_Y + BAR_H / 2} r={28} fill="#ede9fe" stroke={C.cut} strokeWidth={3} />
            <text x={BAR_X + BAR_W + 36} y={BAR_Y + BAR_H / 2 + 10} textAnchor="middle" fontSize={28}>
              ✂️
            </text>
          </g>
          <g role="button" aria-label="Glue to simplest form" className="cursor-pointer" onClick={glue} opacity={top === 0 || g <= 1 ? 0.35 : 1}>
            <circle cx={BAR_X - 38} cy={BAR_Y + BAR_H / 2} r={28} fill="#dcfce7" stroke="#16a34a" strokeWidth={3} />
            <text x={BAR_X - 38} y={BAR_Y + BAR_H / 2 + 10} textAnchor="middle" fontSize={26}>
              🧴
            </text>
          </g>
          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={14} fontWeight={700} fill="#64748b">
            {k > 1 ? `Each piece cut into ${k}: ${bottom} pieces, ${top} shaded` : `${b} pieces · tap to shade · ✂️ to cut · 🧴 to glue`}
          </text>
        </svg>
      </div>

      <div className="mx-auto w-44">
        <FractionPie n={a} d={b} k={k} />
      </div>

      <EquationBar tex={tex}>
        {glued ? (
          "Glued back together: same amount, fewer pieces!"
        ) : (
          <>
            Shaded: <strong className="text-emerald-700">{pct}%</strong> of the whole, however many cuts you make.
          </>
        )}
      </EquationBar>

      <Slider
        label="Pieces in the whole"
        value={b}
        min={1}
        max={10}
        color={C.line}
        onChange={(v) => {
          setB(v);
          setA((x) => Math.min(x, v));
          setK(1);
          setGlued(false);
        }}
      />
    </WidgetPanel>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Math.round(v)));
}
