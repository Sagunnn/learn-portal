import { useEffect, useRef, useState } from "react";
import { confettiAt } from "../../../lib/confetti";
import { gcd } from "../../../lib/fraction";
import { cx } from "../../ui/primitives";
import { EquationBar, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Chip, useAnimationLoop } from "../physics/shared";
import { Chem, tex } from "./chem";

/**
 * Station 4 — "Seesaw Equation Builder". Reactant atoms sit on the left of a
 * seesaw, product atoms on the right; it tips toward the heavier side (real
 * atomic masses) and only levels out when every element balances.
 */
const ELEMENTS: Record<string, { color: string; dark: string; mass: number; text: string }> = {
  H: { color: "#ffffff", dark: "#cbd5e1", mass: 1, text: "#334155" },
  O: { color: "#f87171", dark: "#dc2626", mass: 16, text: "#fff" },
  Na: { color: "#c084fc", dark: "#9333ea", mass: 23, text: "#fff" },
  Cl: { color: "#4ade80", dark: "#16a34a", mass: 35.5, text: "#14532d" },
  Mg: { color: "#94a3b8", dark: "#475569", mass: 24, text: "#fff" },
  S: { color: "#fde047", dark: "#ca8a04", mass: 32, text: "#713f12" },
  C: { color: "#475569", dark: "#1e293b", mass: 12, text: "#fff" },
  Ca: { color: "#e2e8f0", dark: "#94a3b8", mass: 40, text: "#334155" },
  Zn: { color: "#7dd3fc", dark: "#0284c7", mass: 65, text: "#0c4a6e" },
};

/** "Mg(OH)2" → ["Mg","O","H","O","H"] */
export function atomsOf(formula: string): string[] {
  const out: string[] = [];
  const re = /([A-Z][a-z]?)(\d*)|\(([^)]+)\)(\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formula))) {
    if (m[1]) for (let i = 0; i < (Number(m[2]) || 1); i++) out.push(m[1]);
    else for (let i = 0; i < (Number(m[4]) || 1); i++) out.push(...atomsOf(m[3]));
  }
  return out;
}

const EQUATIONS = [
  { id: "water", words: "hydrogen + oxygen → water", left: ["H2", "O2"], right: ["H2O"], answer: [2, 1, 2] },
  { id: "mg", words: "magnesium + hydrochloric acid → magnesium chloride + hydrogen", left: ["Mg", "HCl"], right: ["MgCl2", "H2"], answer: [1, 2, 1, 1] },
  { id: "salt", words: "sodium + chlorine → sodium chloride", left: ["Na", "Cl2"], right: ["NaCl"], answer: [2, 1, 2] },
  { id: "zn", words: "zinc + hydrochloric acid → zinc chloride + hydrogen", left: ["Zn", "HCl"], right: ["ZnCl2", "H2"], answer: [1, 2, 1, 1] },
  { id: "neutral", words: "sodium hydroxide + sulphuric acid → sodium sulphate + water", left: ["NaOH", "H2SO4"], right: ["Na2SO4", "H2O"], answer: [2, 1, 1, 2] },
  { id: "marble", words: "calcium carbonate + hydrochloric acid → calcium chloride + water + carbon dioxide", left: ["CaCO3", "HCl"], right: ["CaCl2", "H2O", "CO2"], answer: [1, 2, 1, 1, 1] },
];
const MAX = 6;

const count = (terms: string[], coefs: number[]) => {
  const c: Record<string, number> = {};
  terms.forEach((f, i) => atomsOf(f).forEach((a) => (c[a] = (c[a] ?? 0) + coefs[i])));
  return c;
};
const massOf = (c: Record<string, number>) => Object.entries(c).reduce((m, [el, n]) => m + ELEMENTS[el].mass * n, 0);

