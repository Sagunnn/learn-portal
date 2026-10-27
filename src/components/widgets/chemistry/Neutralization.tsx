import { useRef, useState } from "react";
import { confettiAt } from "../../../lib/confetti";
import { Button, cx } from "../../ui/primitives";
import { EquationBar, SvgPill, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Chip, useAnimationLoop } from "../physics/shared";
import Face from "../Face";
import { Chem, ChemSvg, Vessel, tex, uiColor } from "./chem";

/**
 * Station 2 — "Acid + Base Titration & Salt Factory". 20 mL of dilute acid with
 * universal indicator (pH 1). Each 0.1 mL from the burette neutralises a little
 * acid; at exactly 20.0 mL it's pH 7 (green). Neutral? Boil off the water to
 * crystallise the salt. Amounts are in hundredths of a millimole, so pH 7 is exact.
 */
const ACIDS = [
  { f: "HCl", name: "Hydrochloric acid", anion: "chloride" },
  { f: "H2SO4", name: "Sulphuric acid", anion: "sulphate" },
  { f: "HNO3", name: "Nitric acid", anion: "nitrate" },
];
const BASES = [
  { f: "NaOH", name: "Sodium hydroxide", metal: "Sodium" },
  { f: "KOH", name: "Potassium hydroxide", metal: "Potassium" },
  { f: "Mg(OH)2", name: "Magnesium hydroxide", metal: "Magnesium" },
];
// [acid][base] → balanced equation parts and salt formula
const REACTIONS: { a: string; b: string; salt: string; w: string }[][] = [
  [
    { a: "HCl", b: "NaOH", salt: "NaCl", w: "H2O" },
    { a: "HCl", b: "KOH", salt: "KCl", w: "H2O" },
    { a: "2HCl", b: "Mg(OH)2", salt: "MgCl2", w: "2H2O" },
  ],
  [
    { a: "H2SO4", b: "2NaOH", salt: "Na2SO4", w: "2H2O" },
    { a: "H2SO4", b: "2KOH", salt: "K2SO4", w: "2H2O" },
    { a: "H2SO4", b: "Mg(OH)2", salt: "MgSO4", w: "2H2O" },
  ],
  [
    { a: "HNO3", b: "NaOH", salt: "NaNO3", w: "H2O" },
    { a: "HNO3", b: "KOH", salt: "KNO3", w: "H2O" },
    { a: "2HNO3", b: "Mg(OH)2", salt: "Mg(NO3)2", w: "2H2O" },
  ],
];

const ACID_ML = 20;
const ACID_UNITS = 200; // 2.00 mmol of H⁺, in hundredths of a mmol
const BURETTE_ML = 50;

function phOf(excess: number, volumeMl: number) {
  if (excess === 0) return 7;
  const molar = Math.abs(excess) / 100 / volumeMl; // mmol / mL = mol / L
  const p = -Math.log10(molar);
  return excess > 0 ? p : 14 - p;
}

