import { useRef, useState } from "react";
import { Button, cx } from "../../ui/primitives";
import { EquationBar, Slider, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Arrow, P, Readout, fmt, round1, useAnimationLoop } from "./shared";

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
  const GAUGE_MAX = 30; // top speed from rest with a = 5 over 90 m is 30 m/s
  const gaugeAngle = Math.PI * (1 - Math.min(speed, GAUGE_MAX) / GAUGE_MAX);
  const vLabelX = Math.max(X0 + 50, Math.min(X1 - 60, sx));

  const status = sim.finished
    ? `🏁 Finish! 90 m in ${sim.t.toFixed(1)} s.`
    : sim.crashed
      ? "💥 Rolled back into the West wall. Reset and try again."
      : !started
        ? "Set u, then press Go. You can change a while it rolls."
        : running
          ? a > 0
            ? "Nitro! Velocity grows by " + a + " m/s every second."
            : a < 0
              ? "Braking: velocity drops by " + -a + " m/s every second."
              : "a = 0: cruising at a steady velocity."
          : "Paused.";

  return (
    <WidgetPanel>
      <div className="rounded-2xl border-2 border-b-4 border-slate-200 bg-gradient-to-b from-sky-50 to-white p-2">
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
          {Math.abs(v) > 0.1 && (
            <text x={vLabelX} y={38} textAnchor="middle" fontSize={13} fontWeight={800} fill={P.vector}>
              v = {v > 0 ? "+" : ""}
              {fmt(v)} m/s
            </text>
          )}

          {/* skater */}
          <g transform={`translate(${sx} 160) scale(${facing} 1)`}>
            <rect x={-30} y={-12} width={60} height={7} rx={3.5} fill="#7c3aed" />
            <circle cx={-20} cy={-2} r={5} fill={P.line} />
            <circle cx={20} cy={-2} r={5} fill={P.line} />
            <g transform={`rotate(${Math.max(-14, Math.min(14, (running ? a : 0) * 3))} 0 -12)`}>
              <line x1={-8} y1={-12} x2={-4} y2={-38} stroke={P.line} strokeWidth={6} strokeLinecap="round" />
              <line x1={8} y1={-12} x2={4} y2={-38} stroke={P.line} strokeWidth={6} strokeLinecap="round" />
              <rect x={-10} y={-70} width={20} height={34} rx={9} fill={P.force} />
              <line x1={-6} y1={-62} x2={-24} y2={-50} stroke={P.line} strokeWidth={4} strokeLinecap="round" />
              <line x1={6} y1={-62} x2={24} y2={-56} stroke={P.line} strokeWidth={4} strokeLinecap="round" />
              <circle cx={0} cy={-82} r={11} fill="#fcd9b8" stroke={P.line} strokeWidth={1.5} />
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

      <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
        {/* speedometer */}
        <div className="rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-900 p-2 text-center text-white">
          <svg viewBox="0 0 140 80" className="mx-auto block w-full max-w-40">
            <path d="M10 70 A60 60 0 0 1 130 70" fill="none" stroke="#334155" strokeWidth={10} strokeLinecap="round" />
            <path
              d="M10 70 A60 60 0 0 1 130 70"
              fill="none"
              stroke={P.scalar}
              strokeWidth={10}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${(Math.min(speed, GAUGE_MAX) / GAUGE_MAX) * 100} 100`}
            />
            <line x1={70} y1={70} x2={70 + 48 * Math.cos(gaugeAngle)} y2={70 - 48 * Math.sin(gaugeAngle)} stroke="white" strokeWidth={3} strokeLinecap="round" />
            <circle cx={70} cy={70} r={5} fill="white" />
          </svg>
          <div className="font-mono text-2xl font-extrabold tabular-nums text-emerald-300">{fmt(speed)}</div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">speed · m/s</div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout tone="vector" label="Velocity" value={`${v > 0.05 ? "+" : v < -0.05 ? "−" : ""}${fmt(Math.abs(v))}`} sub="m/s · has a sign" />
          <Readout tone="scalar" label="Speed" value={fmt(speed)} sub="m/s · never negative" />
          <Readout tone="force" label="Acceleration" value={`${a > 0 ? "+" : ""}${a}`} sub="m/s²" />
          <Readout tone="plain" label="⏱ Stopwatch" value={sim.t.toFixed(1)} sub="seconds" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className={cx("rounded-xl border-2 border-b-4 px-3 py-1", v < -0.05 ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-400")}>
          ← − West
        </span>
        <span className={cx("rounded-xl border-2 border-b-4 px-3 py-1", v > 0.05 ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-400")}>
          East + →
        </span>
        <span className="text-slate-500">The sign of velocity is its direction.</span>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Slider
          label={started ? "Initial velocity u (m/s) · reset to change" : "Initial velocity u (m/s)"}
          value={u}
          min={-10}
          max={10}
          color={P.vector}
          onChange={(x) => !started && setU(x)}
        />
        <Slider label="Acceleration a (m/s²) · −5 brake … +5 nitro" value={a} min={-5} max={5} color={P.force} onChange={setA} />
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
