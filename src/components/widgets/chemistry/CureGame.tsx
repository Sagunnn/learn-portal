import { useState } from "react";
import { confettiAt } from "../../../lib/confetti";
import { cx } from "../../ui/primitives";
import { WidgetPanel, useReportState, type WidgetState } from "../controls";
import { Chem } from "./chem";

/**
 * "Real-Life Cure" mini-game: pick the right mild acid/base to neutralise each
 * problem. Wrong picks explain why.
 */
type Remedy = { id: string; name: string; formula?: string; kind: "acid" | "mild base" | "base" | "strong base" };
const REMEDIES: Record<string, Remedy> = {
  magnesia: { id: "magnesia", name: "Milk of magnesia (antacid)", formula: "Mg(OH)2", kind: "mild base" },
  soda: { id: "soda", name: "Baking soda paste", formula: "NaHCO3", kind: "mild base" },
  lime: { id: "lime", name: "Slaked lime", formula: "Ca(OH)2", kind: "base" },
  lemon: { id: "lemon", name: "Lemon juice", kind: "acid" },
  vinegar: { id: "vinegar", name: "Vinegar", kind: "acid" },
  drain: { id: "drain", name: "Drain cleaner", formula: "NaOH", kind: "strong base" },
};

const CASES = [
  {
    id: "stomach",
    icon: "🤢",
    cured: "😌",
    title: "Indigestion",
    problem: "Too much stomach acid is burning after a big spicy meal.",
    options: ["lemon", "magnesia", "drain"],
    answer: "magnesia",
    why: {
      lemon: "Lemon juice is an acid. Adding acid to an acidic stomach makes it worse!",
      drain: "Drain cleaner is a very strong, corrosive base. Never swallow it: it burns.",
    } as Record<string, string>,
    win: "A mild base (antacid) neutralises the extra stomach acid.",
  },
  {
    id: "bee",
    icon: "🐝",
    cured: "🙂",
    title: "Bee sting",
    problem: "A bee sting injects an acidic liquid that stings and itches.",
    options: ["vinegar", "lime", "soda"],
    answer: "soda",
    why: {
      vinegar: "Vinegar is an acid, and the sting is already acidic. (Vinegar helps a wasp sting, which is basic.)",
      lime: "Slaked lime is a base, but it's too harsh for skin. It's meant for soil and whitewash.",
    } as Record<string, string>,
    win: "Baking soda is a mild base: it neutralises the acid in the sting.",
  },
  {
    id: "soil",
    icon: "🥀",
    cured: "🌱",
    title: "Acidic soil",
    problem: "The field's soil is too acidic, so crops grow badly.",
    options: ["lime", "vinegar", "magnesia"],
    answer: "lime",
    why: {
      vinegar: "Vinegar is an acid. It would make the soil even more acidic.",
      magnesia: "It is a base, but it's a medicine and far too costly for a whole field.",
    } as Record<string, string>,
    win: "Farmers spread cheap slaked lime, a base, to neutralise acidic soil.",
  },
];

export default function CureGame({ onState }: { onState?: (s: WidgetState) => void }) {
  const [cured, setCured] = useState<Record<string, boolean>>({});
  const [wrong, setWrong] = useState<Record<string, string | undefined>>({});
  const count = Object.values(cured).filter(Boolean).length;
  useReportState({ cured: count }, onState);

  const pick = (caseId: string, remedyId: string, el: HTMLElement) => {
    const c = CASES.find((x) => x.id === caseId)!;
    if (cured[caseId]) return;
    if (remedyId === c.answer) {
      setCured({ ...cured, [caseId]: true });
      setWrong({ ...wrong, [caseId]: undefined });
      confettiAt(el, 0.8);
    } else {
      setWrong({ ...wrong, [caseId]: c.why[remedyId] });
    }
  };

  return (
    <WidgetPanel>
      <div className="flex items-center justify-between text-base font-bold text-slate-600">
        <span>Pick the remedy that neutralises each problem.</span>
        <span className="tabular-nums">{count}/3 cured</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {CASES.map((c) => {
          const done = cured[c.id];
          return (
            <div
              key={c.id}
              className={cx(
                "flex flex-col rounded-2xl border-2 border-b-4 p-4 transition-colors duration-500",
                done ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white",
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cx("text-4xl", done && "animate-pop")} aria-hidden>
                  {done ? c.cured : c.icon}
                </span>
                <div>
                  <div className="font-extrabold text-slate-900">{c.title}</div>
                  <div className="text-sm font-bold uppercase tracking-wide text-rose-600">{done ? "Cured ✓" : "Problem: acid"}</div>
                </div>
              </div>
              <p className="mt-2 text-base text-slate-600">{done ? c.win : c.problem}</p>
              {!done && (
                <div className="mt-3 space-y-2">
                  {c.options.map((id) => {
                    const r = REMEDIES[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={(e) => pick(c.id, id, e.currentTarget)}
                        className="press flex w-full items-center justify-between gap-2 rounded-2xl border-slate-200 bg-white px-3 py-2 text-left text-base font-bold text-slate-700 hover:border-indigo-300"
                      >
                        <span>
                          {r.name}
                          {r.formula && (
                            <span className="ml-1 font-semibold text-slate-400">
                              (<Chem f={r.formula} />)
                            </span>
                          )}
                        </span>
                        <span
                          className={cx(
                            "shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-extrabold uppercase",
                            r.kind === "acid" ? "bg-rose-100 text-rose-700" : r.kind === "strong base" ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700",
                          )}
                        >
                          {r.kind}
                        </span>
                      </button>
                    );
                  })}
                  {wrong[c.id] && (
                    <div role="status" className="animate-shake rounded-xl border-b-4 border-rose-500 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                      <span className="font-extrabold text-rose-300">Not that one: </span>
                      {wrong[c.id]}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </WidgetPanel>
  );
}
