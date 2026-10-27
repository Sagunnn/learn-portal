import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../ui/primitives";
import { WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Chip } from "../physics/shared";
import Face, { type Mood } from "../Face";
import { Chem, Vessel, phKind } from "./chem";

/**
 * Station 1 — "Dropper & Colour Detective". Pick an indicator, then click a tube.
 * Litmus strips dip in and change colour; drops tint the liquid (700 ms fade).
 * Mystery mode hides the labels so the student has to work out which is which.
 */
type Liquid = { id: string; name: string; short: string; ph: number; tint: string };
const LIQUIDS: Liquid[] = [
  { id: "lemon", name: "Lemon juice", short: "🍋 Lemon", ph: 2.2, tint: "#fef9c3" },
  { id: "stomach", name: "Stomach acid (HCl)", short: "Stomach acid", ph: 1.5, tint: "#f1f5f9" },
  { id: "water", name: "Pure water", short: "💧 Water", ph: 7, tint: "#e0f2fe" },
  { id: "soda", name: "Baking soda solution", short: "Baking soda", ph: 8.3, tint: "#f8fafc" },
  { id: "soap", name: "Soap water", short: "🧼 Soap", ph: 10, tint: "#e0e7ff" },
  { id: "drain", name: "Drain cleaner (NaOH)", short: "Drain cleaner", ph: 13.5, tint: "#f1f5f9" },
];

type Tool = "redLitmus" | "blueLitmus" | "phenol" | "methyl" | "turmeric" | "rose";
const TOOLS: { id: Tool; label: string; icon: string; kind: "strip" | "drop" }[] = [
  { id: "redLitmus", label: "Red litmus", icon: "🟥", kind: "strip" },
  { id: "blueLitmus", label: "Blue litmus", icon: "🟦", kind: "strip" },
  { id: "phenol", label: "Phenolphthalein", icon: "💧", kind: "drop" },
  { id: "methyl", label: "Methyl orange", icon: "🟠", kind: "drop" },
  { id: "turmeric", label: "Turmeric", icon: "🟡", kind: "drop" },
  { id: "rose", label: "China rose", icon: "🌺", kind: "drop" },
];

/** Colour and name each indicator shows at a pH. `null` colour = no change (stays colourless). */
export function indicatorResult(tool: Tool, ph: number): { color: string | null; word: string } {
  const k = phKind(ph);
  switch (tool) {
    case "redLitmus":
      return k === "base" ? { color: "#3b82f6", word: "turns blue" } : { color: "#ef4444", word: "stays red" };
    case "blueLitmus":
      return k === "acid" ? { color: "#ef4444", word: "turns red" } : { color: "#3b82f6", word: "stays blue" };
    case "phenol":
      return ph >= 9 ? { color: "#db2777", word: "bright pink" } : ph >= 8.2 ? { color: "#f9a8d4", word: "light pink" } : { color: null, word: "colourless" };
    case "methyl":
      return ph < 3.1 ? { color: "#dc2626", word: "red" } : ph <= 4.4 ? { color: "#f97316", word: "orange" } : { color: "#facc15", word: "yellow" };
    case "turmeric":
      return k === "base" ? { color: "#b45309", word: "reddish-brown" } : { color: "#eab308", word: "yellow" };
    case "rose":
      return k === "acid" ? { color: "#be185d", word: "dark pink" } : k === "base" ? { color: "#16a34a", word: "green" } : { color: "#c4b5fd", word: "no change" };
  }
}

interface TubeState {
  tint: string | null; // last drop indicator colour
  strip: { tool: Tool; color: string } | null;
  tests: Partial<Record<Tool, string>>; // tool → word
  last: Tool | null;
  anim: { tool: Tool; key: number } | null;
}
const empty = (): TubeState => ({ tint: null, strip: null, tests: {}, last: null, anim: null });
const MOOD: Record<string, Mood> = { Acid: "sour", Base: "wow", Neutral: "happy" };

/** What the evidence so far proves (null = not enough tests yet). */
function verdictFor(t: TubeState): "Acid" | "Base" | "Neutral" | null {
  const x = t.tests;
  if (x.blueLitmus === "turns red" || x.methyl === "red" || x.rose === "dark pink") return "Acid";
  if (x.redLitmus === "turns blue" || x.phenol?.includes("pink") || x.turmeric === "reddish-brown" || x.rose === "green") return "Base";
  if ((x.redLitmus === "stays red" && x.blueLitmus === "stays blue") || x.rose === "no change") return "Neutral";
  return null;
}

