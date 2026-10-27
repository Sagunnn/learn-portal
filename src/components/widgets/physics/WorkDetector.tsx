import { useRef, useState } from "react";
import { Button } from "../../ui/primitives";
import { EquationBar, Slider, SvgPill, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Arrow, Chip, P, Person, useAnimationLoop } from "./shared";

/**
 * Lab 4 — "Scientific Work Detector". Work W = F × d only counts movement in the
 * direction of the force. A: cart (work done). B: wall (huge force, d = 0, no work).
 * C: carrying a bag sideways (upward force ⟂ motion, no work against gravity).
 */
const MAX_J = 10000;
const SCENARIOS = [
  { id: "cart", label: "A · Push a cart" },
  { id: "wall", label: "B · Push a wall" },
  { id: "bag", label: "C · Carry a bag" },
] as const;
const BAG_FORCE = 40; // N, holding the bag up

export default function WorkDetector({ scenario: sc0 = 0, onState }: { scenario?: number; onState?: (s: WidgetState) => void }) {
  const [scenario, setScenario] = useState(Math.min(2, Math.max(0, sc0)));
  const [force, setForce] = useState(100);
  const [distance, setDistance] = useState(5);
  const [progress, setProgress] = useState(0); // 0..1 of the push/walk animation
  const [running, setRunning] = useState(false);
  const [pushed, setPushed] = useState(false);
  const pRef = useRef(0);

  const isCart = scenario === 0;
  const isWall = scenario === 1;
  const F = isCart || isWall ? force : BAG_FORCE;
  const d = isWall ? 0 : distance;
  // Work by *this* force: only the cart's force points along the motion.
  const work = isCart ? F * d : 0;
  const shown = Math.round(work * (isCart ? (pushed ? progress : 0) : 0));

  useAnimationLoop(running, (dt) => {
    pRef.current = Math.min(1, pRef.current + dt / (isWall ? 2.2 : 1.6));
    setProgress(pRef.current);
    if (pRef.current >= 1) setRunning(false);
  });

  const start = () => {
    pRef.current = 0;
    setProgress(0);
    setPushed(true);
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    pRef.current = 0;
    setProgress(0);
    setPushed(false);
  };
  const choose = (i: number) => {
    reset();
    setScenario(i);
    if (i === 1) setForce(500);
  };

  useReportState({ scenario, force: F, distance: d, work, pushed: pushed && progress >= 1 ? 1 : 0 }, onState);

  // scene geometry
  const ground = 210;
  const travel = isWall ? 0 : (d / 50) * 420 * progress * (isCart ? 2.2 : 1);
  const objX = 170 + Math.min(travel, 500);
  const wallShake = isWall && running;

  const meterPct = isCart ? (shown / MAX_J) * 100 : 0;
  const zeroFlash = pushed && progress >= 1 && !isCart;

  return (
    <WidgetPanel>
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s, i) => (
          <Chip key={s.id} active={scenario === i} onClick={() => choose(i)}>
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-b-4 border-slate-200 bg-gradient-to-b from-slate-50 to-white p-2">
        <svg viewBox="0 0 800 260" className="block h-auto w-full select-none">
          {/* tap the person / cart to push or walk */}
          <g data-start role="button" aria-label={isCart ? "Push the cart" : isWall ? "Push the wall" : "Walk"} className="cursor-pointer" onClick={() => !running && start()}>
            <rect x={isWall ? 220 : objX - 110} y={ground - 130} width={isWall ? 160 : 260} height={130} fill="transparent" />
          </g>
          <rect x={0} y={ground} width={800} height={50} fill="#e2e8f0" />
          {isCart && (
            <>
              <Person x={objX - 70} y={ground} color={P.vector} lean={18} />
              <g transform={`translate(${objX} ${ground})`}>
                <rect x={-10} y={-62} width={120} height={46} rx={8} fill="#38bdf8" stroke="#0369a1" strokeWidth={3} />
                <circle cx={15} cy={-9} r={9} fill={P.line} />
                <circle cx={85} cy={-9} r={9} fill={P.line} />
              </g>
              <Arrow x1={objX - 10} y1={ground - 100} x2={objX - 10 + Math.max(24, F * 0.3)} y2={ground - 100} color={P.force} width={6} />
              <text x={objX - 10} y={ground - 112} fontSize={14} fontWeight={800} fill="#b45309">
                F = {F} N
              </text>
              {travel > 4 && <Arrow x1={170} y1={ground + 28} x2={170 + Math.min(travel, 500)} y2={ground + 28} color={P.vector} width={5} glow />}
              <text x={170} y={ground + 48} fontSize={13} fontWeight={800} fill={P.vector}>
                d = {(d * progress).toFixed(1)} m (same direction as F ✓)
              </text>
            </>
          )}
          {isWall && (
            <>
              <g className={wallShake ? "phys-shake" : undefined}>
                <Person x={306} y={ground} color={P.vector} lean={12} shake={running} />
              </g>
              {running &&
                [0, 1, 2].map((i) => (
                  <path key={i} className="phys-sweat" style={{ animationDelay: `${i * 0.35}s` }} d={`M${300 + i * 9} ${ground - 96} q4 8 0 12 q-4 -4 0 -12z`} fill="#38bdf8" />
                ))}
              <clipPath id="wall-clip">
                <rect x={340} y={ground - 170} width={140} height={170} />
              </clipPath>
              <rect x={340} y={ground - 170} width={140} height={170} fill="#b91c1c" />
              <g clipPath="url(#wall-clip)">
              {Array.from({ length: 9 }, (_, r) =>
                Array.from({ length: 3 }, (_, c) => (
                  <rect key={`${r}-${c}`} x={340 + c * 48 - (r % 2) * 24} y={ground - 170 + r * 19} width={46} height={17} fill="#dc2626" stroke="#7f1d1d" strokeWidth={2} />
                )),
              )}
              {Array.from({ length: 9 }, (_, r) =>
                r % 2 ? <rect key={`e${r}`} x={340 + 3 * 48 - 24} y={ground - 170 + r * 19} width={46} height={17} fill="#dc2626" stroke="#7f1d1d" strokeWidth={2} /> : null,
              )}
              </g>
              <rect x={480} y={ground - 170} width={30} height={170} fill="#f8fafc" />
              <Arrow x1={250} y1={ground - 120} x2={250 + Math.max(24, F * 0.16)} y2={ground - 120} color={P.force} width={7} />
              <text x={200} y={ground - 132} fontSize={14} fontWeight={800} fill="#b45309">
                F = {F} N
              </text>
              <text x={560} y={ground - 80} fontSize={16} fontWeight={800} fill={P.vector}>
                d = 0 m
              </text>
              <text x={560} y={ground - 58} fontSize={13} fontWeight={700} fill={P.muted}>
                (the wall didn't move)
              </text>
            </>
          )}
          {scenario === 2 && (
            <>
              <Person x={objX} y={ground} color={P.vector} />
              <rect x={objX + 10} y={ground - 66} width={34} height={40} rx={8} fill="#f43f5e" stroke="#9f1239" strokeWidth={3} />
              <Arrow x1={objX + 27} y1={ground - 70} x2={objX + 27} y2={ground - 150} color={P.force} width={6} />
              <text x={objX + 40} y={ground - 130} fontSize={13} fontWeight={800} fill="#b45309">
                F = {BAG_FORCE} N up
              </text>
              <path d={`M${objX + 27} ${ground - 82} h12 v12`} fill="none" stroke={P.ink} strokeWidth={2} />
              <Arrow x1={170} y1={ground + 28} x2={170 + Math.max(60, Math.min(travel, 500))} y2={ground + 28} color={P.vector} width={5} glow />
              <text x={170} y={ground + 48} fontSize={13} fontWeight={800} fill={P.vector}>
                d = {(d * progress).toFixed(1)} m sideways: at 90° to F
              </text>
            </>
          )}
          {/* Work Done meter, right on the drawing */}
          <g>
            <rect x={738} y={40} width={34} height={160} rx={17} fill="#fef3c7" stroke="#f59e0b" strokeWidth={3} />
            <rect x={741} y={43 + 154 * (1 - meterPct / 100)} width={28} height={154 * (meterPct / 100)} rx={14} fill="#f59e0b" style={{ transition: "y 120ms, height 120ms" }} />
            <text x={755} y={28} textAnchor="middle" fontSize={20}>
              ⚡
            </text>
          </g>
          <SvgPill
            x={728}
            y={222}
            anchor="end"
            text={zeroFlash ? "0 J! No work done!" : `${shown.toLocaleString()} J`}
            fill={zeroFlash ? "#fff1f2" : "#fffbeb"}
            color={zeroFlash ? "#be123c" : "#b45309"}
            stroke={zeroFlash ? "#fda4af" : "#fcd34d"}
            size={18}
          />
          {!pushed && (
            <text x={400} y={22} textAnchor="middle" fontSize={15} fontWeight={800} fill="#64748b">
              {isCart ? "👆 Tap the cart to push it" : isWall ? "👆 Tap to push the wall" : "👆 Tap to walk with the bag"}
            </text>
          )}
        </svg>
      </div>

      <EquationBar
        tex={
          isCart
            ? `W = F \\times d = ${F}\\text{ N} \\times ${d}\\text{ m} = ${work.toLocaleString().replace(/,/g, "{,}")}\\text{ J}`
            : isWall
              ? `W = F \\times d = ${F}\\text{ N} \\times 0\\text{ m} = 0\\text{ J}`
              : `W = F \\times d_{\\text{up}} = ${BAG_FORCE}\\text{ N} \\times 0\\text{ m} = 0\\text{ J}`
        }
      >
        {isCart
          ? "Force and movement point the same way, so every metre adds work."
          : isWall
            ? "Tired? Yes. Work done? No. In science, work needs the object to move."
            : "Your upward push doesn't move the bag up. It moves sideways, at 90° to your force, so no work is done against gravity."}
      </EquationBar>

      <div className="grid gap-5">
        {scenario !== 2 && (
          <Slider
            label="Force F (N)"
            value={force}
            min={0}
            max={500}
            color={P.force}
            step={10}
            unit="N"
            onChange={(v) => (reset(), setForce(v))}
            presets={[
              { label: "50 N", value: 50 },
              { label: "100 N", value: 100 },
              { label: "200 N", value: 200 },
              { label: "500 N 💪", value: 500 },
            ]}
          />
        )}
        {scenario !== 1 && (
          <Slider
            label={isCart ? "Distance pushed d" : "Distance walked"}
            value={distance}
            min={0}
            max={isCart ? 20 : 50}
            color={P.vector}
            unit="m"
            onChange={(v) => (reset(), setDistance(v))}
            presets={(isCart ? [1, 5, 10, 20] : [5, 20, 50]).map((v) => ({ label: `${v} m`, value: v }))}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="success" onClick={start} disabled={running}>
          {isCart ? "▶ Push the cart" : isWall ? "💪 Push the wall!" : "🚶 Walk"}
        </Button>
        <Button variant="secondary" onClick={reset}>
          ↺ Reset
        </Button>
      </div>
    </WidgetPanel>
  );
}
