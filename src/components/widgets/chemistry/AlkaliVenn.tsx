import { useState } from "react";
import { cx } from "../../ui/primitives";
import { WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Chem, ChemSvg } from "./chem";

/**
 * "Egg-yolk" sorter: the egg white is ALL BASES, the yolk is ALKALIS (bases
 * that dissolve in water). Tap a pill, then tap where it belongs.
 */
type Item = { id: string; f: string; label?: string; soluble: boolean; hint: string; why: string };
const ITEMS: Item[] = [
  { id: "naoh", f: "NaOH", soluble: true, hint: "💧 dissolves", why: "NaOH dissolves in water, so it's an alkali: it goes in the yolk." },
  { id: "cuo", f: "CuO", soluble: false, hint: "🪨 sinks", why: "Copper oxide doesn't dissolve. It's a base, but not an alkali: the white, not the yolk." },
  { id: "koh", f: "KOH", soluble: true, hint: "💧 dissolves", why: "KOH dissolves in water, so it's an alkali: it goes in the yolk." },
  { id: "mgoh", f: "Mg(OH)2", label: "antacid", soluble: false, hint: "🪨 barely dissolves", why: "Milk of magnesia hardly dissolves (that's why it looks milky). It's a base, not an alkali." },
  { id: "feo", f: "FeO", soluble: false, hint: "🪨 sinks", why: "Iron oxide doesn't dissolve. It's a base, but not an alkali." },
];

const YOLK = { cx: 330, cy: 240, r: 112 };
const YOLK_SLOTS = [
  [-56, -6],
  [56, -6],
  [0, 46],
];
const WHITE_SLOTS = [
  [-215, -40],
  [-200, 70],
  [210, -40],
  [200, 70],
  [0, -150],
];