const TUBE_W = 50;
const TUBE_H = 170;
const GAP = 122;
const X0 = 46;

export default function IndicatorLab({ onState }: { onState?: (s: WidgetState) => void }) {
  const [tool, setTool] = useState<Tool>("redLitmus");
  const [tubes, setTubes] = useState<TubeState[]>(() => LIQUIDS.map(empty));
  const [mystery, setMystery] = useState(false);
  const [order, setOrder] = useState(() => LIQUIDS.map((_, i) => i));
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const apply = (slot: number) => {
    const li = order[slot];
    const liquid = LIQUIDS[li];
    const def = TOOLS.find((t) => t.id === tool)!;
    const res = indicatorResult(tool, liquid.ph);
    const key = Date.now();
    setTubes((ts) => ts.map((t, i) => (i === li ? { ...t, anim: { tool, key } } : t)));
    // Let the dip / drop animation play before the colour changes.
    later(() => {
      setTubes((ts) =>
        ts.map((t, i) => {
          if (i !== li) return t;
          const tests = { ...t.tests, [tool]: res.word };
          t = { ...t, last: tool };
          if (def.kind === "strip") {
            const original = tool === "redLitmus" ? "#ef4444" : "#3b82f6";
            return { ...t, tests, strip: { tool, color: res.color ?? original } };
          }
          return { ...t, tests, tint: res.color ?? t.tint };
        }),
      );
    }, def.kind === "strip" ? 550 : 420);
    later(() => setTubes((ts) => ts.map((t, i) => (i === li && t.anim?.key === key ? { ...t, anim: null } : t))), 1200);
  };

  const isBaseFound = (t: TubeState) => t.tests.phenol?.includes("pink") && t.tests.redLitmus === "turns blue";
  const foundBase = tubes.some(isBaseFound);
  const tested = tubes.filter((t) => Object.keys(t.tests).length > 0).length;
  useReportState({ foundBase: foundBase ? 1 : 0, mystery: mystery ? 1 : 0, tested }, onState);

  const toggleMystery = () => {
    const next = !mystery;
    setMystery(next);
    setTubes(LIQUIDS.map(empty));
    // Shuffle so position gives nothing away.
    setOrder(next ? [...order].sort(() => Math.random() - 0.5) : LIQUIDS.map((_, i) => i));
  };

  const toolDef = TOOLS.find((t) => t.id === tool)!;
  const letters = useMemo(() => ["A", "B", "C", "D", "E", "F"], []);

  return (
    <WidgetPanel>
      <div>
        <div className="mb-2 text-base font-bold text-slate-600">1 · Pick an indicator</div>
        <div className="flex flex-wrap gap-2">
          {TOOLS.map((t) => (
            <Chip key={t.id} active={tool === t.id} onClick={() => setTool(t.id)}>
              <span aria-hidden>{t.icon}</span> {t.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-base font-bold text-slate-600">
        <span>2 · Click a tube to {toolDef.kind === "strip" ? "dip the strip" : "add a few drops"}</span>
        <span className="flex gap-2">
          <Button size="sm" variant={mystery ? "primary" : "secondary"} onClick={toggleMystery} aria-pressed={mystery}>
            🕵️ Mystery mode {mystery ? "on" : "off"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setTubes(LIQUIDS.map(empty))}>
            🚿 Rinse all
          </Button>
        </span>
      </div>

      <div className="rounded-2xl border-2 border-b-4 border-slate-200 bg-gradient-to-b from-slate-50 to-white p-2">
        <svg viewBox="0 -10 760 340" className="block h-auto w-full select-none">
          <rect x={0} y={292} width={760} height={38} fill="#d6a26b" />
          <rect x={20} y={262} width={720} height={30} rx={6} fill="#78350f" opacity={0.85} />
          {order.map((li, slot) => {
            const liquid = LIQUIDS[li];
            const t = tubes[li];
            const x = X0 + slot * GAP;
            const y = 70;
            const anim = t.anim;
            const animTool = anim && TOOLS.find((d) => d.id === anim.tool)!;
            const found = isBaseFound(t);
            return (
              <g
                key={li}
                role="button"
                tabIndex={0}
                {...(slot === 0 ? { "data-start": true } : {})}
                aria-label={`Test tube ${mystery ? letters[slot] : liquid.name}`}
                onClick={() => apply(slot)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), apply(slot))}
                className="cursor-pointer outline-none [&:focus-visible>rect.focus]:opacity-100"
              >
                <rect className="focus" x={x - 10} y={y - 30} width={TUBE_W + 20} height={TUBE_H + 52} rx={14} fill="none" stroke="#6366f1" strokeWidth={3} opacity={0} />
                <rect x={x - 6} y={y + 40} width={TUBE_W + 12} height={8} rx={3} fill="#94a3b8" />
                <Vessel x={x} y={y} w={TUBE_W} h={TUBE_H} level={0.62} color={t.tint ?? liquid.tint} kind="tube" opacity={t.tint ? 0.9 : 0.75} />
                {/* litmus strip resting in the tube */}
                {t.strip && !anim && (
                  <g>
                    <rect x={x + TUBE_W / 2 - 6} y={y - 18} width={12} height={150} rx={2} fill={t.strip.tool === "redLitmus" ? "#ef4444" : "#3b82f6"} />
                    <rect x={x + TUBE_W / 2 - 6} y={y + 88} width={12} height={44} style={{ fill: t.strip.color, transition: "fill 700ms ease" }} />
                  </g>
                )}
                {/* dip / drop animation */}
                {anim && animTool?.kind === "strip" && (
                  <g style={{ transform: "translateY(0)", animation: "chem-dip 1.1s ease-in-out both" }}>
                    <rect x={x + TUBE_W / 2 - 6} y={y - 60} width={12} height={150} rx={2} fill={anim.tool === "redLitmus" ? "#ef4444" : "#3b82f6"} />
                  </g>
                )}
                {anim && animTool?.kind === "drop" && (
                  <g>
                    <path d={`M${x + TUBE_W / 2 - 7} ${y - 58} h14 v18 l-4 10 h-6 l-4 -10 z`} fill="#e2e8f0" stroke="#475569" strokeWidth={2} />
                    <rect x={x + TUBE_W / 2 - 9} y={y - 70} width={18} height={14} rx={5} fill="#f43f5e" />
                    <circle
                      className="chem-drop"
                      cx={x + TUBE_W / 2}
                      cy={y - 26}
                      r={5}
                      fill={indicatorResult(anim.tool, liquid.ph).color ?? "#e2e8f0"}
                      style={{ ["--fall" as string]: "110px" }}
                    />
                  </g>
                )}
                <Face x={x + TUBE_W / 2} y={y + 122} scale={0.85} mood={verdictFor(t) ? MOOD[verdictFor(t)!] : "curious"} />
                <text x={x + TUBE_W / 2} y={y + TUBE_H + 43} textAnchor="middle" fontSize={mystery ? 20 : 14} fontWeight={700} fill="#ffffff">
                  {mystery ? (found ? liquid.short.replace(/^\S+ /, "") : letters[slot]) : liquid.short}
                </text>
                {(t.last || verdictFor(t)) && !anim && (() => {
                  const v = verdictFor(t);
                  const label = v ? `${v}${found ? " 🔍" : ""}` : t.tests[t.last!]!;
                  const fill = v === "Acid" ? "#fecdd3" : v === "Base" ? "#c7d2fe" : v === "Neutral" ? "#a7f3d0" : "#ffffff";
                  const w = Math.max(70, label.length * 8.5 + 18);
                  return (
                    <g className="chem-pop" key={label}>
                      <rect x={x + TUBE_W / 2 - w / 2} y={y - 58} width={w} height={28} rx={14} fill={fill} stroke="#334155" strokeWidth={2} />
                      <text x={x + TUBE_W / 2} y={y - 39} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1e293b">
                        {label}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-center text-base text-slate-500">
        🧤 Stomach acid is dilute <Chem f="HCl" />; drain cleaner is <Chem f="NaOH" />. Never taste lab chemicals!
      </p>
    </WidgetPanel>
  );
}
