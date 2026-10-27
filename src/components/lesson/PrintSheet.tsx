import type { CheatSheet } from "../../types/content";
import { Rich } from "../ui/primitives";
import { Tex } from "../widgets/controls";
import { VisualFigure } from "../widgets/figures";

/** One-page revision sheet. Hidden on screen; it's the only thing that prints. */
export default function PrintSheet({ sheet, title, subject }: { sheet: CheatSheet; title: string; subject?: string }) {
  return (
    <section className="hidden text-[11px] leading-snug text-slate-900 print:block" aria-hidden>
      <header className="mb-3 flex items-end justify-between border-b-2 border-slate-900 pb-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{subject} · Formula &amp; visual summary</div>
          <h1 className="text-xl font-bold">{sheet.title ?? title}</h1>
        </div>
        <div className="text-right text-[10px] text-slate-500">Kakshya 7 · learn.sagunpradhan.com.np</div>
      </header>
      {sheet.intro && <Rich text={sheet.intro} className="mb-3 text-[11px] text-slate-700" />}
      <div className="grid grid-cols-2 gap-2.5">
        {sheet.items.map((item, i) => (
          <article key={i} className="break-inside-avoid rounded-lg border border-slate-300 p-2.5">
            <h2 className="text-[12px] font-bold">{item.title}</h2>
            {item.tex && (
              <div className="my-1 text-center text-[13px]">
                <Tex tex={item.tex} display />
              </div>
            )}
            {item.visual && (
              <div className="print-visual my-1 flex h-[118px] justify-center">
                <VisualFigure visual={item.visual} />
              </div>
            )}
            {item.body && <Rich text={item.body} className="text-[10.5px] text-slate-700 [&>*+*]:mt-1" />}
          </article>
        ))}
      </div>
    </section>
  );
}
