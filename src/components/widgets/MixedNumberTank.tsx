import { useState } from "react";
import { EquationBar, WidgetPanel, useReportState, type WidgetState } from "./controls";
import { Tank } from "./figures";

const MAX_WHOLES = 5;

/** Module 2 — "Container Overflow Tank": pour n pieces into containers that hold d each. */
export default function MixedNumberTank({ n: n0 = 11, d: d0 = 4, onState }: { n?: number; d?: number; onState?: (s: WidgetState) => void }) {
  const [d, setD] = useState(Math.min(8, Math.max(2, d0)));
  const [n, setN] = useState(Math.min(MAX_WHOLES * d0, Math.max(0, n0)));
  const [pourKey, setPourKey] = useState(0);

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
      {/* the jug and the tank are the controls: pour pieces in, tip one out */}
      <div className="rounded-3xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-end justify-between gap-3">
          <button
            type="button"
            data-start
            onClick={() => {
              if (n >= MAX_WHOLES * d) return;
              setN(n + 1);
              setPourKey((k) => k + 1);
            }}
            disabled={n >= MAX_WHOLES * d}
            aria-label="Pour in one piece"
            className="group flex min-h-[64px] items-center gap-3 rounded-2xl border-2 border-b-4 border-orange-300 bg-orange-50 px-4 py-2 font-display text-lg font-semibold text-orange-800 transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2 disabled:opacity-40"
          >
            <span key={pourKey} className={pourKey ? "inline-block animate-[jug-tilt_0.45s_ease-in-out] text-4xl" : "inline-block text-4xl"} aria-hidden>
              🫗
            </span>
            Pour a piece
          </button>
          <div className="text-center">
            <div className="font-display text-4xl font-semibold tabular-nums text-orange-600">{n}</div>
            <div className="text-sm font-bold text-slate-500">pieces poured</div>
          </div>
          <button
            type="button"
            onClick={() => n > 0 && setN(n - 1)}
            disabled={n === 0}
            className="min-h-[56px] rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-4 font-display text-base font-semibold text-slate-600 transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2 disabled:opacity-40"
          >
            Take one out
          </button>
        </div>
        <Tank n={n} d={d} />
      </div>

      <EquationBar tex={tex}>{story}</EquationBar>
      <div>
        <div className="mb-2 text-center font-display text-base font-semibold text-slate-700">Pieces that fill one container</div>
        <div className="flex flex-wrap justify-center gap-2">
          {[2, 3, 4, 5, 6, 8].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={d === v}
              onClick={() => {
                setD(v);
                setN((x) => Math.min(x, MAX_WHOLES * v));
              }}
              className={
                "min-h-[52px] min-w-[64px] rounded-2xl border-2 border-b-4 px-4 font-display text-xl font-semibold transition-all active:mb-[2px] active:translate-y-[2px] active:border-b-2 " +
                (d === v ? "border-indigo-700 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
              }
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </WidgetPanel>
  );
}
