import { useRef, useState } from "react";
import { confettiAt } from "../../lib/confetti";
import { progress } from "../../lib/progress";
import { splitStory } from "../../lib/story";
import { useProgress } from "../../hooks/useProgress";
import { Bubble, Coach } from "../ui/Coach";
import { useLessonId } from "./LessonContext";
import type {
  InteractiveChunk,
  TextChunk,
  CalloutChunk,
  Chunk,
  FormulaChunk,
  MorphemeRole,
  PracticeChunk,
  TableChunk,
  WordBreakdownChunk,
} from "../../types/content";
import { Accordion, Button, LangProvider, Rich, cx, langProps, useLang } from "../ui/primitives";
import QuestionView from "../quiz/QuestionView";
import { renderRich } from "../../lib/richText";
import { WIDGETS } from "../widgets/registry";

export interface ChunkViewProps {
  chunk: Chunk;
  /** check chunks: called when answered */
  onResolved?: (r: { firstTry: boolean }) => void;
  /** check chunks the student already passed (e.g. after a reload) */
  review?: boolean;
  /** text chunks: how many speech bubbles to show (all when undefined) */
  reveal?: number;
}

export default function ChunkView(props: ChunkViewProps) {
  const inherited = useLang();
  const lang = props.chunk.lang ?? inherited;
  return (
    <LangProvider value={lang}>
      <ChunkBody {...props} />
    </LangProvider>
  );
}

function ChunkBody({ chunk, onResolved, review, reveal }: ChunkViewProps) {
  const ne = useLang() === "ne";
  switch (chunk.type) {
    case "text":
      return <Story chunk={chunk} reveal={reveal} />;
    case "callout":
      return <Callout chunk={chunk} />;
    case "formula":
      return <Formula chunk={chunk} />;
    case "wordBreakdown":
      return <WordBreakdown chunk={chunk} />;
    case "table":
      return <Table chunk={chunk} />;
    case "practice":
      return <Practice chunk={chunk} />;
    case "check":
      return (
        <div>
          <Eyebrow>{ne ? "छिटो जाँच" : "Quick check"}</Eyebrow>
          <QuestionView question={chunk.question} onResolved={onResolved} review={review} />
        </div>
      );
    case "interactive":
      return <Interactive chunk={chunk} />;
    case "image":
      return (
        <figure>
          <img src={chunk.src} alt={chunk.alt} loading="lazy" className="mx-auto max-h-96 rounded-xl" />
          {chunk.caption && (
            <figcaption className="mt-2 text-center text-base text-slate-500">
              <Rich text={chunk.caption} inline />
            </figcaption>
          )}
        </figure>
      );
  }
}

// ---- Pieces ----------------------------------------------------------------------

/** Text as a short story: the coach says one bubble per Continue. */
function Story({ chunk, reveal }: { chunk: TextChunk; reveal?: number }) {
  const segments = splitStory(chunk.body);
  const shown = reveal === undefined ? segments.length : Math.min(reveal, segments.length);
  return (
    <div>
      {chunk.title && (
        <h3 className="mb-4 text-2xl font-semibold text-slate-800 sm:text-3xl">
          <Rich text={chunk.title} inline />
        </h3>
      )}
      <Coach>
        {segments.slice(0, shown).map((s, i) => (
          <Bubble key={i} isNew={reveal !== undefined && i === shown - 1 && i > 0}>
            <Rich text={s} />
          </Bubble>
        ))}
      </Coach>
    </div>
  );
}

