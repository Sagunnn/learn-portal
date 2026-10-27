import { useMemo, useState } from "react";
import { cx } from "../../ui/primitives";
import { SvgPill, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { phKind, uiColor } from "./chem";

/**
 * pH by touch: tap the ACID or BASE dropper bottle to drip into the zoom lens
 * (each drop moves the pH by 1), or tap a household preset. The lens shows more
 * H⁺ ions below 7, a balance at 7 and more OH⁻ above 7.
 * (Each pH step is really 10× — the picture shows the trend.)
 */
const PRESETS: { icon: string; name: string; ph: number }[] = [
  { icon: "🍋", name: "Lemon", ph: 2 },
  { icon: "🫙", name: "Vinegar", ph: 3 },
  { icon: "☕", name: "Coffee", ph: 5 },
  { icon: "💧", name: "Water", ph: 7 },
  { icon: "🧁", name: "Baking soda", ph: 8 },
  { icon: "🧼", name: "Soap", ph: 10 },
  { icon: "🧪", name: "Drain cleaner", ph: 13 },
];

const LX = 300;
const LY = 205;
const LR = 105;

export default function PhScale({ ph: ph0 = 3, onState }: { ph?: number; onState?: (s: WidgetState) => void }) {
  const [ph, setPh] = useState(Math.max(0, Math.min(14, Math.round(ph0))));
  const [drop, setDrop] = useState<{ side: "acid" | "base"; key: number } | null>(null);
  useReportState({ ph }, onState);
  const kind = phKind(ph);

  const drip = (side: "acid" | "base") => {
    if ((side === "acid" && ph <= 0) || (side === "base" && ph >= 14)) return;
    setDrop({ side, key: Date.now() });
    // colour shifts as the drop lands
    window.setTimeout(() => setPh((p) => Math.max(0, Math.min(14, p + (side === "acid" ? -1 : 1)))), 380);
  };

  // Trend, not real numbers: 3 of each at pH 7, about +3 per step away from 7.
  const nH = ph < 7 ? 3 + Math.round((7 - ph) * 3) : Math.max(0, 3 - Math.round((ph - 7) * 0.45));
  const nOH = ph > 7 ? 3 + Math.round((ph - 7) * 3) : Math.max(0, 3 - Math.round((7 - ph) * 0.45));

  const ions = useMemo(() => {
    const rnd = (i: number, s: number) => {
      const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    const list: { x: number; y: number; type: "H" | "OH" | "W"; i: number }[] = [];
    const place = (i: number, s: number) => ({ x: LX - 90 + rnd(i, s) * 180, y: LY - 90 + rnd(i, s + 1) * 180 });
    for (let i = 0; i < 14; i++) list.push({ ...place(i, 1), type: "W", i });
    for (let i = 0; i < nH; i++) list.push({ ...place(i, 3), type: "H", i });
    for (let i = 0; i < nOH; i++) list.push({ ...place(i, 5), type: "OH", i });
    return list.filter((p) => Math.hypot(p.x - LX, p.y - LY) < LR - 12);
  }, [nH, nOH]);

  const label = kind === "acid" ? "Acidic" : kind === "base" ? "Basic" : "Neutral!";

  const bottle = (side: "acid" | "base", x: number) => {
    const isAcid = side === "acid";
    const tilting = drop?.side === side;
    return (
      <g
        role="button"
        aria-label={isAcid ? "Add a drop of acid" : "Add a drop of base"}
        className="cursor-pointer"
        onClick={() => drip(side)}
        {...(isAcid ? { "data-start": true } : {})}
      >
        <g key={tilting ? drop!.key : side} style={{ transformOrigin: `${x}px 70px`, animation: tilting ? `bottle-${side} 0.6s ease-in-out` : undefined }}>
          <rect x={x - 30} y={40} width={60} height={64} rx={14} fill={isAcid ? "#fecdd3" : "#c7d2fe"} stroke="#334155" strokeWidth={3} />
          <rect x={x - 12} y={22} width={24} height={20} rx={5} fill="#e2e8f0" stroke="#334155" strokeWidth={3} />
          <rect x={x - 9} y={8} width={18} height={16} rx={6} fill={isAcid ? "#e11d48" : "#4f46e5"} />
          <text x={x} y={80} textAnchor="middle" fontSize={15} fontWeight={800} fill={isAcid ? "#9f1239" : "#3730a3"}>
            {isAcid ? "ACID" : "BASE"}
          </text>
        </g>
        <text x={x} y={128} textAnchor="middle" fontSize={13} fontWeight={800} fill="#64748b">
          tap to drip
        </text>
      </g>
    );
  };

  return (
    <WidgetPanel>
      <div className="rounded-3xl border border-slate-200 bg-white p-2">
        <svg viewBox="0 0 600 352" className="block h-auto w-full select-none" role="img" aria-label={`pH ${ph}: ${label}`}>
          {bottle("acid", 120)}
          {bottle("base", 480)}

          {/* falling drop + ripple */}
          {drop && (
            <g key={drop.key}>
              <circle cx={drop.side === "acid" ? 120 : 480} cy={118} r={8} fill={drop.side === "acid" ? "#e11d48" : "#4f46e5"} style={{ animation: `drop-${drop.side} 0.42s ease-in both` }} />
              <circle cx={LX} cy={LY - 40} r={10} fill="none" stroke={drop.side === "acid" ? "#e11d48" : "#4f46e5"} strokeWidth={3} className="chem-ripple" />
            </g>
          )}

          {/* zoom lens into the liquid */}
          <circle cx={LX} cy={LY} r={LR} style={{ fill: uiColor(ph), transition: "fill 500ms ease" }} opacity={0.28} />
          {ions.map((p) => (
            <g
              key={`${p.type}${p.i}`}
              className="chem-float"
              style={{ ["--dx" as string]: `${(p.i % 3) * 4 - 4}px`, ["--dy" as string]: `${(p.i % 4) * 3 - 5}px`, animationDelay: `${(p.i % 5) * 0.4}s` }}
            >
              {p.type === "W" ? (
                <g opacity={0.35}>
                  <circle cx={p.x} cy={p.y} r={7} fill="#ef4444" />
                  <circle cx={p.x - 7} cy={p.y + 5} r={4} fill="white" stroke="#94a3b8" />
                  <circle cx={p.x + 7} cy={p.y + 5} r={4} fill="white" stroke="#94a3b8" />
                </g>
              ) : (
                <g className="chem-pop">
                  <circle cx={p.x} cy={p.y} r={p.type === "H" ? 12 : 14} fill={p.type === "H" ? "#e11d48" : "#4f46e5"} />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={p.type === "H" ? 12 : 10} fontWeight={800} fill="white">
                    {p.type === "H" ? "H⁺" : "OH⁻"}
                  </text>
                </g>
              )}
            </g>
          ))}
          <circle cx={LX} cy={LY} r={LR} fill="none" stroke="#334155" strokeWidth={7} />
          <path d={`M${LX + 74} ${LY + 74} l34 34`} stroke="#334155" strokeWidth={14} />

          {/* the reading, right on the lens */}
          <SvgPill x={LX} y={LY - LR - 2} text={`pH ${ph} · ${label}`} fill={uiColor(ph)} color="white" stroke="white" size={20} />
          <text x={LX} y={LY + LR + 30} textAnchor="middle" fontSize={15} fontWeight={800} fill={kind === "acid" ? "#be123c" : kind === "base" ? "#4338ca" : "#047857"}>
            {kind === "acid" ? "More H⁺ than OH⁻" : kind === "base" ? "More OH⁻ than H⁺" : "H⁺ and OH⁻ balance out"}
          </text>
        </svg>

        {/* where we are on the scale */}
        <div className="px-3 pb-2">
          <div className="relative h-6 rounded-full" style={{ background: `linear-gradient(to right, ${Array.from({ length: 15 }, (_, i) => uiColor(i)).join(", ")})` }}>
            <div
              className="absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-md transition-[left] duration-500"
              style={{ left: `${(ph / 14) * 100}%`, background: uiColor(ph) }}
            />
          </div>
          <div className="mt-1 flex justify-between text-sm font-bold">
            <span className="text-rose-600">0 · acid</span>
            <span className="text-emerald-600">7</span>
            <span className="text-indigo-600">base · 14</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            aria-pressed={ph === p.ph}
            onClick={() => setPh(p.ph)}
            className={cx(
              "flex min-h-[60px] min-w-[84px] flex-col items-center justify-center rounded-2xl border-2 border-b-4 px-3 py-1 font-display transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2",
              ph === p.ph ? "border-indigo-700 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            <span className="text-2xl" aria-hidden>
              {p.icon}
            </span>
            <span className="text-sm font-semibold">{p.name}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-slate-500">Each pH step really means 10× more (or fewer) H⁺ ions. The picture shows the trend.</p>
    </WidgetPanel>
  );
}
