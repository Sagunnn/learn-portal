import { useState } from "react";
import { fracTex, lcm, simplify } from "../../lib/fraction";
import { Button } from "../ui/primitives";
import { EquationBar, Stepper, Tex, WidgetPanel, useReportState, type WidgetState } from "./controls";
import { C, MergeGrids, type MergePhase } from "./figures";

/**
 * Module 3 — "LCD Grid Merger". Box A is cut into columns, Box B into rows.
 * Laying each box's lines over the other gives both the same b1×b2 grid, so the
 * pieces finally have the same size and can be added.
 */
export default function GridMerger({
  a1: a10 = 1,
  b1: b10 = 2,
  a2: a20 = 1,
  b2: b20 = 3,
  onState,
}: { a1?: number; b1?: number; a2?: number; b2?: number; onState?: (s: WidgetState) => void }) {
  const [b1, setB1] = useState(clampD(b10));
  const [a1, setA1] = useState(clampN(a10, b10));
  const [b2, setB2] = useState(clampD(b20));
  const [a2, setA2] = useState(clampN(a20, b20));
  const [phase, setPhase] = useState<MergePhase>(0);
  useReportState({ a1, b1, a2, b2, phase, over: a1 * b2 + a2 * b1 > b1 * b2 ? 1 : 0 }, onState);

  const change = (fn: () => void) => {
    fn();
    setPhase(0);
  };

  const cells = b1 * b2;
  const sum = a1 * b2 + a2 * b1;
  const [sn, sd] = simplify(sum, cells);
  const wrongN = a1 + a2;
  const wrongD = b1 + b2;
  const bigger = a1 / b1 >= a2 / b2 ? ([a1, b1] as const) : ([a2, b2] as const);
  const lowest = lcm(b1, b2);

  let tex = `\\dfrac{${a1}}{${b1}} + \\dfrac{${a2}}{${b2}}`;
  if (phase === 0) tex += " = \\;?";
  if (phase >= 1) tex += ` = \\dfrac{${a1 * b2}}{${cells}} + \\dfrac{${a2 * b1}}{${cells}}`;
  if (phase === 2) {
    tex += ` = \\dfrac{${sum}}{${cells}}`;
    if (sd !== cells) tex += ` = \\dfrac{${sn}}{${sd}}`;
    if (sn > sd) tex += ` = ${fracTex(sn, sd, { mixed: true }).replace(/\\tfrac/g, "\\dfrac")}`;
  }

  return (
    <WidgetPanel>
      <div className="grid gap-3 sm:grid-cols-2">
        <FractionPicker label="Box A" color={C.blue} n={a1} d={b1} onN={(v) => change(() => setA1(v))} onD={(v) => change(() => { setB1(v); setA1((x) => Math.min(x, v - 1)); })} />
        <FractionPicker label="Box B" color={C.orange} n={a2} d={b2} onN={(v) => change(() => setA2(v))} onD={(v) => change(() => { setB2(v); setA2((x) => Math.min(x, v - 1)); })} />
      </div>

      <div className="rounded-xl bg-white p-2">
        <MergeGrids a={[a1, b1]} b={[a2, b2]} phase={phase} />
      </div>

      <EquationBar tex={tex}>
        {phase === 0 && "The pieces are different sizes, so we can't count them together yet."}
        {phase === 1 && `Both boxes now have the same ${b1} × ${b2} = ${cells} pieces. Same-size pieces can be added.`}
        {phase === 2 && `${a1 * b2} blue + ${a2 * b1} orange = ${sum} pieces of ${cells}.`}
      </EquationBar>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={phase === 0 ? "primary" : "secondary"} onClick={() => setPhase(1)} disabled={phase !== 0}>
          ① Overlay &amp; find common grid
        </Button>
        <Button size="sm" variant={phase === 1 ? "primary" : "secondary"} onClick={() => setPhase(2)} disabled={phase !== 1}>
          ② Combine the pieces
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPhase(0)} disabled={phase === 0}>
          Reset
        </Button>
      </div>

      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-slate-700">
        <div className="mb-1 font-bold text-rose-700">⚠️ The classic trap</div>
        Adding straight across gives <Tex tex={`\\dfrac{${a1}+${a2}}{${b1}+${b2}} = \\dfrac{${wrongN}}{${wrongD}}`} />. But{" "}
        <Tex tex={`\\tfrac{${wrongN}}{${wrongD}}`} /> is {wrongN / wrongD < bigger[0] / bigger[1] ? "smaller than" : "no bigger than"}{" "}
        <Tex tex={`\\tfrac{${bigger[0]}}{${bigger[1]}}`} /> on its own. Adding more can't give a smaller answer, so it must be wrong.
      </div>

      {phase === 2 && lowest !== cells && (
        <p className="text-sm text-slate-600">
          💡 The grid always gives <em>a</em> common denominator ({b1} × {b2} = {cells}). The <strong>lowest</strong> common
          denominator is {lowest}, and simplifying the answer lands you in the same place.
        </p>
      )}
    </WidgetPanel>
  );
}

function FractionPicker({ label, color, n, d, onN, onD }: { label: string; color: string; n: number; d: number; onN: (v: number) => void; onD: (v: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-white p-3" style={{ borderColor: color + "55" }}>
      <span className="w-full text-sm font-bold sm:w-auto" style={{ color }}>
        {label}
      </span>
      <Stepper label="top" value={n} min={1} max={d - 1} onChange={onN} color={color} />
      <Stepper label="bottom" value={d} min={2} max={6} onChange={onD} color={C.line} />
    </div>
  );
}

const clampD = (v: number) => Math.min(6, Math.max(2, Math.round(v)));
const clampN = (v: number, d: number) => Math.min(clampD(d) - 1, Math.max(1, Math.round(v)));