export default function Neutralization({ acid: a0 = 0, base: b0 = 0, onState }: { acid?: number; base?: number; onState?: (s: WidgetState) => void }) {
  const [acid, setAcid] = useState(a0);
  const [base, setBase] = useState(b0);
  const [baseT, setBaseT] = useState(0); // tenths of a mL of base added
  const [acidT, setAcidT] = useState(0); // tenths of a mL of acid added back
  const [tapOpen, setTapOpen] = useState(false);
  const [drops, setDrops] = useState<number[]>([]);
  const [overshoot, setOvershoot] = useState(false);
  const [evap, setEvap] = useState<null | number>(null); // 0..1 progress
  const flow = useRef(0);
  const beakerRef = useRef<SVGGElement>(null);

  const excess = ACID_UNITS + acidT - baseT;
  const volume = ACID_ML + baseT / 10 + acidT / 10;
  const ph = phOf(excess, volume);
  const neutral = excess === 0;
  const reacted = Math.min(ACID_UNITS + acidT, baseT);
  const temp = 25 + (reacted / ACID_UNITS) * 5;
  const crystallized = evap !== null && evap >= 1;
  const rx = REACTIONS[acid][base];

  useReportState({ acid, base, ph: Math.round(ph * 10) / 10, neutral: neutral ? 1 : 0, crystallized: crystallized ? 1 : 0, overshoot: overshoot ? 1 : 0 }, onState);

  const addBase = (tenths: number) => {
    if (evap !== null || baseT + tenths > BURETTE_ML * 10) return;
    const next = baseT + tenths;
    setBaseT(next);
    if (ACID_UNITS + acidT - next < 0) setOvershoot(true);
    setDrops((d) => [...d.slice(-4), Date.now() + Math.random()]);
  };

  useAnimationLoop(tapOpen, (dt) => {
    // 2 mL per second while the tap is open, in 0.1 mL steps
    flow.current += dt * 20;
    while (flow.current >= 1) {
      flow.current -= 1;
      addBase(1);
    }
  });

  useAnimationLoop(evap !== null && evap < 1, (dt) => {
    setEvap((e) => {
      const n = Math.min(1, (e ?? 0) + dt / 4);
      if (n >= 1 && (e ?? 0) < 1) setTimeout(() => confettiAt(beakerRef.current, 1.5), 0);
      return n;
    });
  });

  const reset = (nextAcid = acid, nextBase = base) => {
    setTapOpen(false);
    setAcid(nextAcid);
    setBase(nextBase);
    setBaseT(0);
    setAcidT(0);
    setOvershoot(false);
    setEvap(null);
    setDrops([]);
  };

  const saltName = `${BASES[base].metal} ${ACIDS[acid].anion}`;
  const level = evap === null ? volume / 80 : (volume / 80) * (1 - evap * 0.97);
  const bx = 300;
  const by = 190;
  const bw = 170;
  const bh = 140;
  const crystalCount = evap === null ? 0 : Math.floor(evap * 26);

  const status = crystallized
    ? `You made ${saltName.toLowerCase()} crystals!`
    : evap !== null
      ? "Boiling off the water…"
      : neutral
        ? "pH 7: perfectly neutral! Now evaporate the water to get the salt."
        : ph > 7
          ? "Too much base: it's turned basic (purple). Add acid drops to bring it back."
          : ph > 3
            ? "Nearly there! Go drop by drop."
            : "Still acidic. Add base from the burette.";

  return (
    <WidgetPanel>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-sm font-extrabold uppercase tracking-wider text-rose-600">Acid in the beaker</div>
          <div className="flex flex-wrap gap-1.5">
            {ACIDS.map((a, i) => (
              <Chip key={a.f} active={acid === i} onClick={() => reset(i, base)}>
                <Chem f={a.f} />
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-sm font-extrabold uppercase tracking-wider text-indigo-600">Base in the burette</div>
          <div className="flex flex-wrap gap-1.5">
            {BASES.map((b, i) => (
              <Chip key={b.f} active={base === i} onClick={() => reset(acid, i)}>
                <Chem f={b.f} />
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-b-4 border-slate-200 bg-gradient-to-b from-slate-50 to-white p-2">
        <svg viewBox="0 0 760 400" className="block h-auto w-full select-none">
          {/* stand */}
          <rect x={150} y={10} width={10} height={360} fill="#64748b" />
          <rect x={110} y={366} width={260} height={12} rx={4} fill="#475569" />
          <rect x={155} y={70} width={220} height={8} fill="#64748b" />
          {/* burette */}
          <Vessel x={372} y={20} w={26} h={130} level={(BURETTE_ML * 10 - baseT) / (BURETTE_ML * 10)} color="#c7d2fe" kind="tube" />
          {Array.from({ length: 6 }, (_, i) => (
            <line key={i} x1={372} x2={380} y1={26 + i * 20} y2={26 + i * 20} stroke="#475569" strokeWidth={1.5} />
          ))}
          <rect x={381} y={150} width={8} height={22} fill="#475569" />
          <g data-start role="button" tabIndex={0} aria-label={tapOpen ? "Close tap" : "Open tap"} className="cursor-pointer" onClick={() => evap === null && setTapOpen(!tapOpen)}>
            <rect x={350} y={140} width={70} height={40} fill="transparent" />
            <rect x={366} y={154} width={38} height={10} rx={5} fill={tapOpen ? "#10b981" : "#f43f5e"} transform={tapOpen ? "rotate(90 385 159)" : undefined} />
          </g>
          <text x={412} y={160} fontSize={12} fontWeight={800} fill="#4f46e5">
            <ChemSvg f={BASES[base].f} />
          </text>
          {drops.map((k) => (
            <circle key={k} className="chem-drop" cx={385} cy={176} r={4} fill="#a5b4fc" style={{ ["--fall" as string]: "60px" }} />
          ))}

          {/* tripod + Bunsen burner while evaporating */}
          {evap !== null && (
            <g>
              <path d={`M${bx + 20} ${by + bh + 6} L${bx + 4} 366 M${bx + bw - 20} ${by + bh + 6} L${bx + bw - 4} 366`} stroke="#334155" strokeWidth={5} />
              <rect x={bx + bw / 2 - 12} y={340} width={24} height={26} fill="#334155" />
              {!crystallized && (
                <g className="chem-flame">
                  <path d={`M${bx + bw / 2 - 12} 340 Q${bx + bw / 2} 290 ${bx + bw / 2 + 12} 340 Z`} fill="#60a5fa" opacity={0.8} />
                  <path d={`M${bx + bw / 2 - 6} 340 Q${bx + bw / 2} 306 ${bx + bw / 2 + 6} 340 Z`} fill="#fbbf24" />
                </g>
              )}
            </g>
          )}

          {/* beaker */}
          <g ref={beakerRef}>
            <Vessel x={bx} y={by} w={bw} h={bh} level={level} color={uiColor(ph)} opacity={0.82}>
              {Array.from({ length: crystalCount }, (_, i) => (
                <g key={i} transform={`translate(${bx + 16 + ((i * 53) % 140)} ${by + bh - 10 - Math.floor(i / 9) * 8}) rotate(${(i * 23) % 40})`}>
                  <rect className="chem-settle" x={-5} y={-5} width={10} height={10} rx={1.5} fill="white" stroke="#94a3b8" strokeWidth={1} style={{ ["--from" as string]: "-30px" }} />
                </g>
              ))}
            </Vessel>
          </g>
          {/* ripple where each drop lands, and the reading right above the liquid */}
          {evap === null && drops.length > 0 && (
            <ellipse key={drops[drops.length - 1]} cx={385} cy={by + bh - level * (bh - 6) + 2} rx={8} ry={3} fill="none" stroke="white" strokeWidth={2.5} className="chem-ripple" />
          )}
          {evap === null && (
            <SvgPill
              x={bx + bw / 2}
              y={Math.max(by + 18, by + bh - level * (bh - 6) - 22)}
              text={`pH ${ph.toFixed(1)}${neutral ? " · Neutral!" : ph > 7 ? " · Basic" : " · Acidic"}`}
              fill={uiColor(ph)}
              color="white"
              stroke="white"
              size={15}
            />
          )}
          {evap === null && <Face x={bx + bw / 2} y={by + bh - 34} scale={1.3} mood={neutral ? "happy" : ph < 4 ? "sour" : ph > 7 ? "wow" : "curious"} />}
          {/* heat shimmer while neutralising or boiling */}
          {((reacted > 0 && !neutral && ph < 7) || (evap !== null && !crystallized)) && (
            <g className="chem-shimmer">
              <path d={`M${bx + 40} ${by - 8} q6 -10 0 -20 q-6 -10 0 -20`} stroke="#f59e0b" strokeWidth={2} fill="none" opacity={0.5} />
              <path d={`M${bx + 120} ${by - 8} q6 -10 0 -20 q-6 -10 0 -20`} stroke="#f59e0b" strokeWidth={2} fill="none" opacity={0.5} />
            </g>
          )}
          {evap !== null && !crystallized && (
            <g>
              {[0, 1, 2, 3].map((i) => (
                <g key={i} className="chem-steam" style={{ animationDelay: `${i * 0.6}s` }}>
                  <circle cx={bx + 40 + i * 30} cy={by - 4} r={12} fill="#e2e8f0" opacity={0.8} />
                </g>
              ))}
              <text x={bx - 20} y={by - 30} textAnchor="end" fontSize={14} fontWeight={800} fill="#64748b">
                <ChemSvg f="H2O" /> ↑ steam
              </text>
            </g>
          )}

          {/* thermometer */}
          <rect x={bx + bw + 30} y={by - 20} width={16} height={150} rx={8} fill="white" stroke="#475569" strokeWidth={2} />
          <rect x={bx + bw + 34} y={by + 120 - ((temp - 20) / 15) * 130} width={8} height={((temp - 20) / 15) * 130 + 4} rx={4} fill="#ef4444" style={{ transition: "all 700ms ease" }} />
          <circle cx={bx + bw + 38} cy={by + 134} r={12} fill="#ef4444" stroke="#475569" strokeWidth={2} />
          <text x={bx + bw + 56} y={by + 40} fontSize={16} fontWeight={800} fill="#b91c1c">
            {temp.toFixed(1)} °C
          </text>

          {/* pH meter */}
          <g transform="translate(600 235)">
            <rect width={140} height={90} rx={16} fill="#0f172a" />
            <text x={70} y={28} textAnchor="middle" fontSize={13} fontWeight={800} fill="#94a3b8">
              pH meter
            </text>
            <text x={70} y={70} textAnchor="middle" fontSize={36} fontWeight={800} fill={uiColor(ph)} style={{ transition: "fill 700ms" }}>
              {ph.toFixed(1)}
            </text>
          </g>
          <text x={bx + bw / 2} y={392} textAnchor="middle" fontSize={13} fontWeight={700} fill="#475569">
            {(baseT / 10).toFixed(1)} mL of <ChemSvg f={BASES[base].f} /> added
          </text>
        </svg>
      </div>

      <EquationBar
        tex={`${tex(rx.a, "aq")} + ${tex(rx.b, "aq")} \\rightarrow ${tex(rx.salt, crystallized ? "s" : "aq")} + ${tex(rx.w, "l")} + \\text{heat}`}
      >
        <span className={cx(neutral ? "font-bold text-emerald-700" : ph > 7 ? "text-violet-700" : undefined)}>{status}</span>
      </EquationBar>

      <div className="flex flex-wrap gap-2">
        <Button variant={tapOpen ? "danger" : "primary"} onClick={() => setTapOpen(!tapOpen)} disabled={evap !== null}>
          {tapOpen ? "⏸ Close tap" : "🚰 Open tap"}
        </Button>
        <Button variant="secondary" onClick={() => addBase(10)} disabled={evap !== null || tapOpen}>
          +1 mL
        </Button>
        <Button variant="secondary" onClick={() => addBase(1)} disabled={evap !== null || tapOpen}>
          💧 1 drop (0.1 mL)
        </Button>
        <Button variant="secondary" className="text-rose-700" onClick={() => setAcidT(acidT + 1)} disabled={evap !== null || ph <= 7}>
          🧪 1 drop of acid
        </Button>
        <Button
          variant="energy"
          onClick={() => {
            setTapOpen(false);
            setEvap(0);
          }}
          disabled={!neutral || evap !== null}
        >
          🔥 Evaporate water
        </Button>
        <Button variant="ghost" onClick={() => reset()}>
          ↺ Reset
        </Button>
      </div>

      {crystallized && (
        <div className="animate-rise rounded-2xl border-2 border-b-4 border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900">
          🧂 <strong>{saltName}</strong> (<Chem f={rx.salt} />) crystals!{" "}
          {rx.salt === "NaCl" ? "That's common table salt." : `Its name: metal from the base (${BASES[base].metal.toLowerCase()}) + ending from the acid (${ACIDS[acid].anion}).`}
        </div>
      )}
    </WidgetPanel>
  );
}
