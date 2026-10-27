import { useState, type DragEvent } from "react";
import { cx } from "../../ui/primitives";
import { WidgetPanel, useReportState, type WidgetState } from "../controls";

/**
 * Scalar vs Vector sorter. Drag a card into a bucket (mouse), or tap a card and
 * then tap a bucket (touch / keyboard). Wrong drops bounce back with the reason.
 */
type Kind = "scalar" | "vector";
const CARDS: { id: string; name: string; example: string; kind: Kind; why: string }[] = [
  { id: "mass", name: "Mass", example: "40 kg", kind: "scalar", why: "Mass is only an amount (40 kg). It doesn't point anywhere." },
  { id: "time", name: "Time", example: "10 s", kind: "scalar", why: "Time has no direction on a map: 10 s is just 10 s." },
  { id: "speed", name: "Speed", example: "5 m/s", kind: "scalar", why: "Speed only says how fast. Add a direction and it becomes velocity." },
  { id: "temp", name: "Temperature", example: "30 °C", kind: "scalar", why: "30 °C doesn't point north or south. It's only an amount." },
  { id: "force", name: "Force", example: "20 N →", kind: "vector", why: "A push or pull always has a direction: 20 N left is not the same as 20 N right." },
  { id: "velocity", name: "Velocity", example: "5 m/s East", kind: "vector", why: "Velocity is speed with a direction, like 5 m/s East." },
  { id: "accel", name: "Acceleration", example: "2 m/s² forward", kind: "vector", why: "Acceleration has a direction: speeding up forwards is different from braking." },
  { id: "disp", name: "Displacement", example: "50 m North-East", kind: "vector", why: "Displacement is a straight arrow from start to finish, so it has a direction." },
];

export default function VectorSorter({ onState }: { onState?: (s: WidgetState) => void }) {
  const [placed, setPlaced] = useState<Record<string, Kind>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ id: string; why: string; at: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hot, setHot] = useState<Kind | null>(null);

  const sorted = Object.keys(placed).length;
  useReportState({ sorted, mistakes }, onState);

  const drop = (id: string, bucket: Kind) => {
    const card = CARDS.find((c) => c.id === id);
    if (!card || placed[id]) return;
    setPicked(null);
    setHot(null);
    if (card.kind === bucket) {
      setPlaced({ ...placed, [id]: bucket });
      setWrong(null);
    } else {
      setMistakes((m) => m + 1);
      setWrong({ id, why: card.why, at: Date.now() });
    }
  };

  const loose = CARDS.filter((c) => !placed[c.id]);

  const bucket = (kind: Kind) => {
    const isScalar = kind === "scalar";
    const items = CARDS.filter((c) => placed[c.id] === kind);
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`${isScalar ? "Scalar bucket: how much?" : "Vector bucket: how much and which way?"}${picked ? ". Drop the picked card here." : ""}`}
        onClick={() => picked && drop(picked, kind)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && picked && (e.preventDefault(), drop(picked, kind))}
        onDragOver={(e) => {
          e.preventDefault();
          setHot(kind);
        }}
        onDragLeave={() => setHot(null)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          drop(e.dataTransfer.getData("text/plain"), kind);
        }}
        className={cx(
          "min-h-40 rounded-2xl border-2 border-dashed p-3 transition-all duration-200",
          isScalar ? "border-emerald-300 bg-emerald-50/70" : "border-indigo-300 bg-indigo-50/70",
          (hot === kind || picked) && (isScalar ? "border-solid border-emerald-500 ring-4 ring-emerald-200" : "border-solid border-indigo-500 ring-4 ring-indigo-200"),
          picked && "cursor-pointer",
        )}
      >
        <div className={cx("text-base font-extrabold", isScalar ? "text-emerald-800" : "text-indigo-800")}>
          {isScalar ? "🟢 SCALAR" : "🧭 VECTOR"}
        </div>
        <div className="mb-2 text-sm font-semibold text-slate-600">{isScalar ? "Asks only: How much?" : "Asks: How much + which way?"}</div>
        <div className="flex flex-wrap gap-1.5">
          {items.map((c) => (
            <span
              key={c.id}
              className={cx(
                "animate-pop rounded-xl border-b-4 px-2.5 py-1 text-base font-bold text-white",
                isScalar ? "border-emerald-700 bg-emerald-500" : "border-indigo-800 bg-indigo-600",
              )}
            >
              ✓ {c.name}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <WidgetPanel>
      <div className="flex items-center justify-between text-base font-bold text-slate-600">
        <span>{sorted === CARDS.length ? "🎉 All sorted!" : picked ? "Now tap a bucket." : "Drag a card into a bucket, or tap a card then a bucket."}</span>
        <span className="tabular-nums">
          {sorted}/{CARDS.length}
        </span>
      </div>

      <div className="flex min-h-14 flex-wrap gap-2">
        {loose.map((c) => (
          <button
            key={`${c.id}-${wrong?.id === c.id ? wrong.at : 0}`}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", c.id);
              e.dataTransfer.effectAllowed = "move";
              setPicked(null);
            }}
            onClick={() => setPicked(picked === c.id ? null : c.id)}
            aria-pressed={picked === c.id}
            className={cx(
              "press cursor-grab rounded-2xl bg-white px-3 py-2 text-left active:cursor-grabbing",
              picked === c.id ? "border-amber-400 bg-amber-50 ring-4 ring-amber-200" : "border-slate-200 hover:border-slate-300",
              wrong?.id === c.id && "animate-shake border-rose-400",
            )}
          >
            <div className="font-extrabold text-slate-900">{c.name}</div>
            <div className="text-sm font-semibold text-slate-500">{c.example}</div>
          </button>
        ))}
        {loose.length === 0 && <p className="text-base font-semibold text-emerald-700">Every card is in the right bucket. Nice sorting!</p>}
      </div>

      {wrong && (
        <div role="status" className="animate-rise rounded-2xl border-b-4 border-rose-500 bg-slate-900 px-4 py-3 text-base text-slate-100">
          <span className="mr-1 font-extrabold text-rose-300">Not that bucket:</span> {wrong.why}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {bucket("scalar")}
        {bucket("vector")}
      </div>
    </WidgetPanel>
  );
}
