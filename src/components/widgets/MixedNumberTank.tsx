import { useState } from "react";
import { EquationBar, Slider, Stepper, WidgetPanel, useReportState, type WidgetState } from "./controls";
import { C, Tank } from "./figures";

const MAX_WHOLES = 5;

/** Module 2 — "Container Overflow Tank": pour n pieces into containers that hold d each. */
export default function MixedNumberTank({ n: n0 = 11, d: d0 = 4, onState }: { n?: number; d?: number; onState?: (s: WidgetState) => void }) {
  const [d, setD] = useState(Math.min(8, Math.max(2, d0)));
  const [n, setN] = useState(Math.min(MAX_WHOLES * d0, Math.max(0, n0)));

  const wholes = Math.floor(n / d);
  const rest = n % d;
  useReportState({ n, d, wholes, rest }, onState);

  const right = n === 0 ? "0" : rest === 0 ? `${wholes}` : wholes === 0 ? `\\dfrac{${rest}}{${d}}` : `${wholes}\\dfrac{${rest}}{${d}}`;
  const tex = `\\dfrac{${n}}{${d}} = ${right}`;

  const story =
    n === 0
      ? "Empty. Press + to pour in a piece."
      : n < d
        ? `${n} pieces don't fill even one container (it needs ${d}), so this is a proper fraction: less than 1.`
        : rest === 0
          ? `${n} ÷ ${d} = ${wholes} exactly: ${wholes} full container${wholes > 1 ? "s" : ""}, nothing left over.`
          : `${n} ÷ ${d} = ${wholes} remainder ${rest}: ${wholes} full container${wholes > 1 ? "s" : ""} and ${rest} piece${rest > 1 ? "s" : ""} left over.`;

  return (
    <WidgetPanel>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Stepper label="Pieces (top)" value={n} min={0} max={MAX_WHOLES * d} onChange={setN} color={C.orange} />
        <div className="min-w-48 flex-1 sm:max-w-64">
          <Slider
            label="Pieces per container (bottom)"
            value={d}
            min={2}
            max={8}
            color={C.line}
            onChange={(v) => {
              setD(v);
              setN((x) => Math.min(x, MAX_WHOLES * v));
            }}
          />
        </div>
      </div>

      <div className="rounded-xl bg-white p-3">
        <Tank n={n} d={d} />
      </div>

      <EquationBar tex={tex}>{story}</EquationBar>
      <p className="text-center text-sm text-slate-500">
        <span className="mr-3 inline-flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm" style={{ background: C.blue }} /> full container = 1 whole
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm" style={{ background: C.orange }} /> leftover pieces
        </span>
      </p>
    </WidgetPanel>
  );
}
