import { useMemo, useState } from "react";
import { cx } from "../../ui/primitives";
import { Slider, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { phKind, uiColor } from "./chem";

/**
 * 0–14 pH slider with a "zoom lens" into the liquid: more H⁺ ions below 7, equal
 * at 7, more OH⁻ ions above 7. (Each pH step is really 10× — the picture shows the trend.)
 */
const EXAMPLES: [number, string][] = [
  [0, "Battery acid"],
  [1.5, "Stomach acid"],
  [2.2, "Lemon juice"],
  [3, "Vinegar"],
  [5, "Black coffee"],
  [7, "Pure water"],
  [7.4, "Blood"],
  [8.3, "Baking soda"],
  [10, "Soap"],
  [11.5, "Ammonia cleaner"],
  [13.5, "Drain cleaner"],
];

export default function PhScale({ ph: ph0 = 3, onState }: { ph?: number; onState?: (s: WidgetState) => void }) {
  const [ph, setPh] = useState(Math.max(0, Math.min(14, Math.round(ph0))));
  useReportState({ ph }, onState);
  const kind = phKind(ph);

  // Trend, not real numbers: 3 of each at pH 7, about +3 per step away from 7.
  const nH = ph < 7 ? 3 + Math.round((7 - ph) * 3) : Math.max(0, 3 - Math.round((ph - 7) * 0.45));
  const nOH = ph > 7 ? 3 + Math.round((ph - 7) * 3) : Math.max(0, 3 - Math.round((7 - ph) * 0.45));

  const ions = useMemo(() => {
    const rnd = (i: number, s: number) => {
      const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    const list: { x: number; y: number; type: "H" | "OH" | "W"; i: number }[] = [];
    for (let i = 0; i < 14; i++) list.push({ x: 20 + rnd(i, 1) * 200, y: 20 + rnd(i, 2) * 200, type: "W", i });
    for (let i = 0; i < nH; i++) list.push({ x: 25 + rnd(i, 3) * 190, y: 25 + rnd(i, 4) * 190, type: "H", i });
    for (let i = 0; i < nOH; i++) list.push({ x: 25 + rnd(i, 5) * 190, y: 25 + rnd(i, 6) * 190, type: "OH", i });
    return list.filter((p) => Math.hypot(p.x - 120, p.y - 120) < 100);
  }, [nH, nOH]);

  const near = EXAMPLES.reduce((best, e) => (Math.abs(e[0] - ph) < Math.abs(best[0] - ph) ? e : best));

  return (
    <WidgetPanel>
      <div className="grid gap-6">
        <div className="order-2 mx-auto w-full max-w-sm">
          <svg viewBox="0 0 240 240" className="block h-auto w-full" role="img" aria-label={`Zoomed-in view at pH ${ph}: ${nH} H+ ions and ${nOH} OH- ions shown`}>
            <circle cx={120} cy={120} r={110} style={{ fill: uiColor(ph), transition: "fill 700ms ease" }} opacity={0.25} />
            <circle cx={120} cy={120} r={110} fill="none" stroke="#334155" strokeWidth={6} />
            {ions.map((p) => (
              <g key={`${p.type}${p.i}`} className="chem-float" style={{ ["--dx" as string]: `${(p.i % 3) * 4 - 4}px`, ["--dy" as string]: `${(p.i % 4) * 3 - 5}px`, animationDelay: `${(p.i % 5) * 0.4}s` }}>
                {p.type === "W" ? (
                  <g opacity={0.35}>
                    <circle cx={p.x} cy={p.y} r={7} fill="#ef4444" />
                    <circle cx={p.x - 7} cy={p.y + 5} r={4} fill="white" stroke="#94a3b8" />
                    <circle cx={p.x + 7} cy={p.y + 5} r={4} fill="white" stroke="#94a3b8" />
                  </g>
                ) : p.type === "H" ? (
                  <g className="chem-pop">
                    <circle cx={p.x} cy={p.y} r={11} fill="#e11d48" />
                    <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="white">
                      H⁺
                    </text>
                  </g>
                ) : (
                  <g className="chem-pop">
                    <circle cx={p.x} cy={p.y} r={13} fill="#4f46e5" />
                    <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={10} fontWeight={800} fill="white">
                      OH⁻
                    </text>
                  </g>
                )}
              </g>
            ))}
            <path d="M200 200 l28 28" stroke="#334155" strokeWidth={12} strokeLinecap="round" />
          </svg>
        </div>

        <div className="order-1 space-y-5">
          <div className="flex items-center justify-center gap-4">
            <div
              className="grid size-20 shrink-0 place-items-center rounded-2xl border-b-4 border-black/20 text-3xl font-extrabold text-white"
              style={{ background: uiColor(ph), transition: "background-color 700ms ease" }}
            >
              {ph}
            </div>
            <div>
              <div
                className={cx(
                  "text-2xl font-extrabold",
                  kind === "acid" ? "text-rose-600" : kind === "base" ? "text-indigo-600" : "text-emerald-600",
                )}
              >
                {kind === "acid" ? "Acidic" : kind === "base" ? "Basic (alkaline)" : "Neutral"}
              </div>
              <div className="text-base font-semibold text-slate-600">
                {kind === "acid" ? "More H⁺ ions than OH⁻" : kind === "base" ? "More OH⁻ ions than H⁺" : "H⁺ and OH⁻ balance out"}
              </div>
              <div className="text-base text-slate-500">Like: {near[1]}</div>
            </div>
          </div>

          <div>
            <div className="h-6 rounded-full" style={{ background: `linear-gradient(to right, ${Array.from({ length: 15 }, (_, i) => uiColor(i)).join(", ")})` }} />
            <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-500">
              {Array.from({ length: 15 }, (_, i) => (
                <span key={i} className={cx(i === ph && "text-slate-900")}>
                  {i}
                </span>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-sm font-extrabold">
              <span className="text-rose-600">← stronger acid</span>
              <span className="text-emerald-600">7 neutral</span>
              <span className="text-indigo-600">stronger base →</span>
            </div>
          </div>

        </div>
        <div className="order-3 space-y-2">
          <Slider label="Slide the pH" value={ph} min={0} max={14} color={uiColor(ph)} onChange={setPh} hint={`pH ${ph}`} />
          <p className="text-center text-base text-slate-500">Each step on the pH scale means 10 times more (or fewer) H⁺ ions, so the picture shows the trend, not the real numbers.</p>
        </div>
      </div>
    </WidgetPanel>
  );
}
