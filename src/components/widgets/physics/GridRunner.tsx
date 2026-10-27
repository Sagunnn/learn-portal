import { useState, type KeyboardEvent } from "react";
import { Button } from "../../ui/primitives";
import { Tex, WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Arrow, P, Readout } from "./shared";

/**
 * Lab 1 — "Neighborhood Grid Runner". Walk from the House to the Shop around a
 * pond and a park. The green footsteps add up the Distance (scalar); the indigo
 * arrow is the Displacement (vector): straight from start to where you are.
 */
const COLS = 10;
const ROWS = 8;
const CELL = 54;
const METRES = 10; // one block
const HOME = { c: 1, r: 6 };
const SHOP = { c: 8, r: 1 };
const POND = (c: number, r: number) => c >= 4 && c <= 5 && r >= 3 && r <= 5;
const PARK = (c: number, r: number) => c >= 2 && c <= 3 && r >= 1 && r <= 2;
const blocked = (c: number, r: number) => c < 0 || r < 0 || c >= COLS || r >= ROWS || POND(c, r) || PARK(c, r);

const COMPASS = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
const center = (c: number, r: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });

type Cell = { c: number; r: number };

export default function GridRunner({ onState }: { onState?: (s: WidgetState) => void }) {
  const [path, setPath] = useState<Cell[]>([HOME]);
  const [msg, setMsg] = useState<string | null>(null);
  const here = path[path.length - 1];

  const distance = (path.length - 1) * METRES;
  const dx = (here.c - HOME.c) * METRES; // east +
  const dy = (HOME.r - here.r) * METRES; // north +
  const disp = Math.hypot(dx, dy);
  const bearing = (((Math.atan2(dx, dy) * 180) / Math.PI) + 360) % 360;
  const direction = disp === 0 ? "" : COMPASS[Math.round(bearing / 45) % 8];
  const atShop = here.c === SHOP.c && here.r === SHOP.r;

  useReportState({ distance, disp: Math.round(disp), atShop: atShop ? 1 : 0, steps: path.length - 1 }, onState);

  const walkTo = (target: Cell) => {
    const sameRow = target.r === here.r;
    const sameCol = target.c === here.c;
    if (!sameRow && !sameCol) return setMsg("Walk along one street at a time (straight up, down, left or right).");
    if (sameRow && sameCol) return;
    const steps: Cell[] = [];
    const sc = Math.sign(target.c - here.c);
    const sr = Math.sign(target.r - here.r);
    let c = here.c;
    let r = here.r;
    while (c !== target.c || r !== target.r) {
      c += sc;
      r += sr;
      if (blocked(c, r)) return setMsg(POND(c, r) ? "Splash! You can't walk through the pond." : PARK(c, r) ? "The park is fenced off. Go around it." : "That's off the map.");
      steps.push({ c, r });
    }
    setMsg(null);
    setPath([...path, ...steps]);
  };

  const step = (dc: number, dr: number) => walkTo({ c: here.c + dc, r: here.r + dr });

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      step(...m);
    }
  };

  const W = COLS * CELL;
  const H = ROWS * CELL;
  const start = center(HOME.c, HOME.r);
  const now = center(here.c, here.r);

  return (
    <WidgetPanel>
      <div className="grid gap-3 sm:grid-cols-2">
        <Readout tone="scalar" label="Distance · scalar" value={`${distance} m`} sub="How much? Every step you walked." />
        <Readout
          tone="vector"
          label="Displacement · vector"
          value={disp === 0 ? "0 m" : `${disp.toFixed(1)} m ${direction}`}
          sub={disp === 0 ? "How much + which way? You're back where you started." : `How much + which way? Bearing ${Math.round(bearing).toString().padStart(3, "0")}°`}
        />
      </div>

      <div
        tabIndex={0}
        onKeyDown={onKey}
        aria-label="Map. Use the arrow keys, the arrow buttons, or click a square in the same street to walk."
        className="rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full touch-manipulation select-none">
          {/* streets */}
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => (
              <rect
                key={`${c}-${r}`}
                x={c * CELL + 1}
                y={r * CELL + 1}
                width={CELL - 2}
                height={CELL - 2}
                rx={8}
                fill={POND(c, r) ? "#7dd3fc" : PARK(c, r) ? "#86efac" : "#f1f5f9"}
                className={blocked(c, r) ? undefined : "cursor-pointer hover:fill-indigo-100"}
                onClick={() => walkTo({ c, r })}
              />
            )),
          )}
          {/* pond ripples and park trees */}
          <text x={5 * CELL} y={4.5 * CELL} textAnchor="middle" fontSize={15} fontWeight={800} fill="#0369a1">
            POND
          </text>
          {[
            [2.5, 1.4],
            [3.4, 1.6],
            [2.6, 2.5],
            [3.5, 2.6],
          ].map(([c, r], i) => (
            <circle key={i} cx={c * CELL} cy={r * CELL} r={13} fill="#16a34a" opacity={0.85} />
          ))}
          <text x={3 * CELL} y={2.15 * CELL} textAnchor="middle" fontSize={13} fontWeight={800} fill="#14532d">
            PARK
          </text>

          {/* places */}
          <text x={start.x} y={start.y + 9} textAnchor="middle" fontSize={28}>
            🏠
          </text>
          <text x={center(SHOP.c, SHOP.r).x} y={center(SHOP.c, SHOP.r).y + 9} textAnchor="middle" fontSize={28}>
            🏪
          </text>

          {/* footsteps (distance) */}
          <polyline
            points={path.map((p) => `${center(p.c, p.r).x},${center(p.c, p.r).y}`).join(" ")}
            fill="none"
            stroke={P.scalar}
            strokeWidth={6}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.9}
          />
          {path.slice(1).map((p, i) => (
            <circle key={i} cx={center(p.c, p.r).x} cy={center(p.c, p.r).y} r={4} fill="white" stroke={P.scalar} strokeWidth={2} />
          ))}

          {/* displacement (vector) */}
          <Arrow x1={start.x} y1={start.y} x2={now.x} y2={now.y} color={P.vector} width={5} head={18} glow />

          {/* walker */}
          <g style={{ transform: `translate(${now.x}px, ${now.y}px)`, transition: "transform 180ms ease-out" }}>
            <circle r={14} fill="#f59e0b" stroke="white" strokeWidth={4} />
            <circle r={4} fill="white" />
          </g>

          {/* compass */}
          <g transform={`translate(${W - 34} 34)`}>
            <circle r={24} fill="white" stroke={P.muted} strokeWidth={2} />
            <polygon points="0,-18 5,0 -5,0" fill={P.friction} />
            <polygon points="0,18 5,0 -5,0" fill={P.muted} />
            <text y={-26} textAnchor="middle" fontSize={11} fontWeight={800} fill={P.ink} dy={-2}>
              N
            </text>
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Walk">
          <span />
          <Button size="sm" variant="secondary" onClick={() => step(0, -1)} aria-label="Walk north">
            ↑
          </Button>
          <span />
          <Button size="sm" variant="secondary" onClick={() => step(-1, 0)} aria-label="Walk west">
            ←
          </Button>
          <Button size="sm" variant="secondary" onClick={() => step(0, 1)} aria-label="Walk south">
            ↓
          </Button>
          <Button size="sm" variant="secondary" onClick={() => step(1, 0)} aria-label="Walk east">
            →
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => path.length > 1 && setPath(path.slice(0, -1))} disabled={path.length < 2}>
            ↶ Undo step
          </Button>
          <Button size="sm" variant="ghost" onClick={() => {
              setPath([HOME]);
              setMsg(null);
            }}>
            Reset
          </Button>
        </div>
      </div>

      <p className="min-h-6 text-sm font-semibold" role="status">
        {msg ? (
          <span className="text-rose-600">{msg}</span>
        ) : atShop ? (
          <span className="text-indigo-700">
            🏪 At the shop! You walked {distance} m, but the shop is only {disp.toFixed(1)} m away in a straight line.
          </span>
        ) : disp > 0 ? (
          <span className="text-slate-600">
            Straight-line check: <Tex tex={`\\sqrt{${Math.abs(dx)}^2 + ${Math.abs(dy)}^2} = ${disp.toFixed(1)}\\text{ m}`} />
          </span>
        ) : (
          <span className="text-slate-500">Each square is a 10 m block. Click a square in the same street, or use the arrows.</span>
        )}
      </p>
    </WidgetPanel>
  );
}
