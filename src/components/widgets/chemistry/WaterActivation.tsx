import { useEffect, useRef, useState } from "react";
import { Button, cx } from "../../ui/primitives";
import { SvgPill, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Vessel } from "./chem";

/**
 * Acids and bases only "wake up" in water. Step 1: dry acid crystals stay as
 * H–Cl pairs (blue litmus stays blue, bulb off). Step 2: pour water, the pairs
 * pop apart into H⁺ and Cl⁻, litmus turns red, the bulb lights. Step 3: NaOH
 * pellets in water split into Na⁺ and OH⁻, red litmus turns blue.
 * Plus a splash test: water into acid (dangerous) vs acid slowly into water (safe).
 */
type Phase = "empty" | "dryAcid" | "pouring" | "wetAcid" | "basePellets" | "base";

const BX = 130;
const BY = 100;
const BW = 300;
const BH = 230;
const LX = 290; // lens centre
const LY = 240;
const LR = 74;

// Where particles sit: paired (close together) and split (scattered round the lens)
const SPOTS = [
  [-38, -34],
  [30, -40],
  [-46, 18],
  [8, 2],
  [42, 30],
  [-10, 44],
];
const SPLIT = [
  [[-52, -30], [-14, -54]],
  [[40, -46], [56, -10]],
  [[-60, 6], [-36, 40]],
  [[-4, -18], [20, 16]],
  [[34, 44], [58, 22]],
  [[-18, 58], [8, 52]],
];

