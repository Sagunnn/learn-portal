import { RotateCcw } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useProgress } from "../../hooks/useProgress";
import { confettiAt } from "../../lib/confetti";
import { progress } from "../../lib/progress";
import { splitStory } from "../../lib/story";
import type { GoalValue, InteractiveChunk } from "../../types/content";
import { Bubble, Coach } from "../ui/Coach";
import { Rich, cx, useLang } from "../ui/primitives";
import { WIDGETS } from "../widgets/registry";
import { useLessonId } from "./LessonContext";

const meets = (s: Record<string, number>, goal: Record<string, GoalValue>) =>
  Object.entries(goal).every(([k, g]) =>
    typeof g === "number" ? s[k] === g : s[k] !== undefined && (g.min === undefined || s[k] >= g.min) && (g.max === undefined || s[k] <= g.max),
  );

/**
 * One hands-on lab on stage:
 *  - a 🎯 Goal banner (the first challenge) that turns green, bounces and explains why once solved,
 *    with any bonus goals listed underneath;
 *  - a "Reset Lab 🔄" button that remounts the widget;
 *  - a pulsing "👆 Tap me to start!" hint over the widget's [data-start] element until the first touch.
 */
export default function InteractiveStage({ chunk, onGoal }: { chunk: InteractiveChunk; onGoal?: () => void }) {
  const ne = useLang() === "ne";
  const Widget = WIDGETS[chunk.widget];
  const lessonId = useLessonId();
  const done = new Set(useProgress().lessons[lessonId]?.challengesDone ?? []);
  const [run, setRun] = useState(0); // bump to reset the lab
  const [justSolved, setJustSolved] = useState<string | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const challenges = chunk.challenges ?? [];
  const goal = challenges[0];
  const bonus = challenges.slice(1);
  const goalDone = !!goal && done.has(goal.id);
  const nextBonus = bonus.find((c) => !done.has(c.id));

  useEffect(() => {
    if (goalDone) onGoal?.();
  }, [goalDone, onGoal]);

  const onState = (s: Record<string, number>) => {
    for (const c of challenges) {
      if (done.has(c.id) || !meets(s, c.goal)) continue;
      if (progress.completeChallenge(lessonId, c.id, c.xp) > 0) {
        confettiAt(bannerRef.current, c === goal ? 1.6 : 1);
        setJustSolved(c.id);
      }
    }
  };

  return (
    <div>
      <div className="mb-1 font-display text-sm font-semibold uppercase tracking-widest text-indigo-600">{ne ? "चलाएर हेर्नुहोस्" : "Hands-on lab"}</div>
      {chunk.title && (
        <h3 className="mb-3 text-2xl font-semibold text-slate-900 sm:text-3xl">
          <Rich text={chunk.title} inline />
        </h3>
      )}

      {goal && (
        <div ref={bannerRef} className="mb-4">
          <div
            role="status"
            className={cx(
              "flex items-start gap-3 rounded-2xl border-2 px-4 py-3 text-lg transition-colors duration-500",
              goalDone ? "border-emerald-600 bg-emerald-500 text-white" : "border-indigo-200 bg-indigo-50 text-slate-800",
              justSolved === goal.id && "animate-celebrate",
            )}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {goalDone ? "✅" : "🎯"}
            </span>
            <div className="min-w-0 flex-1">
              <span className="font-display font-semibold">{goalDone ? (ne ? "लक्ष्य पूरा! " : "Goal reached! ") : ne ? "लक्ष्य: " : "Goal: "}</span>
              {goalDone ? (
                goal.explain ? <Rich text={goal.explain} inline /> : <Rich text={goal.text} inline />
              ) : (
                <Rich text={goal.text.replace(/^\*\*Mission:\*\*\s*/, "")} inline />
              )}
            </div>
            <span className={cx("shrink-0 rounded-full px-2.5 py-0.5 font-display text-sm font-semibold", goalDone ? "bg-white/20" : "bg-amber-100 text-amber-800")}>
              {goalDone ? "✓" : `+${goal.xp ?? 5} XP`}
            </span>
          </div>
          {goalDone && bonus.length > 0 && (
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-2 text-base text-slate-700">
              <span aria-hidden>⭐</span>
              {nextBonus ? (
                <>
                  <span className="font-display font-semibold text-amber-700">{ne ? "बोनस:" : "Bonus:"}</span>
                  <Rich text={nextBonus.text.replace(/^\*\*Mission:\*\*\s*/, "")} inline className="min-w-0 flex-1" />
                  <span className="shrink-0 text-sm font-bold text-amber-700">+{nextBonus.xp ?? 5} XP</span>
                </>
              ) : (
                <span className="font-semibold text-emerald-700">{ne ? "सबै बोनस पूरा!" : "Every bonus goal done!"}</span>
              )}
              <span className="ml-auto shrink-0 text-sm font-bold text-slate-400">
                {bonus.filter((c) => done.has(c.id)).length}/{bonus.length}
              </span>
            </div>
          )}
        </div>
      )}

      {chunk.intro && (
        <Coach className="mb-4">
          {splitStory(chunk.intro).map((s, i) => (
            <Bubble key={i} tone="indigo">
              <Rich text={s} />
            </Bubble>
          ))}
        </Coach>
      )}

      <div className="relative">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setRun((r) => r + 1)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-b-4 border-slate-200 bg-white px-4 font-display text-base font-semibold text-slate-600 transition-all hover:bg-slate-50 active:mb-[3px] active:translate-y-[3px] active:border-b-2"
          >
            {ne ? "फेरि सुरु" : "Reset Lab"} <RotateCcw size={17} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
        <StartHint key={run}>
          {Widget ? <Widget key={run} {...chunk.props} onState={onState} /> : <p className="text-rose-600">Unknown widget "{chunk.widget}"</p>}
        </StartHint>
      </div>
    </div>
  );
}

/** Pulsing ring + "👆 Tap me to start!" over the child's [data-start] element, until the first touch. */
function StartHint({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number; hostW: number } | null>(null);
  const [touched, setTouched] = useState(false);

  useLayoutEffect(() => {
    if (touched) return;
    const measure = () => {
      const host = box.current;
      const el = host?.querySelector("[data-start]");
      if (!host || !el) return setRect(null);
      const a = host.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      setRect({ x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height, hostW: a.width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    const t = window.setTimeout(measure, 400); // after fonts / layout settle
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [touched]);

  return (
    <div ref={box} className="relative" onPointerDownCapture={() => setTouched(true)} onKeyDownCapture={() => setTouched(true)}>
      {children}
      {!touched && rect && (
        <div className="pointer-events-none absolute z-10" style={{ left: rect.x - 6, top: rect.y - 6, width: rect.w + 12, height: rect.h + 12 }} aria-hidden>
          <div className="absolute inset-0 animate-pulse rounded-2xl ring-4 ring-indigo-400/60" />
          {/* keep the badge inside the card, even when the target hugs an edge */}
          <div
            className="absolute top-0 -translate-x-1/2 -translate-y-full pb-2"
            style={{ left: Math.max(90, Math.min(rect.hostW - 90, rect.x + rect.w / 2)) - rect.x + 6 }}
          >
            <div className="animate-bounce whitespace-nowrap rounded-full bg-indigo-600 px-3 py-1 font-display text-sm font-semibold text-white shadow-lg">
              👆 Tap me to start!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
