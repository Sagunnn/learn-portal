import { useEffect, useRef, useState } from "react";
import { confettiAt } from "../../../lib/confetti";
import { Button, cx } from "../../ui/primitives";
import { EquationBar, Slider, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Chip, useAnimationLoop } from "../physics/shared";
import Face from "../Face";
import { Bubbles, ChemSvg, Vessel, tex } from "./chem";

/**
 * Station 3 — "Bubble, Pop & Precipitate". Three classic reactions and the four
 * signs of a chemical change: colour change, gas, temperature change, precipitate.
 *  A: Zn + HCl → H₂ (pop test)   B: carbonate + acid → CO₂ (lime water milky)
 *  C: Fe nail in CuSO₄ → FeSO₄ (pale green) + Cu (reddish-brown coating)
 */
type Sign = "colour" | "gas" | "temp" | "precipitate";
const SIGNS: { id: Sign; label: string; icon: string }[] = [
  { id: "colour", label: "Colour change", icon: "🎨" },
  { id: "gas", label: "Gas given off", icon: "🫧" },
  { id: "temp", label: "Temperature change", icon: "🌡️" },
  { id: "precipitate", label: "Precipitate forms", icon: "⬇️" },
];

const mix = (a: number[], b: number[], t: number) => {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

type Match = "idle" | "moving" | "done";

export default function ReactionLab({ onState }: { onState?: (s: WidgetState) => void }) {
  const [tab, setTab] = useState(0);
  const [signs, setSigns] = useState<Set<Sign>>(() => new Set());
  // A
  const [zinc, setZinc] = useState(false);
  const [matchA, setMatchA] = useState<Match>("idle");
  const [popped, setPopped] = useState(false);
  // B
  const [carbonate, setCarbonate] = useState<"NaHCO3" | "CaCO3">("NaHCO3");
  const [acidB, setAcidB] = useState<"vinegar" | "HCl">("vinegar");
  const [added, setAdded] = useState(false);
  const [milky, setMilky] = useState(0);
  const [matchB, setMatchB] = useState<Match>("idle");
  // C
  const [minutes, setMinutes] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const see = (...s: Sign[]) => setSigns((prev) => new Set([...prev, ...s]));

  useAnimationLoop(added && milky < 1, (dt) => setMilky((m) => Math.min(1, m + dt / 4)));
  useEffect(() => {
    if (milky >= 1) see("precipitate");
  }, [milky]);

  useReportState(
    { zinc: zinc ? 1 : 0, popped: popped ? 1 : 0, limeMilky: milky >= 1 ? 1 : 0, minutes, signs: signs.size },
    onState,
  );

  const bringMatch = (which: "A" | "B") => {
    const set = which === "A" ? setMatchA : setMatchB;
    set("moving");
    later(() => {
      set("done");
      if (which === "A" && zinc) {
        setPopped(true);
        confettiAt(svgRef.current, 0.8);
      }
    }, 750);
  };

  const resetB = () => {
    setAdded(false);
    setMilky(0);
    setMatchB("idle");
  };

  // ---- shared drawing bits ----
  const fx = 230;
  const fy = 90;
  const fw = 180;
  const fh = 220;
  const mouthX = fx + fw / 2;
  /** Matchstick resting at the top right; moves so its head reaches `to`. */
  const matchStick = (state: Match, out: boolean, to: { x: number; y: number }, onTap?: () => void) => {
    const atMouth = state !== "idle";
    return (
      <g
        role="button"
        aria-label="Bring a burning matchstick"
        className="cursor-pointer"
        onClick={() => state !== "moving" && onTap?.()}
        style={{ transform: atMouth ? `translate(${to.x - 620}px, ${to.y - 120}px)` : "translate(0, 0)", transition: "transform 700ms ease-in-out" }}
      >
        <rect x={600} y={80} width={110} height={100} fill="transparent" />
        <line x1={620} y1={120} x2={700} y2={170} stroke="#a16207" strokeWidth={6} strokeLinecap="round" />
        <circle cx={620} cy={120} r={7} fill="#b91c1c" />
        {!(state === "done" && out) && (
          <g className="chem-flame">
            <path d="M612 116 Q620 86 628 116 Z" fill="#f97316" />
            <path d="M616 116 Q620 98 624 116 Z" fill="#fde047" />
          </g>
        )}
        {state === "done" && out && <path d="M620 110 q6 -10 0 -20 q-6 -10 0 -20" stroke="#94a3b8" strokeWidth={3} fill="none" className="chem-steam" />}
      </g>
    );
  };

  // ---- reaction C colours ----
  const t = minutes / 20;
  const cuso4 = [29, 143, 224];
  const feso4 = [190, 236, 200];

  const equations = [
    `${tex("Zn", "s")} + ${tex("2HCl", "aq")} \\rightarrow ${tex("ZnCl2", "aq")} + ${tex("H2", "up")}`,
    acidB === "HCl"
      ? carbonate === "NaHCO3"
        ? `${tex("NaHCO3", "s")} + ${tex("HCl", "aq")} \\rightarrow ${tex("NaCl", "aq")} + ${tex("H2O", "l")} + ${tex("CO2", "up")}`
        : `${tex("CaCO3", "s")} + ${tex("2HCl", "aq")} \\rightarrow ${tex("CaCl2", "aq")} + ${tex("H2O", "l")} + ${tex("CO2", "up")}`
      : carbonate === "NaHCO3"
        ? `${tex("NaHCO3", "s")} + ${tex("CH3COOH", "aq")} \\rightarrow ${tex("CH3COONa", "aq")} + ${tex("H2O", "l")} + ${tex("CO2", "up")}`
        : `${tex("CaCO3", "s")} + ${tex("2CH3COOH", "aq")} \\rightarrow ${tex("(CH3COO)2Ca", "aq")} + ${tex("H2O", "l")} + ${tex("CO2", "up")}`,
    `${tex("Fe", "s")} + ${tex("CuSO4", "aq")} \\rightarrow ${tex("FeSO4", "aq")} + ${tex("Cu", "s")}`,
  ];

  return (
    <WidgetPanel>
      <div className="flex flex-wrap gap-2">
        {["A · Acid + metal", "B · Acid + carbonate", "C · Displacement"].map((l, i) => (
          <Chip key={l} active={tab === i} onClick={() => setTab(i)}>
            {l}
          </Chip>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-b-4 border-slate-200 bg-gradient-to-b from-slate-50 to-white p-2">
        <svg ref={svgRef} viewBox="0 0 760 360" className="block h-auto w-full select-none">
          <rect x={0} y={318} width={760} height={42} fill="#d6a26b" />

          {tab === 0 && (
            <g>
              <Vessel x={fx} y={fy} w={fw} h={fh} level={0.42} color="#e0f2fe" kind="flask">
                {zinc && (
                  <>
                    {Array.from({ length: 9 }, (_, i) => (
                      <g key={i} transform={`translate(${fx + 40 + ((i * 41) % 100)} ${fy + fh - 14 - (i % 2) * 6})`}>
                        <polygon className="chem-settle" points="0,0 9,-3 14,4 8,10 -1,7" fill="#94a3b8" stroke="#475569" style={{ ["--from" as string]: "-110px", animationDuration: "0.8s" }} />
                      </g>
                    ))}
                    <Bubbles x={fx + 30} y={fy + fh * 0.6} w={fw - 60} h={fh * 0.38} count={22} size={4} fast />
                  </>
                )}
              </Vessel>
              <Face x={fx + fw / 2} y={fy + fh - 45} scale={1.2} mood={popped && matchA === "done" ? "wow" : zinc ? "happy" : "calm"} />
              {zinc && <Bubbles x={mouthX - 14} y={fy - 70} w={28} h={70} count={6} size={5} color="#e0f2fe" />}
              <text x={fx + fw / 2} y={fy + fh + 30} textAnchor="middle" fontSize={14} fontWeight={800} fill="#334155">
                dilute <ChemSvg f="HCl" />
                {zinc && " + zinc granules"}
              </text>
              {zinc && (
                <text x={fx + fw + 16} y={fy + 70} fontSize={15} fontWeight={800} fill="#4f46e5">
                  <ChemSvg f="H2" /> gas bubbles ↑
                </text>
              )}
              {matchStick(matchA, true, { x: mouthX, y: fy - 40 }, () => bringMatch("A"))}
              {matchA === "idle" && (
                <text x={665} y={200} textAnchor="middle" fontSize={13} fontWeight={800} fill="#64748b">
                  tap the match
                </text>
              )}
              {/* zinc jar: tap to drop granules in */}
              {!zinc && (
                <g
                  data-start
                  role="button"
                  aria-label="Drop zinc granules into the acid"
                  className="cursor-pointer"
                  onClick={() => {
                    setZinc(true);
                    see("gas", "temp");
                  }}
                >
                  <rect x={60} y={200} width={90} height={110} rx={16} fill="#e2e8f0" stroke="#334155" strokeWidth={3} />
                  <rect x={70} y={186} width={70} height={18} rx={6} fill="#94a3b8" stroke="#334155" strokeWidth={3} />
                  {[0, 1, 2, 3, 4].map((i) => (
                    <polygon key={i} points="0,0 9,-3 14,4 8,10 -1,7" transform={`translate(${76 + (i % 3) * 22} ${262 + Math.floor(i / 3) * 16})`} fill="#94a3b8" stroke="#475569" />
                  ))}
                  <text x={105} y={238} textAnchor="middle" fontSize={20} fontWeight={800} fill="#334155">
                    Zn
                  </text>
                  <text x={105} y={336} textAnchor="middle" fontSize={13} fontWeight={800} fill="#64748b">
                    tap to drop in
                  </text>
                </g>
              )}
              {matchA === "done" && zinc && (
                <g transform={`translate(${mouthX} ${fy - 40})`}>
                  <polygon className="chem-pop" points="0,-46 12,-14 46,-14 18,6 28,40 0,20 -28,40 -18,6 -46,-14 -12,-14" fill="#fde047" stroke="#f59e0b" strokeWidth={3} />
                  <text className="chem-pop" y={8} textAnchor="middle" fontSize={22} fontWeight={900} fill="#b45309">
                    POP!
                  </text>
                </g>
              )}
              {matchA === "done" && !zinc && (
                <text x={mouthX} y={fy - 40} textAnchor="middle" fontSize={14} fontWeight={800} fill="#64748b">
                  No gas yet. Add the zinc first!
                </text>
              )}
            </g>
          )}

          {tab === 1 && (
            <g>
              <Vessel x={60} y={110} w={170} h={200} level={0.45} color={acidB === "vinegar" ? "#fef9c3" : "#e0f2fe"} kind="flask">
                {added && (
                  <>
                    {Array.from({ length: 10 }, (_, i) => (
                      <rect
                        key={i}
                        className="chem-settle"
                        x={95 + ((i * 37) % 95)}
                        y={110 + 200 - 14 - (i % 2) * 6}
                        width={carbonate === "CaCO3" ? 14 : 8}
                        height={carbonate === "CaCO3" ? 10 : 6}
                        rx={2}
                        fill="white"
                        stroke="#94a3b8"
                        style={{ ["--from" as string]: "-110px", animationDuration: "0.8s" }}
                      />
                    ))}
                    <Bubbles x={90} y={210} w={110} h={95} count={26} size={4} fast />
                  </>
                )}
              </Vessel>
              {/* stopper + delivery tube */}
              <rect x={128} y={100} width={34} height={16} rx={4} fill="#78350f" />
              <path d="M145 100 V60 H520 V250" fill="none" stroke="#94a3b8" strokeWidth={8} strokeLinejoin="round" opacity={0.7} />
              <path d="M145 100 V60 H520 V250" fill="none" stroke="#f8fafc" strokeWidth={3} strokeLinejoin="round" />
              <Vessel x={455} y={170} w={130} h={140} level={0.62} color={mix([241, 245, 249], [245, 245, 244], milky)} opacity={0.35 + milky * 0.6}>
                {added && <Bubbles x={505} y={240} w={30} h={60} count={8} size={4} />}
                {milky >= 1 &&
                  Array.from({ length: 22 }, (_, i) => (
                    <circle key={i} className="chem-settle" cx={465 + ((i * 29) % 110)} cy={302 - (i % 3) * 3} r={3} fill="white" stroke="#d6d3d1" style={{ ["--from" as string]: "-50px", animationDelay: `${(i % 6) * 0.3}s` }} />
                  ))}
              </Vessel>
              <Face x={145} y={265} scale={1.05} mood={added ? "happy" : "calm"} />
              <Face x={520} y={270} scale={1.05} mood={milky >= 1 ? "wow" : added ? "curious" : "calm"} />
              <text x={145} y={340} textAnchor="middle" fontSize={13} fontWeight={800} fill="#334155">
                {acidB === "vinegar" ? "vinegar" : "dilute HCl"} + {carbonate === "NaHCO3" ? "baking soda" : "marble chips"}
              </text>
              <text x={520} y={340} textAnchor="middle" fontSize={13} fontWeight={800} fill="#334155">
                lime water <ChemSvg f="Ca(OH)2" />
              </text>
              {added && (
                <text x={300} y={50} textAnchor="middle" fontSize={14} fontWeight={800} fill="#4f46e5">
                  <ChemSvg f="CO2" /> →
                </text>
              )}
              {milky > 0.05 && (
                <text x={600} y={200} fontSize={14} fontWeight={800} fill="#64748b">
                  {milky >= 1 ? "Milky! ✓" : "turning milky…"}
                </text>
              )}
              {matchStick(matchB, true, { x: 145, y: 84 }, () => bringMatch("B"))}
              {/* carbonate jar: tap to tip it in */}
              {!added && (
                <g
                  data-start
                  role="button"
                  aria-label="Add the carbonate"
                  className="cursor-pointer"
                  onClick={() => {
                    setAdded(true);
                    see("gas");
                  }}
                >
                  <rect x={270} y={220} width={100} height={90} rx={16} fill="#f8fafc" stroke="#334155" strokeWidth={3} />
                  {Array.from({ length: 8 }, (_, i) => (
                    <rect key={i} x={284 + (i % 4) * 19} y={262 + Math.floor(i / 4) * 16} width={carbonate === "CaCO3" ? 14 : 9} height={carbonate === "CaCO3" ? 10 : 7} rx={2} fill="white" stroke="#94a3b8" />
                  ))}
                  <text x={320} y={248} textAnchor="middle" fontSize={14} fontWeight={800} fill="#334155">
                    {carbonate === "NaHCO3" ? "baking soda" : "marble"}
                  </text>
                  <text x={320} y={330} textAnchor="middle" fontSize={13} fontWeight={800} fill="#64748b">
                    tap to tip in
                  </text>
                </g>
              )}
              {matchB === "done" && (
                <text x={300} y={30} textAnchor="middle" fontSize={14} fontWeight={800} fill="#b91c1c">
                  {added ? "The flame goes out: CO₂ doesn't let things burn." : "No gas yet: the match keeps burning."}
                </text>
              )}
            </g>
          )}

          {tab === 2 && (
            <g>
              <Vessel x={250} y={90} w={190} h={220} level={0.72} color={mix(cuso4, feso4, t)} opacity={0.85}>
                {/* iron nail */}
                <g transform="rotate(8 345 200)">
                  <rect x={334} y={30} width={22} height={10} rx={3} fill="#94a3b8" stroke="#475569" strokeWidth={2} />
                  <path d="M339 40 H351 V250 L345 270 L339 250 Z" fill="#cbd5e1" stroke="#475569" strokeWidth={2} />
                  <path d="M339 150 H351 V250 L345 270 L339 250 Z" fill="#9a3412" style={{ opacity: t * 0.95, transition: "opacity 700ms" }} />
                  {Array.from({ length: 10 }, (_, i) => (
                    <circle key={i} cx={340 + (i % 3) * 5} cy={160 + i * 9} r={2.5} fill="#7c2d12" style={{ opacity: t, transition: "opacity 700ms" }} />
                  ))}
                </g>
              </Vessel>
              <text x={345} y={340} textAnchor="middle" fontSize={13} fontWeight={800} fill="#334155">
                iron nail in <ChemSvg f="CuSO4" /> solution · {minutes} min
              </text>
              <g transform="translate(520 110)">
                <rect width={190} height={92} rx={14} fill="white" stroke="#e2e8f0" strokeWidth={2} />
                <circle cx={22} cy={28} r={10} fill={mix(cuso4, feso4, 0)} />
                <text x={40} y={33} fontSize={13} fontWeight={700} fill="#334155">
                  blue: <ChemSvg f="CuSO4" />
                </text>
                <circle cx={22} cy={62} r={10} fill={mix(cuso4, feso4, 1)} stroke="#94a3b8" />
                <text x={40} y={67} fontSize={13} fontWeight={700} fill="#334155">
                  pale green: <ChemSvg f="FeSO4" />
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <EquationBar tex={equations[tab]}>
        {tab === 0 &&
          (popped ? "POP! The squeaky pop proves the gas is hydrogen." : zinc ? "Fizzing! The flask gets a little warm. Test the gas with a burning match." : "Drop in the zinc granules.")}
        {tab === 1 &&
          (milky >= 1
            ? "Lime water turned milky: the gas is carbon dioxide. The white solid is chalk (calcium carbonate) settling out."
            : added
              ? "Fizz! CO₂ bubbles through the tube into the lime water…"
              : "Add the carbonate and watch the second beaker.")}
        {tab === 2 &&
          (minutes === 0
            ? "Fast-forward time with the slider."
            : minutes < 20
              ? "Iron is more reactive than copper, so it pushes copper out of the solution."
              : "Blue → pale green, and the nail is coated with reddish-brown copper.")}
      </EquationBar>

      {tab === 1 && (
        <div className="flex flex-wrap items-center gap-2 text-base font-bold text-slate-600">
          <span>Acid:</span>
          <Chip active={acidB === "vinegar"} onClick={() => (setAcidB("vinegar"), resetB())} tone="slate">
            Vinegar
          </Chip>
          <Chip active={acidB === "HCl"} onClick={() => (setAcidB("HCl"), resetB())} tone="slate">
            Dilute HCl
          </Chip>
          <span className="ml-2">Carbonate:</span>
          <Chip active={carbonate === "NaHCO3"} onClick={() => (setCarbonate("NaHCO3"), resetB())} tone="slate">
            Baking soda
          </Chip>
          <Chip active={carbonate === "CaCO3"} onClick={() => (setCarbonate("CaCO3"), resetB())} tone="slate">
            Marble chips
          </Chip>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tab === 0 && (
          <>
            <Button
              onClick={() => {
                setZinc(true);
                see("gas", "temp");
              }}
              disabled={zinc}
            >
              ⚙️ Drop zinc granules
            </Button>
            <Button variant="energy" onClick={() => bringMatch("A")} disabled={matchA === "moving"}>
              🔥 Bring a burning matchstick
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setZinc(false);
                setMatchA("idle");
              }}
            >
              ↺ Reset
            </Button>
          </>
        )}
        {tab === 1 && (
          <>
            <Button
              onClick={() => {
                setAdded(true);
                see("gas");
              }}
              disabled={added}
            >
              🥄 Add {carbonate === "NaHCO3" ? "baking soda" : "marble chips"}
            </Button>
            <Button variant="energy" onClick={() => bringMatch("B")} disabled={matchB === "moving"}>
              🔥 Bring a burning matchstick
            </Button>
            <Button variant="ghost" onClick={resetB}>
              ↺ Reset
            </Button>
          </>
        )}
      </div>
      {tab === 2 && (
        <Slider
          label="⏩ Fast-forward time"
          value={minutes}
          min={0}
          max={20}
          color="#16a34a"
          unit="min"
          onChange={(m) => {
            setMinutes(m);
            if (m > 0) see("colour");
          }}
          presets={[0, 5, 10, 20].map((m) => ({ label: m === 0 ? "Start" : `${m} min`, value: m }))}
        />
      )}

      <div>
        <div className="mb-2 text-base font-extrabold text-slate-800">Signs of a chemical reaction spotted · {signs.size}/4</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SIGNS.map((s) => (
            <div
              key={s.id}
              className={cx(
                "flex items-center gap-2 rounded-2xl border-2 border-b-4 px-3 py-2 text-base font-bold transition-colors duration-500",
                signs.has(s.id) ? "animate-pop border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-400",
              )}
            >
              <span aria-hidden className={signs.has(s.id) ? undefined : "grayscale"}>
                {s.icon}
              </span>
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </WidgetPanel>
  );
}