/** A widget, its intro as coach bubbles, auto-checked challenges and a "Try this" list. */
function Interactive({ chunk }: { chunk: InteractiveChunk }) {
  const ne = useLang() === "ne";
  const Widget = WIDGETS[chunk.widget];
  const lessonId = useLessonId();
  const done = new Set(useProgress().lessons[lessonId]?.challengesDone ?? []);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [justSolved, setJustSolved] = useState<string | null>(null);

  const onState = (s: Record<string, number>) => {
    for (const c of chunk.challenges ?? []) {
      if (done.has(c.id)) continue;
      const met = Object.entries(c.goal).every(([k, g]) =>
        typeof g === "number" ? s[k] === g : s[k] !== undefined && (g.min === undefined || s[k] >= g.min) && (g.max === undefined || s[k] <= g.max),
      );
      if (met) {
        if (progress.completeChallenge(lessonId, c.id, c.xp) > 0) {
          confettiAt(rowRefs.current[c.id], 1.2);
          setJustSolved(c.id);
        }
      }
    }
  };

  return (
    <div>
      <Eyebrow>{ne ? "चलाएर हेर्नुहोस्" : "🧪 Hands-on"}</Eyebrow>
      {chunk.title && <Title>{chunk.title}</Title>}
      {chunk.intro && (
        <Coach className="mb-4">
          {splitStory(chunk.intro).map((s, i) => (
            <Bubble key={i} tone="indigo">
              <Rich text={s} />
            </Bubble>
          ))}
        </Coach>
      )}
      {Widget ? <Widget {...chunk.props} onState={onState} /> : <p className="text-rose-600">Unknown widget "{chunk.widget}"</p>}

      {chunk.challenges && chunk.challenges.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between font-display text-lg font-semibold text-slate-800">
            <span>🏆 {ne ? "चुनौती" : chunk.challenges.some((c) => (c.xp ?? 5) >= 50) ? "Missions" : "Challenges"}</span>
            <span className="text-slate-400">
              {chunk.challenges.filter((c) => done.has(c.id)).length}/{chunk.challenges.length}
            </span>
          </div>
          <ul className="space-y-2">
            {chunk.challenges.map((c) => {
              const ok = done.has(c.id);
              return (
                <li
                  key={c.id}
                  ref={(el) => {
                    rowRefs.current[c.id] = el;
                  }}
                  className={cx(
                    "flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-lg transition-colors duration-300",
                    ok ? "border-emerald-300 bg-emerald-50" : "border-amber-200 bg-amber-50/60",
                    justSolved === c.id && "animate-celebrate",
                  )}
                >
                  <span
                    className={cx(
                      "grid size-7 shrink-0 place-items-center rounded-full text-base font-extrabold",
                      ok ? "bg-emerald-500 text-white" : "border-2 border-dashed border-slate-300 text-slate-300",
                    )}
                    aria-hidden
                  >
                    {ok ? "✓" : "?"}
                  </span>
                  <Rich text={c.text} className={cx("min-w-0 flex-1", ok ? "text-emerald-900" : "text-slate-700")} />
                  <span className={cx("shrink-0 text-sm font-extrabold", ok ? "text-emerald-600" : "text-amber-600")}>
                    {ok ? (ne ? "भयो!" : "Done!") : `+${c.xp ?? 5} XP`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {chunk.tasks && chunk.tasks.length > 0 && <Tasks tasks={chunk.tasks} />}
    </div>
  );
}

/** "Try this" checklist under a widget; ticking is just for the student. */
/** "Think about it" prompts, asked by the coach. Tapping one ticks it off. */
function Tasks({ tasks }: { tasks: string[] | (string | string[])[] }) {
  const [done, setDone] = useState<Set<number>>(() => new Set());
  return (
    <Coach className="mt-6" mood="think">
      {tasks.map((t, i) => (
        <button
          key={i}
          type="button"
          aria-pressed={done.has(i)}
          onClick={() => {
            const next = new Set(done);
            next.has(i) ? next.delete(i) : next.add(i);
            setDone(next);
          }}
          className={cx(
            "flex w-fit max-w-full items-start gap-2 rounded-3xl rounded-tl-md border-2 px-5 py-3 text-left font-sans text-lg font-semibold transition-colors",
            done.has(i) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-orange-200 bg-orange-50 text-slate-800 hover:bg-orange-100",
          )}
        >
          <span aria-hidden>{done.has(i) ? "✅" : "🤔"}</span>
          <Rich text={t} inline />
        </button>
      ))}
    </Coach>
  );
}

function Title({ children }: { children: string }) {
  return (
    <h3 className="mb-3 text-2xl font-semibold text-slate-800 sm:text-3xl">
      <Rich text={children} inline />
    </h3>
  );
}

function Eyebrow({ children }: { children: string }) {
  return <div className="mb-1 font-display text-base font-semibold uppercase tracking-widest text-indigo-600">{children}</div>;
}

const CALLOUTS: Record<CalloutChunk["variant"], { icon: string; en: string; ne: string; className: string }> = {
  tip: { icon: "💡", en: "Tip", ne: "सुझाव", className: "border-sky-200 bg-sky-50" },
  remember: { icon: "📌", en: "Remember", ne: "याद गर्नुहोस्", className: "border-amber-200 bg-amber-50" },
  warning: { icon: "⚠️", en: "Watch out", ne: "ध्यान दिनुहोस्", className: "border-rose-200 bg-rose-50" },
  example: { icon: "✏️", en: "Example", ne: "उदाहरण", className: "border-violet-200 bg-violet-50" },
  fact: { icon: "🌍", en: "Did you know?", ne: "के तपाईंलाई थाहा छ?", className: "border-emerald-200 bg-emerald-50" },
};

function Callout({ chunk }: { chunk: CalloutChunk }) {
  const lang = useLang();
  const v = CALLOUTS[chunk.variant];
  const lp = langProps(lang);
  return (
    <aside className={cx("rounded-2xl border p-5", v.className)}>
      <div lang={lp.lang} className={cx("mb-1 flex items-center gap-2 font-bold text-slate-900", lp.className)}>
        <span aria-hidden>{v.icon}</span>
        {chunk.title ?? (lang === "ne" ? v.ne : v.en)}
      </div>
      <Rich text={chunk.body} className="text-slate-700" />
    </aside>
  );
}

function Formula({ chunk }: { chunk: FormulaChunk }) {
  return (
    <div>
      {chunk.title && <Title>{chunk.title}</Title>}
      <div className="grid gap-3 sm:grid-cols-2">
        {chunk.items.map((f, i) => (
          <div key={i} className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 text-center">
            <div
              className="overflow-x-auto py-1 text-slate-900"
              dangerouslySetInnerHTML={{ __html: renderRich(`$$${f.tex}$$`) }}
            />
            {f.label && <Rich text={f.label} inline className="text-base font-medium text-indigo-700" />}
          </div>
        ))}
      </div>
      {chunk.caption && <Rich text={chunk.caption} className="mt-3 text-slate-600" />}
    </div>
  );
}

const ROLE_STYLE: Record<MorphemeRole, { chip: string; en: string; ne: string }> = {
  prefix: { chip: "bg-rose-100 text-rose-800 border-rose-200", en: "Prefix", ne: "उपसर्ग" },
  root: { chip: "bg-slate-100 text-slate-800 border-slate-200", en: "Root", ne: "मूल शब्द" },
  suffix: { chip: "bg-indigo-100 text-indigo-800 border-indigo-200", en: "Suffix", ne: "प्रत्यय" },
};

/** Tap a word to split it into prefix + root + suffix. */
function WordBreakdown({ chunk }: { chunk: WordBreakdownChunk }) {
  const lang = useLang();
  const ne = lang === "ne";
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const allOpen = open.size === chunk.items.length;
  const lp = langProps(lang);

  return (
    <div>
      {chunk.title && <Title>{chunk.title}</Title>}
      {chunk.intro && <Rich text={chunk.intro} className="mb-3 text-slate-700" />}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-base text-slate-500">{ne ? "शब्दमा थिचेर टुक्र्याउनुहोस्।" : "Tap a word to break it apart."}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(allOpen ? new Set() : new Set(chunk.items.map((_, i) => i)))}
        >
          {allOpen ? (ne ? "सबै जोड्नुहोस्" : "Join all") : ne ? "सबै टुक्र्याउनुहोस्" : "Break all"}
        </Button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {chunk.items.map((item, i) => {
          const isOpen = open.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  const next = new Set(open);
                  isOpen ? next.delete(i) : next.add(i);
                  setOpen(next);
                }}
                className={cx(
                  "w-full rounded-2xl border-2 bg-white p-4 text-left transition hover:border-slate-300",
                  isOpen ? "border-slate-300" : "border-slate-200",
                )}
              >
                <div lang={lp.lang} className={cx("text-2xl font-bold text-slate-900", lp.className)}>
                  {item.word}
                </div>
                {isOpen && (
                  <div className="mt-3 animate-rise">
                    <div className="flex flex-wrap items-start gap-1.5">
                      {item.parts.map((p, j) => (
                        <span key={j} className="flex items-start gap-1.5">
                          {j > 0 && <span className="pt-1.5 font-bold text-slate-400">+</span>}
                          <span className="flex flex-col items-center">
                            <span lang={lp.lang} className={cx("rounded-lg border px-2.5 py-1 text-lg font-semibold", ROLE_STYLE[p.role].chip, lp.className)}>
                              {p.text}
                            </span>
                            <span lang={lp.lang} className={cx("mt-0.5 text-[11px] font-medium text-slate-500", ne && "font-deva")}>
                              {ne ? ROLE_STYLE[p.role].ne : ROLE_STYLE[p.role].en}
                            </span>
                          </span>
                        </span>
                      ))}
                    </div>
                    {item.meaning && <Rich text={item.meaning} className="mt-2 text-base text-slate-600" />}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Table({ chunk }: { chunk: TableChunk }) {
  const lp = langProps(useLang());
  return (
    <div>
      {chunk.title && <Title>{chunk.title}</Title>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table lang={lp.lang} className={cx("w-full min-w-max border-collapse text-left text-base", lp.className)}>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {chunk.headers.map((h, i) => (
                <th key={i} scope="col" className="px-4 py-2.5 font-semibold">
                  <Rich text={h} inline />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {chunk.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className={cx("px-4 py-2.5 align-top text-slate-700", c === 0 && "font-semibold text-slate-900")}>
                    <Rich text={cell} inline />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Problem + Hint accordion + Step-by-step solution that reveals one step at a time. */
function Practice({ chunk }: { chunk: PracticeChunk }) {
  const ne = useLang() === "ne";
  const [shown, setShown] = useState(1);
  const allShown = shown >= chunk.steps.length;

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5">
      <Eyebrow>{chunk.title ?? (ne ? "अभ्यास गरौँ" : "Try it yourself")}</Eyebrow>
      <Rich text={chunk.problem} className="text-lg font-semibold text-slate-900" />
      <p className="mt-1 text-base text-slate-500">
        {ne ? "पहिले कापीमा आफैँ हल गर्नुहोस्, अनि मिलाउनुहोस्।" : "Work it out on paper first, then check below."}
      </p>
      <div className="mt-4 space-y-2">
        {chunk.hint && (
          <Accordion title={ne ? "सङ्केत" : "Hint"} icon="💡" tone="amber">
            <Rich text={chunk.hint} className="text-slate-700" />
          </Accordion>
        )}
        <Accordion title={ne ? "चरणबद्ध समाधान" : "Step-by-step solution"} icon="🧩" tone="emerald">
          <ol className="space-y-3">
            {chunk.steps.slice(0, shown).map((step, i) => (
              <li key={i} className="flex animate-rise gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white">{i + 1}</span>
                <Rich text={step} className="min-w-0 flex-1 text-slate-700" />
              </li>
            ))}
          </ol>
          {allShown ? (
            <div className="mt-4 animate-rise rounded-xl bg-emerald-600 px-4 py-3 text-white [&_.katex]:text-white">
              <span className="font-bold">{ne ? "उत्तर: " : "Answer: "}</span>
              <Rich text={chunk.answer} inline />
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="success" onClick={() => setShown(shown + 1)}>
                {ne ? "अर्को चरण" : "Next step"} ↓
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShown(chunk.steps.length)}>
                {ne ? "सबै देखाउनुहोस्" : "Show all"}
              </Button>
            </div>
          )}
        </Accordion>
      </div>
    </div>
  );
}
