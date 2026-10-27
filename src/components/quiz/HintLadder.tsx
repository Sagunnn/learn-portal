import { useState } from "react";
import type { Hint } from "../../types/content";
import { Button, Rich, useLang } from "../ui/primitives";
import { VisualFigure } from "../widgets/figures";

const LABELS_EN = ["Nudge", "Set it up", "Full solution"];
const LABELS_NE = ["सङ्केत", "तयारी", "पूरा समाधान"];

/** Hints revealed one at a time: a nudge, then the setup, then the full (visual) solution. */
export default function HintLadder({ hints, lang }: { hints: Hint[]; lang?: "en" | "ne" }) {
  const inherited = useLang();
  const ne = (lang ?? inherited) === "ne";
  const [shown, setShown] = useState(0);
  const labels = hints.length === 3 ? (ne ? LABELS_NE : LABELS_EN) : null;

  return (
    <div className="space-y-2">
      {hints.slice(0, shown).map((h, i) => {
        const text = typeof h === "object" && !Array.isArray(h) ? h.text : h;
        const visual = typeof h === "object" && !Array.isArray(h) ? h.visual : undefined;
        return (
          <div key={i} className="animate-rise rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">
              💡 {ne ? "सङ्केत" : "Hint"} {i + 1}
              {labels && ` · ${labels[i]}`}
            </div>
            <Rich text={text} lang={lang} className="text-slate-700" />
            {visual && (
              <div className="mt-3 rounded-lg bg-white p-2">
                <VisualFigure visual={visual} />
              </div>
            )}
          </div>
        );
      })}
      {shown < hints.length && (
        <Button size="sm" variant="secondary" className="border-amber-200 text-amber-800" onClick={() => setShown(shown + 1)}>
          💡{" "}
          {shown === 0
            ? ne ? "सङ्केत चाहियो?" : "Need a hint?"
            : ne
              ? `अर्को सङ्केत (${shown + 1}/${hints.length})`
              : `Next hint (${shown + 1} of ${hints.length})`}
        </Button>
      )}
    </div>
  );
}
