import { useRef, useState } from "react";
import { Button } from "../../ui/primitives";
import { EquationBar, Slider, SvgPill, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Arrow, P, fmt, round1, useAnimationLoop } from "./shared";

/**
 * Lab 2 — "Nitro Skateboard Track". Set the starting velocity u, press Go, and
 * change the acceleration a while the skater rolls. A marker drops every second
 * so speeding up / slowing down shows as growing / shrinking gaps.
 */
const START_X = 10; // metres
const TRACK = 100;
const X0 = 40;
const X1 = 780;
const PX = (X1 - X0) / TRACK;

interface Sim {
  x: number;
  v: number;
  t: number;
  dots: number[];
  turned: boolean;
  finished: boolean;
  crashed: boolean;
  dir0: number;
}

const fresh = (): Sim => ({ x: START_X, v: 0, t: 0, dots: [], turned: false, finished: false, crashed: false, dir0: 0 });

export default function SkateTrack({ u: u0 = 0, a: a0 = 2, onState }: { u?: number; a?: number; onState?: (s: WidgetState) => void }) {
  const [u, setU] = useState(u0);
  const [a, setA] = useState(a0);
  const [running, setRunning] = useState(false);
  const [sim, setSim] = useState<Sim>(fresh);
  const simRef = useRef(sim);
  const aRef = useRef(a);
  aRef.current = a;

  const started = sim.t > 0;
  const over = sim.finished || sim.crashed;

  useAnimationLoop(running, (dt) => {
    const s = { ...simRef.current, dots: simRef.current.dots };
    const acc = aRef.current;
    s.v += acc * dt;
    s.x += s.v * dt;
    const before = s.t;
    s.t += dt;
    if (Math.floor(s.t) > Math.floor(before)) s.dots = [...s.dots, s.x];
    if (!s.dir0 && Math.abs(s.v) > 0.05) s.dir0 = Math.sign(s.v);
    if (s.dir0 && Math.sign(s.v) === -s.dir0 && Math.abs(s.v) > 0.05) s.turned = true;
    if (s.x >= TRACK) {
      s.x = TRACK;
      s.finished = true;
    } else if (s.x <= 0) {
      s.x = 0;
      s.crashed = true;
    }
    simRef.current = s;
    setSim(s);
    if (s.finished || s.crashed) setRunning(false);
  });

  const go = () => {
    if (over) return;
    if (!started) {
      const s = { ...fresh(), v: u, dir0: Math.sign(u) };
      simRef.current = s;
      setSim(s);
    }
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    simRef.current = fresh();
    setSim(simRef.current);
  };

  useReportState({ u, finished: sim.finished ? 1 : 0, time: sim.finished ? round1(sim.t) : 0, turned: sim.turned ? 1 : 0 }, onState);

  const v = started ? sim.v : u;
  const speed = Math.abs(v);
  const sx = X0 + sim.x * PX;
  const facing = v < -0.01 ? -1 : 1;
  const avgA = sim.t > 0 ? (sim.v - u) / sim.t : 0;
  const vLabelX = Math.max(X0 + 120, Math.min(X1 - 120, sx));

  const status = sim.finished
    ? `🏁 Finish! Average speed = distance ÷ time = 90 m ÷ ${sim.t.toFixed(1)} s = ${(90 / sim.t).toFixed(1)} m/s.`
    : sim.crashed
      ? "💥 Rolled back into the West wall. Reset and try again."
      : !started
        ? "Tap the skater (or Go!) to roll. Change a while it rolls."
        : running
          ? a > 0
            ? "Nitro! Velocity grows by " + a + " m/s every second."
            : a < 0
              ? "Braking: velocity drops by " + -a + " m/s every second."
              : "a = 0: cruising at a steady velocity."
          : "Paused.";

  return (
    <WidgetPanel>
      <div className="rounded-3xl border-2 border-slate-200 bg-gradient-to-b from-sky-50 to-white p-2">
        <svg viewBox="0 0 820 250" className="block h-auto w-full select-none">
          {/* track + metre marks */}
          <rect x={X0} y={160} width={X1 - X0} height={14} rx={7} fill="#cbd5e1" />
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i}>
              <line x1={X0 + i * 10 * PX} x2={X0 + i * 10 * PX} y1={174} y2={184} stroke={P.muted} strokeWidth={2} />
              <text x={X0 + i * 10 * PX} y={200} textAnchor="middle" fontSize={12} fontWeight={700} fill={P.muted}>
                {i * 10}
              </text>
            </g>
          ))}
          <text x={X1 + 8} y={200} fontSize={12} fontWeight={700} fill={P.muted}>
            m
          </text>
          {/* finish flag + start line */}
          <line x1={X1} x2={X1} y1={70} y2={174} stroke={P.ink} strokeWidth={3} />
          <polygon points={`${X1},70 ${X1 + 30},80 ${X1},90`} fill={P.friction} />
          <line x1={X0 + START_X * PX} x2={X0 + START_X * PX} y1={150} y2={174} stroke={P.scalar} strokeWidth={3} strokeDasharray="4 3" />
          <rect x={X0 - 12} y={100} width={12} height={74} fill={P.line} rx={3} />

          {/* one marker per second */}
          {sim.dots.map((d, i) => (
            <g key={i}>
              <circle cx={X0 + d * PX} cy={220} r={5} fill={P.vector} />
              <text x={X0 + d * PX} y={242} textAnchor="middle" fontSize={11} fontWeight={800} fill={P.vector}>
                {i + 1}s
              </text>
            </g>
          ))}

          {/* velocity arrow */}
          <Arrow x1={sx} y1={52} x2={sx + Math.max(-90, Math.min(90, v * 9))} y2={52} color={P.vector} width={5} glow />
          <SvgPill
            x={vLabelX}
            y={22}
            text={`v ${v > 0.05 ? "+" : v < -0.05 ? "−" : ""}${fmt(Math.abs(v))} m/s · speed ${fmt(speed)}`}
            fill="#eef2ff"
            color="#4338ca"
            stroke="#a5b4fc"
            size={14}
          />
          <SvgPill x={X1 - 4} y={110} text={`⏱ ${sim.t.toFixed(1)} s`} anchor="end" size={14} />
          <SvgPill x={X0 + 6} y={74} text={`a ${a > 0 ? "+" : ""}${a} m/s²`} anchor="start" fill="#fffbeb" color="#b45309" stroke="#fcd34d" size={14} />

          {/* skater */}
          <g
            data-start
            role="button"
            aria-label={running ? "Pause" : "Go"}
            className="cursor-pointer"
            onClick={() => (running ? setRunning(false) : go())}
            transform={`translate(${sx} 160) scale(${facing} 1)`}
          >
            <rect x={-40} y={-100} width={80} height={110} fill="transparent" />
            <rect x={-30} y={-12} width={60} height={7} rx={3.5} fill="#7c3aed" />
            <circle cx={-20} cy={-2} r={5} fill={P.line} />
            <circle cx={20} cy={-2} r={5} fill={P.line} />
            <g transform={`rotate(${Math.max(-14, Math.min(14, (running ? a : 0) * 3))} 0 -12)`}>
              <line x1={-8} y1={-12} x2={-4} y2={-38} stroke={P.line} strokeWidth={6} strokeLinecap="round" />
              <line x1={8} y1={-12} x2={4} y2={-38} stroke={P.line} strokeWidth={6} strokeLinecap="round" />
              <rect x={-10} y={-70} width={20} height={34} rx={9} fill={P.force} />
              <line x1={-6} y1={-62} x2={-24} y2={-50} stroke={P.line} strokeWidth={4} strokeLinecap="round" />
              <line x1={6} y1={-62} x2={24} y2={-56} stroke={P.line} strokeWidth={4} strokeLinecap="round" />
              <circle cx={0} cy={-82} r={11} fill="#fcd9b8" stroke={P.line} strokeWidth={2} />
              <circle cx={4} cy={-81} r={1.8} fill={P.ink} />
              <path d="M2 -76 q3 2 6 -1" fill="none" stroke={P.ink} strokeWidth={1.5} />
              <path d="M-11 -85 a11 11 0 0 1 22 0 z" fill={P.vector} />
            </g>
            {running && a > 0 && (
              <g opacity={0.9}>
                <polygon points="-34,-10 -52,-14 -34,-4" fill={P.force} />
                <polygon points="-34,-8 -46,-9 -34,-6" fill={P.friction} />
              </g>
            )}
          </g>
        </svg>
      </div>

      <EquationBar
        tex={
          sim.t > 0
            ? `a = \\dfrac{v - u}{t} = \\dfrac{${fmt(sim.v)} - (${u})}{${sim.t.toFixed(1)}} = ${fmt(avgA)}\\ \\text{m/s}^2`
            : `a = \\dfrac{v - u}{t}`
        }
      >
        {status}
      </EquationBar>

      <div className="grid gap-5">
        <Slider
          label={started ? "Initial velocity u (m/s) · reset to change" : "Initial velocity u (m/s)"}
          value={u}
          min={-10}
          max={10}
          color={P.vector}
          onChange={(x) => !started && setU(x)}
          presets={[
            { label: "⬅️ −6", value: -6 },
            { label: "Stand still 0", value: 0 },
            { label: "➡️ +6", value: 6 },
          ]}
        />
        <Slider
          label="Acceleration a (m/s²) · change it while rolling!"
          value={a}
          min={-5}
          max={5}
          color={P.force}
          onChange={setA}
          presets={[
            { label: "🛑 Brake −4", value: -4 },
            { label: "😌 Cruise 0", value: 0 },
            { label: "🚀 Nitro +4", value: 4 },
          ]}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {running ? (
          <Button onClick={() => setRunning(false)}>⏸ Pause</Button>
        ) : (
          <Button variant="success" onClick={go} disabled={over}>
            ▶ {started ? "Resume" : "Go!"}
          </Button>
        )}
        <Button variant="secondary" onClick={reset}>
          ↺ Reset
        </Button>
      </div>
    </WidgetPanel>
  );
}
