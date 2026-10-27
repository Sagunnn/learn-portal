import { useState } from "react";
import { simplify } from "../../lib/fraction";
import { EquationBar, Slider, WidgetPanel } from "./controls";
import { C, OverlapGrid } from "./figures";

/**
 * Module 4 — "Area Overlap Grid". a/b of the width is blue, c/d of the height is
 * yellow; the green overlap is a·c of the b·d small squares.
 */
export default function AreaOverlap({ a: a0 = 2, b: b0 = 3, c: c0 = 3, d: d0 = 4 }: { a?: number; b?: number; c?: number; d?: number }) {
  const [b, setB] = useState(clamp(b0, 1, 10));
  const [a, setA] = useState(clamp(a0, 0, b0));
  const [d, setD] = useState(clamp(d0, 1, 10));
  const [c, setC] = useState(clamp(c0, 0, d0));

  const top = a * c;
  const bottom = b * d;
  const [sn, sd] = simplify(top, bottom);
  let tex = `\\dfrac{${a}}{${b}} \\times \\dfrac{${c}}{${d}} = \\dfrac{${a} \\times ${c}}{${b} \\times ${d}} = \\dfrac{${top}}{${bottom}}`;
  if (top > 0 && sd !== bottom) tex += ` = \\dfrac{${sn}}{${sd}}`;

  const proper = a > 0 && c > 0 && a < b && c < d;
  const insight =
    top === 0
      ? "Nothing overlaps: a fraction of zero is zero."
      : proper
        ? "The green part is smaller than the blue strip and smaller than the yellow strip: a fraction of a fraction is smaller than both."
        : a === b || c === d
          ? "One side is the whole thing (= 1), and multiplying by 1 changes nothing."
          : "";

  return (
    <WidgetPanel>
      <div className="grid items-start gap-5 sm:grid-cols-[1fr_1.1fr]">
        <div className="mx-auto w-full max-w-72">
          <div className="mb-1 text-center text-xs font-semibold text-blue-600">← {a} of {b} columns →</div>
          <div className="flex items-center gap-1">
            <div className="text-xs font-semibold text-yellow-700 [writing-mode:vertical-rl] rotate-180">{c} of {d} rows</div>
            <div className="flex-1 rounded-xl bg-white p-1">
              <OverlapGrid a={[a, b]} b={[c, d]} />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Slider label="Blue: columns shaded (a)" value={a} min={0} max={b} color={C.blue} onChange={setA} />
          <Slider
            label="Blue: columns in total (b)"
            value={b}
            min={1}
            max={10}
            color={C.blue}
            onChange={(v) => {
              setB(v);
              setA((x) => Math.min(x, v));
            }}
          />
          <Slider label="Yellow: rows shaded (c)" value={c} min={0} max={d} color="#ca8a04" onChange={setC} />
          <Slider
            label="Yellow: rows in total (d)"
            value={d}
            min={1}
            max={10}
            color="#ca8a04"
            onChange={(v) => {
              setD(v);
              setC((x) => Math.min(x, v));
            }}
          />
          <ul className="space-y-1 text-sm text-slate-600">
            <li className="flex items-center gap-2"><Swatch c={C.blueSoft} /> blue only</li>
            <li className="flex items-center gap-2"><Swatch c="#fef9c3" /> yellow only</li>
            <li className="flex items-center gap-2"><Swatch c={C.green} /> <strong>both = the answer:</strong> {top} of {bottom} squares</li>
          </ul>
        </div>
      </div>
      <EquationBar tex={tex}>{insight}</EquationBar>
    </WidgetPanel>
  );
}

const Swatch = ({ c }: { c: string }) => <span className="inline-block size-4 rounded border border-slate-300" style={{ background: c }} />;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
