import { useRef, useState } from "react";
import { Button } from "../../ui/primitives";
import { EquationBar, SvgPill, WidgetPanel, useReportState, type WidgetState } from "../controls";
import Face from "../Face";
import { Arrow, P, Person, round1, useAnimationLoop } from "./shared";

/**
 * Lab 3 — "Tug-of-War & Crate Pusher". Teams pull a 50 kg crate left and right.
 * Arrow lengths are proportional to newtons. Friction (rose) holds the crate
 * still until the net force beats it; then a = (F_net − friction) / m.
 */
const MASS = 50;
const SURFACES = [
  { name: "Ice", friction: 0, fill: "#e0f2fe", icon: "🧊" },
  { name: "Wood", friction: 80, fill: "#d6a26b", icon: "🪵" },
  { name: "Rough road", friction: 200, fill: "#94a3b8", icon: "🪨" },
];
const PULLERS = { kid: 50, adult: 100 } as const;
type Puller = keyof typeof PULLERS;
const MAX_TEAM = 3;
const N_TO_PX = 0.55;
const LIMIT = 9; // metres either side before the crate hits the edge
const M_TO_PX = 28;

export default function CratePush({ surface: s0 = 0, onState }: { surface?: number; onState?: (s: WidgetState) => void }) {
  const [surface, setSurface] = useState(Math.min(2, Math.max(0, s0)));
  const [left, setLeft] = useState<Puller[]>(["adult"]);
  const [right, setRight] = useState<Puller[]>(["adult"]);
  const [running, setRunning] = useState(false);
  const [motion, setMotion] = useState({ x: 0, v: 0, edge: false });
  const ref = useRef(motion);

  const fLeft = left.reduce((t, p) => t + PULLERS[p], 0);
  const fRight = right.reduce((t, p) => t + PULLERS[p], 0);
  const net = fRight - fLeft;
  const fmax = SURFACES[surface].friction;
  const moving = Math.abs(motion.v) > 0.02;

  // Friction opposes motion (or the tendency to move) and can't exceed fmax.
  const friction = moving ? -Math.sign(motion.v) * fmax : Math.abs(net) <= fmax ? -net : -Math.sign(net) * fmax;
  const resultant = net + friction;
  const accel = round1(resultant / MASS);

  useAnimationLoop(running, (dt) => {
    const m = { ...ref.current };
    if (m.edge) return;
    const isMoving = Math.abs(m.v) > 0.02;
    let a: number;
    if (!isMoving && Math.abs(net) <= fmax) {
      m.v = 0;
      a = 0;
    } else {
      const f = isMoving ? -Math.sign(m.v) * fmax : -Math.sign(net) * fmax;
      a = (net + f) / MASS;
      const before = m.v;
      m.v += a * dt;
      // friction alone can stop the crate, but never push it backwards
      if (isMoving && Math.sign(m.v) !== Math.sign(before) && Math.abs(net) <= fmax) m.v = 0;
    }
    m.x += m.v * dt;
    if (Math.abs(m.x) >= LIMIT) {
      m.x = Math.sign(m.x) * LIMIT;
      m.v = 0;
      m.edge = true;
    }
    ref.current = m;
    setMotion(m);
  });

  const reset = () => {
    setRunning(false);
    ref.current = { x: 0, v: 0, edge: false };
    setMotion(ref.current);
  };

  useReportState(
    { surface, net, people: left.length + right.length, accel: Math.abs(net) <= fmax ? 0 : accel, moving: running && moving ? 1 : 0 },
    onState,
  );

  const cx = 400 + motion.x * M_TO_PX;
  const ground = 230;
  const crateTop = ground - 90;
  const team = (side: "L" | "R", members: Puller[]) =>
    members.map((p, i) => {
      const dir = side === "L" ? -1 : 1;
      const px = cx + dir * (95 + i * 48);
      const remove = () => (side === "L" ? setLeft(left.filter((_, j) => j !== i)) : setRight(right.filter((_, j) => j !== i)));
      return (
        <g key={`${side}${i}`} role="button" aria-label={`Send this ${p} away`} className="cursor-pointer" onClick={remove}>
          <rect x={px - 22} y={ground - 95} width={44} height={95} fill="transparent" />
          <Person x={px} y={ground} color={side === "L" ? "#0ea5e9" : "#a855f7"} lean={dir * 14} scale={p === "kid" ? 0.78 : 1} flip={side === "L"} />
        </g>
      );
    });

  const balanced = net === 0;
  const stuck = !balanced && Math.abs(net) <= fmax;

  return (
    <WidgetPanel>
      <div className="grid grid-cols-3 gap-2">
        {SURFACES.map((sf, i) => (
          <button
            key={sf.name}
            type="button"
            aria-pressed={surface === i}
            onClick={() => setSurface(i)}
            className={
              "flex min-h-[72px] flex-col items-center justify-center rounded-2xl border-2 border-b-4 px-2 py-2 font-display transition-all active:mb-[3px] active:translate-y-[3px] active:border-b-2 " +
              (surface === i ? "border-indigo-700 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
            }
          >
            <span className="text-2xl" aria-hidden>
              {sf.icon}
            </span>
            <span className="text-base font-semibold">{["Slippery ice", "Wooden floor", "Rough road"][i]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-3xl border-2 border-slate-200 bg-gradient-to-b from-sky-50 to-white p-2">
        <svg viewBox="0 -20 800 330" className="block h-auto w-full select-none">
          <rect x={0} y={ground} width={800} height={50} fill={SURFACES[surface].fill} />
          {surface === 1 && Array.from({ length: 10 }, (_, i) => <line key={i} x1={i * 80} x2={i * 80} y1={ground} y2={ground + 50} stroke="#a16207" strokeWidth={2} />)}
          {surface === 2 && Array.from({ length: 60 }, (_, i) => <circle key={i} cx={(i * 137) % 800} cy={ground + 8 + ((i * 53) % 36)} r={2.5} fill="#475569" />)}
          {surface === 0 && <path d={`M0 ${ground + 12} H800`} stroke="white" strokeWidth={3} opacity={0.8} />}

          {/* ropes */}
          {left.length > 0 && <line x1={cx - 50} y1={crateTop + 45} x2={cx - 95 - (left.length - 1) * 48 - 20} y2={ground - 45} stroke="#a16207" strokeWidth={4} />}
          {right.length > 0 && <line x1={cx + 50} y1={crateTop + 45} x2={cx + 95 + (right.length - 1) * 48 + 20} y2={ground - 45} stroke="#a16207" strokeWidth={4} />}
          {team("L", left)}
          {team("R", right)}

          {/* crate: tap to pull. Shakes while friction holds it; puffs dust once it slides. */}
          <g role="button" aria-label={running ? "Pause" : "Pull"} className={"cursor-pointer" + (running && stuck ? " phys-shake" : "")} onClick={() => !motion.edge && setRunning(!running)}>
            <rect x={cx - 50} y={crateTop} width={100} height={90} rx={6} fill="#b45309" stroke="#78350f" strokeWidth={4} />
            <path d={`M${cx - 50} ${crateTop} L${cx + 50} ${crateTop + 90} M${cx + 50} ${crateTop} L${cx - 50} ${crateTop + 90}`} stroke="#78350f" strokeWidth={4} />
            <rect x={cx - 34} y={crateTop + 20} width={68} height={52} rx={12} fill="#FFF3C9" stroke="#78350f" strokeWidth={2.5} />
            <Face x={cx} y={crateTop + 40} scale={0.9} mood={moving ? "wow" : net !== 0 && Math.abs(net) <= fmax ? "strain" : "happy"} />
            <text x={cx} y={crateTop + 68} textAnchor="middle" fontSize={12} fontWeight={800} fill="#78350f">
              50 kg
            </text>
          </g>

          {running && moving && surface > 0 &&
            [0, 1, 2].map((i) => (
              <circle key={`${i}-${Math.round(motion.x * 4)}`} className="chem-steam" cx={cx - Math.sign(motion.v) * (40 + i * 14)} cy={ground - 6} r={7 + i * 2} fill="#d6d3d1" opacity={0.8} style={{ animationDelay: `${i * 0.1}s` }} />
            ))}

          {/* tap to add pullers */}
          {([["L", 34], ["R", 766]] as const).map(([side, x]) => {
            const team = side === "L" ? left : right;
            const add = (w: Puller) => (side === "L" ? setLeft([...left, w]) : setRight([...right, w]));
            const full = team.length >= MAX_TEAM;
            return (
              <g key={side} opacity={full ? 0.35 : 1}>
                {(["kid", "adult"] as const).map((w, j) => (
                  <g
                    key={w}
                    role="button"
                    aria-label={`Add a ${w} pulling ${side === "L" ? "left" : "right"}`}
                    className="cursor-pointer"
                    onClick={() => !full && add(w)}
                    {...(side === "R" && w === "adult" ? { "data-start": true } : {})}
                  >
                    <rect x={x - 32} y={20 + j * 54} width={64} height={44} rx={14} fill={side === "L" ? "#e0f2fe" : "#f3e8ff"} stroke={side === "L" ? "#0ea5e9" : "#a855f7"} strokeWidth={3} />
                    <text x={x} y={39 + j * 54} textAnchor="middle" fontSize={13} fontWeight={800} fill="#334155">
                      {w === "kid" ? "🧒 +50" : "🧑 +100"}
                    </text>
                    <text x={x} y={55 + j * 54} textAnchor="middle" fontSize={11} fontWeight={800} fill="#64748b">
                      {side === "L" ? "← N" : "N →"}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}

          {/* force arrows (amber), friction (rose), net (indigo) */}
          <Arrow x1={cx} y1={crateTop - 22} x2={cx + fRight * N_TO_PX} y2={crateTop - 22} color={P.force} width={6} />
          <Arrow x1={cx} y1={crateTop - 22} x2={cx - fLeft * N_TO_PX} y2={crateTop - 22} color={P.force} width={6} />
          {fRight > 0 && <SvgPill x={cx + fRight * N_TO_PX} y={crateTop - 40} text={`${fRight} N →`} anchor="end" fill="#fffbeb" color="#b45309" stroke="#fcd34d" />}
          {fLeft > 0 && <SvgPill x={cx - fLeft * N_TO_PX} y={crateTop - 40} text={`← ${fLeft} N`} anchor="start" fill="#fffbeb" color="#b45309" stroke="#fcd34d" />}
          {friction !== 0 && <Arrow x1={cx} y1={ground - 6} x2={cx + friction * N_TO_PX} y2={ground - 6} color={P.friction} width={5} dashed />}
          {fmax > 0 && net !== 0 && (
            <SvgPill x={cx + friction * N_TO_PX + (friction > 0 ? 50 : -50)} y={ground + 24} text={`friction ${Math.abs(Math.round(friction))} N`} fill="#fff1f2" color="#be123c" stroke="#fda4af" size={13} />
          )}
          <Arrow x1={cx} y1={crateTop - 62} x2={cx + net * N_TO_PX} y2={crateTop - 62} color={P.vector} width={8} head={18} glow />
          <SvgPill
            x={Math.max(150, Math.min(650, cx))}
            y={crateTop - 92}
            text={net === 0 ? "F net = 0 N · balanced" : `F net = ${Math.abs(net)} N ${net > 0 ? "→" : "←"} · unbalanced`}
            fill={net === 0 ? "#ecfdf5" : "#eef2ff"}
            color={net === 0 ? "#047857" : "#4338ca"}
            stroke={net === 0 ? "#6ee7b7" : "#a5b4fc"}
            size={16}
          />
        </svg>
      </div>

      <EquationBar tex={`F_{\\text{net}} = F_{\\text{right}} - F_{\\text{left}} = ${fRight} - ${fLeft} = ${net}\\text{ N}`}>
        {balanced
          ? "Balanced forces: the pulls cancel, so the crate stays as it is."
          : stuck
            ? `Unbalanced, but friction (up to ${fmax} N) is strong enough to hold the crate still.`
            : `Unbalanced! The crate moves toward the ${net > 0 ? "right" : "left"}, the stronger side.`}
      </EquationBar>

      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <Button onClick={() => setRunning(false)}>⏸ Pause</Button>
        ) : (
          <Button variant="success" onClick={() => setRunning(true)} disabled={motion.edge}>
            ▶ Pull!
          </Button>
        )}
        <Button variant="secondary" onClick={reset}>
          ↺ Reset
        </Button>
        {motion.edge && <span className="text-base font-bold text-rose-600">The crate reached the edge. Reset to go again.</span>}
      </div>
    </WidgetPanel>
  );
}