export default function AlkaliVenn({ onState }: { onState?: (s: WidgetState) => void }) {
  const [placed, setPlaced] = useState<Record<string, "yolk" | "white">>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ id: string; why: string; at: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const count = Object.keys(placed).length;
  useReportState({ placed: count, mistakes }, onState);

  const place = (zone: "yolk" | "white") => {
    if (!picked) return;
    const item = ITEMS.find((i) => i.id === picked)!;
    const right = item.soluble ? "yolk" : "white";
    setPicked(null);
    if (zone === right) {
      setPlaced({ ...placed, [item.id]: zone });
      setWrong(null);
    } else {
      setMistakes((m) => m + 1);
      setWrong({ id: item.id, why: item.why, at: Date.now() });
    }
  };

  const inZone = (zone: "yolk" | "white") => ITEMS.filter((i) => placed[i.id] === zone);
  const loose = ITEMS.filter((i) => !placed[i.id]);
  const allDone = count === ITEMS.length;

  const pill = (it: Item, x: number, y: number) => (
    <g key={it.id} className="chem-pop pointer-events-none">
      <rect x={x - 50} y={y - 18} width={100} height={36} rx={18} fill={it.soluble ? "#2563eb" : "#78716c"} stroke="white" strokeWidth={3} />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={16} fontWeight={800} fill="white">
        <ChemSvg f={it.f} />
      </text>
    </g>
  );

  return (
    <WidgetPanel>
      <div className="flex min-h-14 flex-wrap justify-center gap-2">
        {loose.map((it, i) => (
          <button
            key={`${it.id}-${wrong?.id === it.id ? wrong.at : 0}`}
            type="button"
            aria-pressed={picked === it.id}
            onClick={() => setPicked(picked === it.id ? null : it.id)}
            {...(i === 0 ? { "data-start": true } : {})}
            className={cx(
              "flex min-h-[64px] flex-col items-center justify-center rounded-2xl border-2 border-b-4 px-4 py-1 font-display transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2",
              picked === it.id ? "border-amber-500 bg-amber-100 ring-4 ring-amber-200" : "border-slate-200 bg-white hover:bg-slate-50",
              wrong?.id === it.id && "animate-shake border-rose-400",
            )}
          >
            <span className="text-xl font-semibold text-slate-900">
              <Chem f={it.f} />
              {it.label && <span className="ml-1 text-sm text-slate-500">({it.label})</span>}
            </span>
            <span className="text-sm font-bold text-slate-500">{it.hint}</span>
          </button>
        ))}
        {loose.length === 0 && <p className="font-display text-lg font-semibold text-emerald-700">Every base is in its place!</p>}
      </div>

      {wrong && (
        <div role="status" className="animate-rise rounded-2xl border-b-4 border-rose-500 bg-slate-900 px-4 py-3 text-base text-slate-100">
          <span className="mr-1 font-bold text-rose-300">Not there:</span> {wrong.why}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-sky-50/60 p-2">
        <svg viewBox="0 0 660 440" className="block h-auto w-full select-none">
          <defs>
            <radialGradient id="yolk-g" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="55%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#38bdf8" />
            </radialGradient>
          </defs>
          {/* egg white: all bases */}
          <g role="button" aria-label="All bases (the egg white)" className={picked ? "cursor-pointer" : undefined} onClick={() => place("white")}>
            <path
              d="M330 22 C 470 18, 640 110, 630 250 C 620 380, 470 425, 330 418 C 180 425, 30 380, 32 250 C 30 110, 190 18, 330 22 Z"
              fill="white"
              stroke={picked ? "#f59e0b" : "#cbd5e1"}
              strokeWidth={picked ? 6 : 4}
              strokeDasharray={picked ? "14 8" : undefined}
            />
            <text x={330} y={56} textAnchor="middle" fontSize={20} fontWeight={800} fill="#475569">
              ALL BASES
            </text>
            <text x={330} y={78} textAnchor="middle" fontSize={14} fontWeight={700} fill="#94a3b8">
              (neutralise acids)
            </text>
          </g>
          {/* yolk: alkalis */}
          <g role="button" aria-label="Alkalis (the yolk)" className={picked ? "cursor-pointer" : undefined} onClick={(e) => (e.stopPropagation(), place("yolk"))}>
            <circle cx={YOLK.cx} cy={YOLK.cy} r={YOLK.r + 14} fill="#38bdf8" opacity={0.18} className="animate-pulse" />
            <circle cx={YOLK.cx} cy={YOLK.cy} r={YOLK.r} fill="url(#yolk-g)" stroke={picked ? "#f59e0b" : "#0ea5e9"} strokeWidth={picked ? 6 : 4} />
            <text x={YOLK.cx} y={YOLK.cy - 62} textAnchor="middle" fontSize={20} fontWeight={800} fill="#0c4a6e">
              ALKALIS 💧
            </text>
            <text x={YOLK.cx} y={YOLK.cy - 42} textAnchor="middle" fontSize={13} fontWeight={700} fill="#0369a1">
              bases that dissolve in water
            </text>
          </g>
          {inZone("yolk").map((it, i) => pill(it, YOLK.cx + YOLK_SLOTS[i][0], YOLK.cy + YOLK_SLOTS[i][1]))}
          {inZone("white").map((it, i) => pill(it, YOLK.cx + WHITE_SLOTS[i][0], YOLK.cy + WHITE_SLOTS[i][1]))}
          {picked && (
            <text x={330} y={430} textAnchor="middle" fontSize={14} fontWeight={800} fill="#b45309">
              Now tap the white or the yolk 👆
            </text>
          )}
        </svg>
      </div>

      {allDone && (
        <div className="animate-pop rounded-3xl border-b-4 border-amber-500 bg-amber-300 px-5 py-4 text-center font-display text-xl font-semibold text-amber-950">
          🏆 All alkalis live inside the base family, because an alkali is just a base that dissolves in water!
        </div>
      )}
    </WidgetPanel>
  );
}
