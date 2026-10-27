import { useState } from "react";
import { gcd, simplify } from "../../lib/fraction";
import { Button } from "../ui/primitives";
import { EquationBar, Slider, Tex, WidgetPanel, useReportState, type WidgetState } from "./controls";
import { C, FractionBar, FractionPie } from "./figures";

/**
 * Module 1 — "Knife & Glue". The knife cuts every piece into k smaller pieces
 * (multiply top and bottom by k); glue merges pieces back to lowest terms.
 * The shaded amount never changes.
 */
export default function EquivalentFractions({ a: a0 = 2, b: b0 = 3, k: k0 = 1, onState }: { a?: number; b?: number; k?: number; onState?: (s: WidgetState) => void }) {
  const [b, setB] = useState(clamp(b0, 1, 10));
  const [a, setA] = useState(clamp(a0, 1, b0));
  const [k, setK] = useState(clamp(k0, 1, 6));
  const [glued, setGlued] = useState<{ from: [number, number]; to: [number, number]; by: number } | null>(null);

  const top = a * k;
  const bottom = b * k;
  const g = gcd(top, bottom);
  const canGlue = g > 1;
  useReportState({ a, b, k, top, bottom }, onState);

  const glue = () => {
    const [n, d] = simplify(top, bottom);
    setGlued({ from: [top, bottom], to: [n, d], by: g });
    setA(n);
    setB(d);
    setK(1);
  };

  const tex =
    k === 1
      ? `\\dfrac{${a}}{${b}}`
      : `\\dfrac{${a}}{${b}} = \\dfrac{${a} \\times ${k}}{${b} \\times ${k}} = \\dfrac{${top}}{${bottom}}`;
  const pct = Math.round((a / b) * 1000) / 10;

  return (
    <WidgetPanel>
      <div className="grid items-center gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <FractionBar n={a} d={b} k={k} />
          <p className="text-center text-xs font-medium text-slate-500">
            {k > 1 ? `Each of the ${b} pieces is cut into ${k}: ${bottom} pieces, ${top} shaded.` : `${b} equal pieces, ${a} shaded.`}
          </p>
        </div>
        <div className="mx-auto w-40 sm:w-full sm:max-w-48">
          <FractionPie n={a} d={b} k={k} />
        </div>
      </div>

      <EquationBar tex={tex}>
        Shaded: <strong className="text-white">{pct}%</strong> of the whole, however many cuts you make.
      </EquationBar>

      <div className="grid gap-4 sm:grid-cols-3">
        <Slider
          label="Shaded pieces (top)"
          value={a}
          min={1}
          max={b}
          color={C.blue}
          onChange={(v) => {
            setA(v);
            setGlued(null);
          }}
        />
        <Slider
          label="Pieces in the whole (bottom)"
          value={b}
          min={1}
          max={10}
          color={C.line}
          onChange={(v) => {
            setB(v);
            setA((x) => Math.min(x, v));
            setGlued(null);
          }}
        />
        <Slider
          label="🔪 Knife: cut each piece into k"
          value={k}
          min={1}
          max={6}
          color={C.cut}
          hint={`multiplier ${k}`}
          onChange={(v) => {
            setK(v);
            setGlued(null);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setK((x) => Math.min(6, x + 1))} disabled={k >= 6}>
          🔪 Cut more
        </Button>
        <Button size="sm" variant="secondary" onClick={glue} disabled={!canGlue}>
          🧴 Glue to simplest form
        </Button>
        <span className="text-sm text-slate-500" role="status">
          {glued ? (
            <>
              Glued <Tex tex={`\\tfrac{${glued.from[0]}}{${glued.from[1]}}`} /> into <Tex tex={`\\tfrac{${glued.to[0]}}{${glued.to[1]}}`} /> by
              dividing the top and bottom by {glued.by}.
            </>
          ) : canGlue ? (
            <>
              <Tex tex={`\\tfrac{${top}}{${bottom}}`} /> can be simplified. Try the glue.
            </>
          ) : (
            "This is already in simplest form."
          )}
        </span>
      </div>
    </WidgetPanel>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Math.round(v)));
}