export default function EquationBalancer({ eq: eq0 = 0, onState }: { eq?: number; onState?: (s: WidgetState) => void }) {
  const [eq, setEq] = useState(eq0);
  const E = EQUATIONS[eq];
  const [coefs, setCoefs] = useState<number[]>(() => [...E.left, ...E.right].map(() => 1));
  const [solved, setSolved] = useState<Set<string>>(() => new Set());
  const svgRef = useRef<SVGSVGElement>(null);

  const lc = count(E.left, coefs.slice(0, E.left.length));
  const rc = count(E.right, coefs.slice(E.left.length));
  const elements = [...new Set([...Object.keys(lc), ...Object.keys(rc)])];
  const balanced = elements.every((el) => (lc[el] ?? 0) === (rc[el] ?? 0));
  const lm = massOf(lc);
  const rm = massOf(rc);

  // Seesaw spring: tips toward the heavier side, levels only when balanced.
  const target = balanced ? 0 : Math.max(-14, Math.min(14, ((rm - lm) / Math.max(lm, rm)) * 22)) || (rm >= lm ? 3 : -3);
  const phys = useRef({ angle: target, vel: 0 });
  const [angle, setAngle] = useState(target);
  const settled = Math.abs(angle - target) < 0.02 && Math.abs(phys.current.vel) < 0.02;
  useAnimationLoop(!settled, (dt) => {
    const p = phys.current;
    const acc = 70 * (target - p.angle) - 7 * p.vel;
    p.vel += acc * dt;
    p.angle += p.vel * dt;
    setAngle(p.angle);
  });

  const wasBalanced = useRef(false);
  useEffect(() => {
    if (balanced && !wasBalanced.current) {
      setSolved((s) => new Set(s).add(E.id));
      setTimeout(() => confettiAt(svgRef.current, 1.6), 250);
    }
    wasBalanced.current = balanced;
  }, [balanced, E.id]);

  useReportState({ eq, balanced: balanced ? 1 : 0, solved: solved.size }, onState);

  const choose = (i: number) => {
    setEq(i);
    setCoefs([...EQUATIONS[i].left, ...EQUATIONS[i].right].map(() => 1));
    wasBalanced.current = false;
  };
  const bump = (i: number, d: number) => setCoefs((c) => c.map((v, j) => (j === i ? Math.max(1, Math.min(MAX, v + d)) : v)));

  const reduced = balanced && coefs.reduce((g, v) => gcd(g, v)) > 1;

  // Lay out one side's atoms in rows on its tray.
  const pile = (terms: string[], cs: number[], cx0: number) => {
    const items: { el: string; x: number; y: number; key: string }[] = [];
    let x = 0;
    let row = 0;
    const width = 210;
    terms.forEach((f, ti) => {
      const atoms = atomsOf(f);
      for (let copy = 0; copy < cs[ti]; copy++) {
        const w = atoms.length * 17 + 4;
        if (x + w > width) {
          x = 0;
          row++;
        }
        atoms.forEach((el, ai) => items.push({ el, x: cx0 - width / 2 + x + ai * 17 + 10, y: 248 - row * 22, key: `${ti}-${copy}-${ai}` }));
        x += w + 8;
      }
    });
    return items;
  };
  const leftAtoms = pile(E.left, coefs.slice(0, E.left.length), 215);
  const rightAtoms = pile(E.right, coefs.slice(E.left.length), 545);

  const equationTex =
    E.left.map((f, i) => (coefs[i] > 1 ? coefs[i] : "") + tex(f)).join(" + ") +
    (balanced ? " \\rightarrow " : " \\;\\xrightarrow{?}\\; ") +
    E.right.map((f, i) => (coefs[E.left.length + i] > 1 ? coefs[E.left.length + i] : "") + tex(f)).join(" + ");

  return (
    <WidgetPanel>
      <div className="flex flex-wrap gap-1.5">
        {EQUATIONS.map((q, i) => (
          <Chip key={q.id} active={eq === i} onClick={() => choose(i)}>
            {solved.has(q.id) ? "✓ " : ""}
            {q.left.map((f, j) => (
              <span key={j}>
                {j > 0 && " + "}
                <Chem f={f} />
              </span>
            ))}
          </Chip>
        ))}
      </div>
      <p className="text-base font-semibold text-slate-600">Word equation: {E.words}</p>

      <div className="rounded-2xl border-2 border-b-4 border-slate-200 bg-gradient-to-b from-sky-50 to-white p-2">
        <svg ref={svgRef} viewBox="0 0 760 360" className="block h-auto w-full select-none">
          <defs>
            {Object.entries(ELEMENTS).map(([el, c]) => (
              <radialGradient key={el} id={`atom-${el}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="white" stopOpacity={0.9} />
                <stop offset="35%" stopColor={c.color} />
                <stop offset="100%" stopColor={c.dark} />
              </radialGradient>
            ))}
          </defs>
          <rect x={0} y={330} width={760} height={30} fill="#cbd5e1" />
          <polygon points="380,274 336,330 424,330" fill="#64748b" stroke="#334155" strokeWidth={3} strokeLinejoin="round" />
          <g transform={`rotate(${angle} 380 270)`}>
            <rect x={90} y={262} width={580} height={14} rx={7} fill="#a16207" stroke="#713f12" strokeWidth={2} />
            <rect x={105} y={252} width={220} height={12} rx={4} fill="#fde68a" stroke="#b45309" strokeWidth={2} />
            <rect x={435} y={252} width={220} height={12} rx={4} fill="#fde68a" stroke="#b45309" strokeWidth={2} />
            {[...leftAtoms.map((a) => ({ ...a, side: "L" })), ...rightAtoms.map((a) => ({ ...a, side: "R" }))].map((a) => (
              <g key={`${eq}-${a.side}-${a.key}`} className="chem-pop">
                <circle cx={a.x} cy={a.y - 4} r={10} fill={`url(#atom-${a.el})`} stroke={ELEMENTS[a.el].dark} strokeWidth={1.5} />
                <text x={a.x} y={a.y - 0.5} textAnchor="middle" fontSize={a.el.length > 1 ? 7.5 : 9} fontWeight={800} fill={ELEMENTS[a.el].text}>
                  {a.el}
                </text>
              </g>
            ))}
          </g>
          <circle cx={380} cy={270} r={6} fill="#334155" />
          <text x={215} y={352} textAnchor="middle" fontSize={14} fontWeight={800} fill="#334155">
            Reactants · {lm.toFixed(lm % 1 ? 1 : 0)} u
          </text>
          <text x={545} y={352} textAnchor="middle" fontSize={14} fontWeight={800} fill="#334155">
            Products · {rm.toFixed(rm % 1 ? 1 : 0)} u
          </text>
          {balanced && (
            <text x={380} y={60} textAnchor="middle" fontSize={26} fontWeight={900} fill="#059669" className="chem-pop">
              ⚖️ Balanced!
            </text>
          )}
        </svg>
      </div>

      {/* coefficient steppers */}
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3">
        {[...E.left, ...E.right].map((f, i) => (
          <div key={`${eq}-${i}`} className="flex items-center gap-1.5">
            {i === E.left.length && <span className="mx-1 text-2xl font-black text-slate-400">→</span>}
            {i > 0 && i !== E.left.length && <span className="mx-1 text-xl font-black text-slate-400">+</span>}
            <div className="flex flex-col items-center">
              <button
                type="button"
                aria-label={`More ${f}`}
                onClick={() => bump(i, 1)}
                disabled={coefs[i] >= MAX}
                className="h-7 w-10 rounded-xl border-2 border-b-4 border-slate-200 bg-white text-base font-black text-slate-600 transition-all active:mb-[2px] active:translate-y-[2px] active:border-b-2 disabled:opacity-30"
              >
                +
              </button>
              <span className="my-0.5 text-2xl font-black tabular-nums text-indigo-600">{coefs[i]}</span>
              <button
                type="button"
                aria-label={`Fewer ${f}`}
                onClick={() => bump(i, -1)}
                disabled={coefs[i] <= 1}
                className="h-7 w-10 rounded-xl border-2 border-b-4 border-slate-200 bg-white text-base font-black text-slate-600 transition-all active:mb-[2px] active:translate-y-[2px] active:border-b-2 disabled:opacity-30"
              >
                −
              </button>
            </div>
            <span className="text-xl font-extrabold text-slate-900">
              <Chem f={f} />
            </span>
          </div>
        ))}
      </div>

      {/* atom tally */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {elements.map((el) => {
          const ok = (lc[el] ?? 0) === (rc[el] ?? 0);
          return (
            <div
              key={el}
              className={cx(
                "flex items-center gap-2 rounded-2xl border-2 border-b-4 px-3 py-2 transition-colors duration-300",
                ok ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50",
              )}
            >
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-black"
                style={{ background: ELEMENTS[el].color, borderColor: ELEMENTS[el].dark, color: ELEMENTS[el].text }}
              >
                {el}
              </span>
              <span className="text-base font-extrabold tabular-nums text-slate-800">
                {lc[el] ?? 0} : {rc[el] ?? 0}
              </span>
              <span className={cx("ml-auto text-base font-black", ok ? "text-emerald-600" : "text-rose-500")}>{ok ? "✓" : "✗"}</span>
            </div>
          );
        })}
      </div>

      <EquationBar tex={equationTex}>
        {balanced
          ? reduced
            ? "Balanced, but you can divide every number by the same amount. Use the smallest whole numbers."
            : "Same atoms on both sides: mass is conserved!"
          : "Atoms can't appear or vanish. Change the big numbers in front, never the small ones."}
      </EquationBar>
      <p className="text-sm text-slate-500">
        Masses use atomic mass units (u): H = 1, C = 12, O = 16, Na = 23, Mg = 24, S = 32, Cl = 35.5, Ca = 40, Zn = 65.
      </p>
      <div className="sr-only" aria-live="polite">
        {balanced ? "Balanced" : "Not balanced"}
      </div>
    </WidgetPanel>
  );
}
