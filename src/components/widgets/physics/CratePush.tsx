import { useRef, useState } from "react";
import { Button } from "../../ui/primitives";
import { EquationBar, StatBadge, WidgetPanel, useReportState, type WidgetState } from "../controls";
import Face from "../Face";
import { Arrow, Chip, P, Person, round1, useAnimationLoop } from "./shared";

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
      return <Person key={`${side}${i}`} x={px} y={ground} color={side === "L" ? "#0ea5e9" : "#a855f7"} lean={dir * 14} scale={p === "kid" ? 0.78 : 1} flip={side === "L"} />;
    });

  const balanced = net === 0;
  const stuck = !balanced && Math.abs(net) <= fmax;

  return (
    <WidgetPanel>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-bold text-slate-600">Surface:</span>
        {SURFACES.map((s, i) => (
          <Chip key={s.name} active={surface === i} onClick={() => setSurface(i)} tone="slate">
            {s.icon} {s.name} <span className="font-semibold opacity-70">· friction up to {s.friction} N</span>
          </Chip>
        ))}
      </div>

      <StatBadge
        parts={[
          { icon: "➡️", label: "Right", value: `${fRight} N`, tone: "honey" },
          { icon: "⬅️", label: "Left", value: `${fLeft} N`, tone: "honey" },
          { icon: "🧲", label: "Friction", value: `${Math.abs(Math.round(friction))} N`, tone: "brick" },
          { icon: "🚀", label: "a", value: `${Math.abs(net) <= fmax ? 0 : accel} m/s²`, tone: "periwinkle" },
        ]}
      />
      <div className="rounded-3xl border-2 border-slate-200 bg-gradient-to-b from-sky-50 to-white p-2">
        <svg viewBox="0 0 800 300" className="block h-auto w-full select-none">
          <rect x={0} y={ground} width={800} height={50} fill={SURFACES[surface].fill} />
          {surface === 1 && Array.from({ length: 10 }, (_, i) => <line key={i} x1={i * 80} x2={i * 80} y1={ground} y2={ground + 50} stroke="#a16207" strokeWidth={2} />)}
          {surface === 2 && Array.from({ length: 60 }, (_, i) => <circle key={i} cx={(i * 137) % 800} cy={ground + 8 + ((i * 53) % 36)} r={2.5} fill="#475569" />)}
          {surface === 0 && <path d={`M0 ${ground + 12} H800`} stroke="white" strokeWidth={3} opacity={0.8} />}

          {/* ropes */}
          {left.length > 0 && <line x1={cx - 50} y1={crateTop + 45} x2={cx - 95 - (left.length - 1) * 48 - 20} y2={ground - 45} stroke="#a16207" strokeWidth={4} />}
          {right.length > 0 && <line x1={cx + 50} y1={crateTop + 45} x2={cx + 95 + (right.length - 1) * 48 + 20} y2={ground - 45} stroke="#a16207" strokeWidth={4} />}
          {team("L", left)}
          {team("R", right)}

          {/* crate */}
          <g>
            <rect x={cx - 50} y={crateTop} width={100} height={90} rx={6} fill="#b45309" stroke="#78350f" strokeWidth={4} />
            <path d={`M${cx - 50} ${crateTop} L${cx + 50} ${crateTop + 90} M${cx + 50} ${crateTop} L${cx - 50} ${crateTop + 90}`} stroke="#78350f" strokeWidth={4} />
            <rect x={cx - 34} y={crateTop + 20} width={68} height={52} rx={12} fill="#FFF3C9" stroke="#78350f" strokeWidth={2.5} />
            <Face x={cx} y={crateTop + 40} scale={0.9} mood={moving ? "wow" : net !== 0 && Math.abs(net) <= fmax ? "strain" : "happy"} />
            <text x={cx} y={crateTop + 68} textAnchor="middle" fontSize={12} fontWeight={800} fill="#78350f">
              50 kg
            </text>
          </g>

          {/* force arrows (amber), friction (rose), net (indigo) */}
          <Arrow x1={cx} y1={crateTop - 22} x2={cx + fRight * N_TO_PX} y2={crateTop - 22} color={P.force} width={6} />
          <Arrow x1={cx} y1={crateTop - 22} x2={cx - fLeft * N_TO_PX} y2={crateTop - 22} color={P.force} width={6} />
          {fRight > 0 && (
            <text x={cx + fRight * N_TO_PX} y={crateTop - 34} textAnchor="end" fontSize={18} fontWeight={800} fill="#b45309">
              {fRight} N
            </text>
          )}
          {fLeft > 0 && (
            <text x={cx - fLeft * N_TO_PX} y={crateTop - 34} fontSize={18} fontWeight={800} fill="#b45309">
              {fLeft} N
            </text>
          )}
          {friction !== 0 && <Arrow x1={cx} y1={ground - 6} x2={cx + friction * N_TO_PX} y2={ground - 6} color={P.friction} width={5} dashed />}
          <Arrow x1={cx} y1={crateTop - 62} x2={cx + net * N_TO_PX} y2={crateTop - 62} color={P.vector} width={8} head={18} glow />
          <text x={cx} y={crateTop - 80} textAnchor="middle" fontSize={20} fontWeight={800} fill={P.vector}>
            F net = {net > 0 ? "+" : ""}
            {net} N
          </text>
        </svg>
      </div>

      <EquationBar
        tex={
          `\\begin{gathered}F_{\\text{net}} = F_{\\text{right}} - F_{\\text{left}} = ${fRight} - ${fLeft} = ${net}\\text{ N} \\\\ ` +
          (balanced || stuck
            ? `a = 0\\ \\text{m/s}^2`
            : `a = \\dfrac{F_{\\text{net}}${fmax ? " - f" : ""}}{m} = \\dfrac{${net}${fmax ? ` ${net > 0 ? "-" : "+"} ${fmax}` : ""}}{${MASS}} = ${accel}\\ \\text{m/s}^2`) +
          `\\end{gathered}`
        }
      >
        {balanced
          ? "Balanced forces: the pulls cancel, so the crate doesn't speed up."
          : stuck
            ? `Unbalanced, but friction (up to ${fmax} N) is strong enough to hold the crate still.`
            : `Unbalanced! The crate accelerates to the ${net > 0 ? "right" : "left"}: F = m × a.`}
      </EquationBar>

      <div className="grid gap-3 sm:grid-cols-2">
        {(["L", "R"] as const).map((side) => {
          const members = side === "L" ? left : right;
          const set = side === "L" ? setLeft : setRight;
          return (
            <div key={side} className="rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3">
              <div className="mb-2 text-base font-extrabold" style={{ color: side === "L" ? "#0284c7" : "#9333ea" }}>
                {side === "L" ? "← Left team" : "Right team →"}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={members.length >= MAX_TEAM} onClick={() => set([...members, "kid"])}>
                  + Kid 50 N
                </Button>
                <Button size="sm" variant="secondary" disabled={members.length >= MAX_TEAM} onClick={() => set([...members, "adult"])}>
                  + Adult 100 N
                </Button>
                <Button size="sm" variant="ghost" disabled={!members.length} onClick={() => set(members.slice(0, -1))}>
                  − Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>

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