export default function WaterActivation({ onState }: { onState?: (s: WidgetState) => void }) {
  const [phase, setPhase] = useState<Phase>("empty");
  const [split, setSplit] = useState(false);
  const [lens, setLens] = useState(true);
  const [done, setDone] = useState({ acidDry: 0, acidWet: 0, baseWet: 0 });
  const [pour, setPour] = useState<null | "danger" | "safe">(null);
  const [pourKey, setPourKey] = useState(0);
  const [pourDone, setPourDone] = useState({ safePour: 0, dangerPour: 0 });
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  useReportState({ ...done, ...pourDone }, onState);

  const isBase = phase === "basePellets" || phase === "base";
  const wet = phase === "wetAcid" || isBase || phase === "pouring";
  const ionsFree = (phase === "wetAcid" || phase === "base") && split;
  const litmusBase = isBase ? "#ef4444" : "#3b82f6"; // red litmus for the base test, blue for acid
  const litmusNow = ionsFree ? (isBase ? "#3b82f6" : "#ef4444") : litmusBase;

  const step1 = () => {
    setSplit(false);
    setPhase("dryAcid");
    setDone((d) => ({ ...d, acidDry: 1 }));
  };
  const step2 = () => {
    if (phase !== "dryAcid") return;
    setPhase("pouring");
    later(() => setPhase("wetAcid"), 900);
    later(() => {
      setSplit(true);
      setDone((d) => ({ ...d, acidWet: 1 }));
    }, 1050);
  };
  const step3 = () => {
    setSplit(false);
    setPhase("basePellets");
    later(() => setPhase("base"), 700);
    later(() => {
      setSplit(true);
      setDone((d) => ({ ...d, baseWet: 1 }));
    }, 850);
  };

  const badge =
    phase === "empty"
      ? "Start with Step 1 👇"
      : phase === "dryAcid"
        ? "No water = no free H⁺ ions! The acid is asleep 😴"
        : phase === "pouring"
          ? "Pouring water…"
          : phase === "wetAcid"
            ? "Acid + water → releases H⁺ (hydrogen ions)!"
            : phase === "basePellets"
              ? "Dropping NaOH pellets…"
              : "Base + water → releases OH⁻ (hydroxide ions)!";

  // the two kinds of particle for the current substance
  const A = isBase ? { label: "Na⁺", fill: "#a855f7", r: 15 } : { label: "Cl⁻", fill: "#22c55e", r: 16 };
  const B = isBase ? { label: "OH⁻", fill: "#3b82f6", r: 17 } : { label: "H⁺", fill: "#ef4444", r: 13 };

  return (
    <WidgetPanel>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant={phase === "dryAcid" ? "primary" : "secondary"} onClick={step1} data-start className="!min-h-[64px] !text-base">
          🧂 1 · Drop dry acid
        </Button>
        <Button variant={phase === "wetAcid" ? "primary" : "secondary"} onClick={step2} disabled={phase !== "dryAcid"} className="!min-h-[64px] !text-base">
          💧 2 · Pour water
        </Button>
        <Button variant={isBase ? "primary" : "secondary"} onClick={step3} disabled={!done.acidWet} className="!min-h-[64px] !text-base">
          🧼 3 · Try a base (NaOH)
        </Button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-2">
        <svg viewBox="0 0 640 380" className="block h-auto w-full select-none" role="img" aria-label={badge}>
          <SvgPill x={320} y={26} text={badge} size={16} fill={ionsFree ? (isBase ? "#eef2ff" : "#fff1f2") : "#f8fafc"} color={ionsFree ? (isBase ? "#3730a3" : "#be123c") : "#334155"} stroke={ionsFree ? (isBase ? "#a5b4fc" : "#fda4af") : "#cbd5e1"} />

          {/* pouring jug */}
          {phase === "pouring" && (
            <g>
              <g style={{ transformOrigin: "470px 80px", animation: "bottle-base 0.9s ease-in-out" }}>
                <path d="M440 60 h60 l-8 50 h-44 z" fill="#bae6fd" stroke="#334155" strokeWidth={3} />
              </g>
              <rect x={300} y={80} width={10} height={180} rx={5} fill="#7dd3fc" opacity={0.8} className="chem-drop" style={{ ["--fall" as string]: "0px", animationDuration: "0.9s" }} />
            </g>
          )}

          <Vessel x={BX} y={BY} w={BW} h={BH} level={wet ? 0.68 : 0} color={isBase ? "#e0e7ff" : "#e0f2fe"} opacity={0.75}>
            {/* dry crystals / pellets at the bottom */}
            {phase === "dryAcid" &&
              Array.from({ length: 10 }, (_, i) => (
                <g key={i} transform={`translate(${BX + 60 + ((i * 41) % 170)} ${BY + BH - 14 - (i % 2) * 7})`}>
                  <rect className="chem-settle" x={-6} y={-6} width={12} height={12} transform="rotate(45)" fill="white" stroke="#94a3b8" style={{ ["--from" as string]: "-120px" }} />
                </g>
              ))}
            {phase === "basePellets" &&
              Array.from({ length: 6 }, (_, i) => (
                <circle key={i} className="chem-settle" cx={BX + 80 + i * 26} cy={BY + BH - 14} r={8} fill="white" stroke="#94a3b8" style={{ ["--from" as string]: "-160px" }} />
              ))}
          </Vessel>

          {/* litmus strip */}
          <g>
            <rect x={BX + 22} y={BY - 40} width={20} height={210} rx={3} fill={litmusBase} />
            <rect x={BX + 22} y={BY + 80} width={20} height={90} style={{ fill: litmusNow, transition: "fill 700ms ease" }} />
            <text x={BX + 32} y={BY - 48} textAnchor="middle" fontSize={13} fontWeight={800} fill="#334155">
              {isBase ? "red litmus" : "blue litmus"}
            </text>
          </g>

          {/* conductivity tester: two electrodes, wires, a bulb */}
          <g>
            <rect x={BX + BW - 70} y={BY - 30} width={8} height={200} fill="#64748b" />
            <rect x={BX + BW - 44} y={BY - 30} width={8} height={200} fill="#64748b" />
            <path d={`M${BX + BW - 66} ${BY - 30} V60 H560 V96`} fill="none" stroke="#334155" strokeWidth={3} />
            <path d={`M${BX + BW - 40} ${BY - 30} V74 H590`} fill="none" stroke="#334155" strokeWidth={3} />
            <rect x={580} y={60} width={40} height={24} rx={4} fill="#334155" />
            <text x={600} y={76} textAnchor="middle" fontSize={11} fontWeight={800} fill="white">
              +  −
            </text>
            {ionsFree && <circle cx={560} cy={120} r={42} fill="#fde047" opacity={0.45} className="animate-pulse" />}
            <circle cx={560} cy={120} r={22} fill={ionsFree ? "#fde047" : "#e2e8f0"} stroke="#334155" strokeWidth={3} style={{ transition: "fill 400ms" }} />
            <rect x={550} y={140} width={20} height={14} fill="#94a3b8" stroke="#334155" strokeWidth={2} />
            <text x={560} y={180} textAnchor="middle" fontSize={13} fontWeight={800} fill={ionsFree ? "#a16207" : "#94a3b8"}>
              {ionsFree ? "bulb ON!" : "bulb off"}
            </text>
          </g>

          {/* particle-view lens */}
          {lens && phase !== "empty" && (
            <g>
              <circle cx={LX} cy={LY} r={LR} fill="white" opacity={0.92} />
              {SPOTS.map(([dx, dy], i) => {
                const [[ax, ay], [bx2, by2]] = SPLIT[i];
                const free = split && (phase === "wetAcid" || phase === "base");
                const pa = free ? [ax, ay] : [dx - 9, dy];
                const pb = free ? [bx2, by2] : [dx + 11, dy];
                const pairLabel = isBase ? "NaOH" : "HCl";
                return (
                  <g key={`${isBase}-${i}`}>
                    {!free && <line x1={LX + pa[0]} y1={LY + pa[1]} x2={LX + pb[0]} y2={LY + pb[1]} stroke="#334155" strokeWidth={4} />}
                    {[
                      { p: pa, s: A },
                      { p: pb, s: B },
                    ].map(({ p, s }, k) => (
                      <g key={k} style={{ transform: `translate(${LX + p[0]}px, ${LY + p[1]}px)`, transition: "transform 650ms cubic-bezier(0.34,1.56,0.64,1)" }}>
                        {free && s === B && <circle r={s.r + 7} fill={s.fill} opacity={0.25} className="animate-pulse" />}
                        <circle r={free ? s.r : s.r - 3} fill={s.fill} stroke="white" strokeWidth={2} />
                        {free && (
                          <text y={4} textAnchor="middle" fontSize={11} fontWeight={800} fill="white">
                            {s.label}
                          </text>
                        )}
                      </g>
                    ))}
                    {!free && i === 0 && (
                      <text x={LX + dx} y={LY + dy - 16} textAnchor="middle" fontSize={11} fontWeight={800} fill="#334155">
                        {pairLabel}
                      </text>
                    )}
                  </g>
                );
              })}
              <circle cx={LX} cy={LY} r={LR} fill="none" stroke="#334155" strokeWidth={6} />
              <path d={`M${LX + 54} ${LY + 54} l24 24`} stroke="#334155" strokeWidth={11} />
              <text x={LX} y={LY - LR - 8} textAnchor="middle" fontSize={12} fontWeight={800} fill="#475569">
                🔍 particle view
              </text>
            </g>
          )}
          <text x={BX + BW / 2} y={BY + BH + 30} textAnchor="middle" fontSize={14} fontWeight={800} fill="#475569">
            {phase === "empty" ? "empty beaker" : phase === "dryAcid" ? "dry acid, no water" : isBase ? "NaOH in water" : "acid in water"}
          </text>
        </svg>
        <div className="flex justify-center pb-1">
          <button type="button" onClick={() => setLens(!lens)} aria-pressed={lens} className="rounded-full px-3 py-1 font-display text-base font-semibold text-slate-500 hover:bg-slate-100">
            🔍 Particle view: {lens ? "on" : "off"}
          </button>
        </div>
      </div>

      {/* splash test */}
      <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-3">
        <div className="mb-2 text-center font-display text-lg font-semibold text-slate-800">The splash test 🧪</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="danger"
            onClick={() => {
              setPour("danger");
              setPourKey((k) => k + 1);
              setPourDone((p) => ({ ...p, dangerPour: 1 }));
            }}
            className="!text-base"
          >
            ⚠️ Pour water into acid
          </Button>
          <Button
            variant="success"
            onClick={() => {
              setPour("safe");
              setPourKey((k) => k + 1);
              setPourDone((p) => ({ ...p, safePour: 1 }));
            }}
            className="!text-base"
          >
            ✅ Pour acid slowly into water
          </Button>
        </div>
        {pour && (
          <svg key={pourKey} viewBox="0 0 640 170" className="mt-2 block h-auto w-full select-none">
            <Vessel x={250} y={40} w={140} h={110} level={0.6} color={pour === "danger" ? "#fecaca" : "#e0f2fe"} opacity={0.8} />
            {pour === "safe" && <circle cx={320} cy={110} r={60} fill="#fde68a" opacity={0.35} className="animate-pulse" />}
            {pour === "danger" &&
              [
                [-70, -40],
                [70, -46],
                [-40, -70],
                [40, -72],
                [0, -84],
              ].map(([dx, dy], i) => (
                <g key={i} className="chem-pop" style={{ animationDelay: `${i * 60}ms` }}>
                  <circle cx={320 + dx} cy={60 + dy * 0.5} r={9} fill="#f87171" />
                </g>
              ))}
            {/* thermometer */}
            <rect x={430} y={20} width={16} height={130} rx={8} fill="white" stroke="#475569" strokeWidth={2} />
            <rect x={434} y={pour === "danger" ? 26 : 96} width={8} height={pour === "danger" ? 120 : 50} rx={4} fill="#ef4444" style={{ transition: "all 600ms" }} />
            <circle cx={438} cy={150} r={11} fill="#ef4444" stroke="#475569" strokeWidth={2} />
            <SvgPill
              x={150}
              y={85}
              text={pour === "danger" ? "SPLASH! Too hot! 🥵" : "Warm and calm 🙂"}
              fill={pour === "danger" ? "#fff1f2" : "#ecfdf5"}
              color={pour === "danger" ? "#be123c" : "#047857"}
              stroke={pour === "danger" ? "#fda4af" : "#6ee7b7"}
              size={17}
            />
            <text x={520} y={60} fontSize={22} fontWeight={800} fill={pour === "danger" ? "#dc2626" : "#16a34a"}>
              {pour === "danger" ? "90 °C" : "35 °C"}
            </text>
          </svg>
        )}
        <p className={cx("mt-1 text-center text-base font-semibold", pour === "danger" ? "text-rose-700" : "text-slate-600")}>
          {pour === "danger"
            ? "Water poured into strong acid heats up all at once and can spit acid out!"
            : pour === "safe"
              ? "Acid added slowly to lots of water spreads the heat out safely."
              : "Which way is safe? Tap to find out."}
        </p>
      </div>
    </WidgetPanel>
  );
}
