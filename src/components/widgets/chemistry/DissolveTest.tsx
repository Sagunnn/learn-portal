import { useEffect, useRef, useState } from "react";
import { cx } from "../../ui/primitives";
import { SvgPill, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Chem, Vessel } from "./chem";

/**
 * Base vs alkali: drop a base into water and stir. An alkali (NaOH, KOH)
 * dissolves and fills the water with OH⁻ ions; copper oxide and rust just sink.
 */
type Sample = { id: string; icon: string; name: string; formula: string; soluble: boolean; colour: string };
const SAMPLES: Sample[] = [
  { id: "naoh", icon: "🧪", name: "Sodium hydroxide", formula: "NaOH", soluble: true, colour: "#ffffff" },
  { id: "koh", icon: "🍌", name: "Potassium hydroxide", formula: "KOH", soluble: true, colour: "#ffffff" },
  { id: "cuo", icon: "🪨", name: "Copper oxide", formula: "CuO", soluble: false, colour: "#1f2937" },
  { id: "rust", icon: "⚙️", name: "Iron oxide (rust)", formula: "Fe2O3", soluble: false, colour: "#9a3412" },
];

type Stage = "idle" | "dropping" | "stirring" | "done";

const BX = 170;
const BY = 90;
const BW = 280;
const BH = 230;

export default function DissolveTest({ onState }: { onState?: (s: WidgetState) => void }) {
  const [sample, setSample] = useState<Sample | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [tested, setTested] = useState<Record<string, boolean>>({});
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const testedCount = Object.keys(tested).length;
  const alkalis = SAMPLES.filter((s) => s.soluble && tested[s.id]).length;
  useReportState({ tested: testedCount, alkalis }, onState);

  const drop = (s: Sample) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSample(s);
    setStage("dropping");
    later(() => setStage("stirring"), 700);
    later(() => {
      setStage("done");
      setTested((t) => ({ ...t, [s.id]: true }));
    }, 2000);
  };

  const dissolved = sample?.soluble && (stage === "done" || stage === "stirring");
  const liquid = sample?.soluble && stage === "done" ? "#bfdbfe" : "#e0f2fe";

  return (
    <WidgetPanel>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SAMPLES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => drop(s)}
            disabled={stage === "dropping" || stage === "stirring"}
            {...(i === 0 ? { "data-start": true } : {})}
            className={cx(
              "relative flex min-h-[96px] flex-col items-center justify-center rounded-2xl border-2 border-b-4 px-2 py-2 text-center font-display transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2 disabled:opacity-60",
              sample?.id === s.id ? "border-indigo-700 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
            )}
          >
            <span className="text-3xl" aria-hidden>
              {s.icon}
            </span>
            <span className="text-base font-semibold leading-tight">{s.name}</span>
            <span className="text-sm font-bold opacity-70">
              <Chem f={s.formula} />
            </span>
            {tested[s.id] && (
              <span className={cx("absolute -right-2 -top-2 rounded-full px-2 py-0.5 text-xs font-bold text-white shadow", s.soluble ? "bg-emerald-500" : "bg-slate-500")}>
                {s.soluble ? "ALKALI" : "BASE"}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-2">
        <svg viewBox="0 0 640 380" className="block h-auto w-full select-none" role="img" aria-label={sample ? `${sample.name} in water` : "A beaker of water"}>
          <Vessel x={BX} y={BY} w={BW} h={BH} level={0.7} color={liquid} opacity={0.8}>
            {/* falling sample */}
            {sample && stage === "dropping" &&
              Array.from({ length: 8 }, (_, i) => (
                <circle
                  key={`${sample.id}-${i}`}
                  className="chem-settle"
                  cx={BX + 90 + (i % 4) * 26}
                  cy={BY + BH - 14 - Math.floor(i / 4) * 9}
                  r={sample.soluble ? 7 : 9}
                  fill={sample.colour}
                  stroke="#94a3b8"
                  style={{ ["--from" as string]: "-200px", animationDuration: "0.6s" }}
                />
              ))}
            {/* insoluble: a lump that stays on the bottom, even when stirred */}
            {sample && !sample.soluble && (stage === "stirring" || stage === "done") && (
              <g>
                <ellipse cx={BX + BW / 2} cy={BY + BH - 14} rx={70} ry={12} fill={sample.colour} />
                {Array.from({ length: 12 }, (_, i) => (
                  <circle key={i} cx={BX + BW / 2 - 60 + i * 11} cy={BY + BH - 24 - (i % 3) * 4} r={5} fill={sample.colour} />
                ))}
              </g>
            )}
            {/* soluble: sparkly ions spread through the water */}
            {dissolved &&
              Array.from({ length: 10 }, (_, i) => {
                const x = BX + 40 + ((i * 61) % (BW - 80));
                const y = BY + 100 + ((i * 37) % 100);
                const oh = i % 2 === 0;
                return (
                  <g key={`${sample!.id}-ion-${i}`} className="chem-float" style={{ ["--dx" as string]: `${(i % 3) * 5 - 5}px`, ["--dy" as string]: `${(i % 4) * 3 - 6}px` }}>
                    <g className="chem-pop" style={{ animationDelay: `${i * 70}ms` }}>
                      {oh && <circle cx={x} cy={y} r={20} fill="#3b82f6" opacity={0.2} />}
                      <circle cx={x} cy={y} r={oh ? 14 : 12} fill={oh ? "#3b82f6" : "#a855f7"} stroke="white" strokeWidth={2} />
                      <text x={x} y={y + 4} textAnchor="middle" fontSize={oh ? 10 : 9} fontWeight={800} fill="white">
                        {oh ? "OH⁻" : sample!.id === "naoh" ? "Na⁺" : "K⁺"}
                      </text>
                    </g>
                  </g>
                );
              })}
          </Vessel>

          {/* stirring spoon */}
          <g style={{ transformOrigin: `${BX + BW / 2}px ${BY - 20}px`, animation: stage === "stirring" ? "spoon-stir 0.5s ease-in-out infinite alternate" : undefined }}>
            <rect x={BX + BW / 2 - 4} y={BY - 40} width={8} height={230} rx={4} fill="#94a3b8" stroke="#475569" strokeWidth={2} />
            <ellipse cx={BX + BW / 2} cy={BY + 196} rx={16} ry={10} fill="#94a3b8" stroke="#475569" strokeWidth={2} />
          </g>

          {stage === "done" && sample && (
            <g className="chem-pop">
              <SvgPill
                x={320}
                y={36}
                text={sample.soluble ? "✅ BASE + ✅ ALKALI · dissolves in water!" : "✅ BASE · ❌ NOT AN ALKALI · doesn't dissolve"}
                fill={sample.soluble ? "#ecfdf5" : "#f1f5f9"}
                color={sample.soluble ? "#047857" : "#334155"}
                stroke={sample.soluble ? "#6ee7b7" : "#cbd5e1"}
                size={17}
              />
            </g>
          )}
          {stage === "stirring" && <SvgPill x={320} y={36} text="Stirring… 🥄" size={16} />}
          {stage === "idle" && <SvgPill x={320} y={36} text="Tap a base to drop it in 👆" size={16} />}
          <text x={320} y={350} textAnchor="middle" fontSize={15} fontWeight={800} fill="#475569">
            {sample ? `${sample.name} + water` : "Water"}
          </text>
        </svg>
      </div>

      <p className="text-center text-base font-semibold text-slate-600">
        {testedCount < 4 ? `Tested ${testedCount} of 4. Which ones dissolve?` : `All tested! ${alkalis} of them are alkalis.`}
      </p>
    </WidgetPanel>
  );
}
