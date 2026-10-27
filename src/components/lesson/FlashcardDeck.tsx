import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { confetti } from "../../lib/confetti";
import { useProgress } from "../../hooks/useProgress";
import { shuffled } from "../../lib/answer";
import { progress } from "../../lib/progress";
import type { Flashcard } from "../../types/content";
import { Button, Card, ProgressBar, Rich, cx, useLang } from "../ui/primitives";

export default function FlashcardDeck({ lessonId, cards, onQuiz }: { lessonId: string; cards: Flashcard[]; onQuiz?: () => void }) {
  const ne = useLang() === "ne";
  const known = new Set(useProgress().lessons[lessonId]?.cardsKnown ?? []);
  const knownCount = cards.filter((c) => known.has(c.id)).length;

  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // Freeze the "unknown" filter for the round, so marking a card doesn't reshuffle the deck under you.
  const [roundKnown, setRoundKnown] = useState(known);

  const deck = useMemo(
    () => (onlyUnknown ? order.filter((i) => !roundKnown.has(cards[i].id)) : order),
    [onlyUnknown, order, roundKnown, cards],
  );
  const done = pos >= deck.length;
  const card = done ? null : cards[deck[pos]];

  const go = (to: number) => {
    setFlipped(false);
    setPos(Math.max(0, Math.min(to, deck.length)));
  };
  const restart = (opts: { shuffle?: boolean; unknown?: boolean } = {}) => {
    setRoundKnown(new Set(progress.get().lessons[lessonId]?.cardsKnown ?? []));
    if (opts.shuffle) setOrder(shuffled(cards.map((_, i) => i)));
    if (opts.unknown !== undefined) setOnlyUnknown(opts.unknown);
    setFlipped(false);
    setPos(0);
  };
  const mark = (isKnown: boolean) => {
    if (!card) return;
    progress.setCardKnown(lessonId, card.id, isKnown);
    const allKnown = cards.every((c) => (c.id === card.id ? isKnown : known.has(c.id)));
    if (isKnown && allKnown && knownCount < cards.length) confetti(innerWidth / 2, innerHeight * 0.5, 2);
    go(pos + 1);
  };

  // Swipe: once flipped, right = got it, left = still learning. Before flipping, swipe moves between cards.
  const drag = useRef<{ x: number; id: number } | null>(null);
  const [dx, setDx] = useState(0);
  const swiped = useRef(false);
  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, id: e.pointerId };
    swiped.current = false;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (drag.current?.id === e.pointerId) setDx(e.clientX - drag.current.x);
  };
  const onPointerUp = () => {
    const d = dx;
    drag.current = null;
    setDx(0);
    if (Math.abs(d) < 70) return;
    swiped.current = true;
    if (flipped) mark(d > 0);
    else go(pos + (d > 0 ? -1 : 1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.closest("input,textarea,button,a") || e.metaKey || e.ctrlKey) return;
      if (done) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") go(pos + 1);
      else if (e.key === "ArrowLeft") go(pos - 1);
      else if (flipped && e.key === "1") mark(false);
      else if (flipped && e.key === "2") mark(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-base">
        <div className="min-w-40 flex-1">
          <div className="mb-1 flex justify-between font-semibold text-slate-600">
            <span>
              {ne ? "थाहा भएका" : "Known"} {knownCount}/{cards.length}
            </span>
            {!done && (
              <span className="tabular-nums text-slate-400">
                {pos + 1}/{deck.length}
              </span>
            )}
          </div>
          <ProgressBar value={knownCount} max={cards.length} barClass="bg-emerald-500" label="Cards known" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => restart({ shuffle: true })}>
          🔀 {ne ? "मिसाउनुहोस्" : "Shuffle"}
        </Button>
        <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-600">
          <input
            type="checkbox"
            className="size-4 accent-slate-900"
            checked={onlyUnknown}
            onChange={(e) => restart({ unknown: e.target.checked })}
          />
          {ne ? "नजानेका मात्र" : "Unknown only"}
        </label>
      </div>

      {card ? (
        <>
          <div className="flip-scene">
            <button
              type="button"
              onClick={() => {
                if (swiped.current) {
                  swiped.current = false;
                  return;
                }
                setFlipped(!flipped);
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                drag.current = null;
                setDx(0);
              }}
              style={{ translate: `${dx}px 0`, rotate: `${dx / 30}deg`, touchAction: "pan-y" }}
              aria-pressed={flipped}
              aria-label={flipped ? "Showing answer. Tap to see the question." : "Showing question. Tap to see the answer."}
              className={cx(
                "flip-card w-full cursor-grab touch-pan-y text-left active:cursor-grabbing",
                flipped && "is-flipped",
                flipped && dx > 30 && "[&_.flip-back]:border-emerald-400 [&_.flip-back]:bg-emerald-50",
                flipped && dx < -30 && "[&_.flip-back]:border-rose-300 [&_.flip-back]:bg-rose-50",
              )}
            >
              <Face side="front" tag={card.tag} footer={ne ? "पल्टाउन थिच्नुहोस्" : "Tap or press Space to flip"}>
                <Rich text={card.front} lang={card.lang} className="text-center text-xl font-semibold text-slate-900 sm:text-2xl" />
              </Face>
              <Face side="back" tag={card.tag} footer={known.has(card.id) ? (ne ? "✓ थाहा छ" : "✓ Marked as known") : " "}>
                <Rich text={card.back} lang={card.lang} className="text-center text-lg text-slate-800" />
              </Face>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => go(pos - 1)} disabled={pos === 0} aria-label="Previous card">
              ←
            </Button>
            {flipped ? (
              <div className="flex flex-1 justify-center gap-2 animate-rise">
                <Button variant="secondary" className="flex-1 border-rose-200 text-rose-700" onClick={() => mark(false)}>
                  {ne ? "अझै सिक्दै" : "Still learning"}
                </Button>
                <Button variant="success" className="flex-1" onClick={() => mark(true)}>
                  {ne ? "थाहा भयो ✓" : "Got it ✓"}
                </Button>
              </div>
            ) : (
              <Button className="flex-1" onClick={() => setFlipped(true)}>
                {ne ? "उत्तर हेर्नुहोस्" : "Show answer"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => go(pos + 1)} aria-label="Next card">
              →
            </Button>
          </div>
        </>
      ) : (
        <Card className="animate-pop p-8 text-center">
          <div className="text-5xl" aria-hidden>
            {knownCount === cards.length ? "🧠" : "📚"}
          </div>
          <h2 className="mt-3 text-xl font-bold text-slate-900">
            {deck.length === 0
              ? ne ? "सबै कार्ड थाहा छ!" : "You know every card!"
              : ne ? "एक चरण पूरा!" : "Round complete"}
          </h2>
          <p className="mt-1 text-slate-600">
            {ne ? `${cards.length} मध्ये ${knownCount} थाहा छ।` : `You know ${knownCount} of ${cards.length} cards.`}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {knownCount < cards.length && <Button onClick={() => restart({ unknown: true })}>{ne ? "नजानेका दोहोर्‍याउनुहोस्" : "Practise the rest"}</Button>}
            <Button variant="secondary" onClick={() => restart({ unknown: false, shuffle: true })}>
              {ne ? "सबै फेरि" : "Go through all again"}
            </Button>
            {onQuiz && (
              <Button variant="secondary" onClick={onQuiz}>
                {ne ? "क्विज खेल्नुहोस्" : "Take the quiz"} →
              </Button>
            )}
          </div>
        </Card>
      )}
      <p className="text-center text-sm text-slate-400">
        {ne ? "पल्टाएपछि दायाँ स्वाइप = थाहा भयो, बायाँ = अझै सिक्दै" : "After flipping: swipe right = got it, left = still learning"} · Space · ← → · 1 · 2
      </p>
    </div>
  );
}

function Face({ side, tag, footer, children }: { side: "front" | "back"; tag?: string; footer: string; children: ReactNode }) {
  const ne = useLang() === "ne";
  return (
    <div
      className={cx(
        "flip-face flex min-h-64 flex-col rounded-3xl border-2 border-b-[6px] p-6 transition-colors",
        side === "front" ? "border-slate-200 bg-white" : "flip-back border-indigo-200 bg-indigo-50",
      )}
    >
      <div className="flex justify-between text-sm font-bold uppercase tracking-wide">
        <span className={side === "front" ? "text-slate-400" : "text-indigo-500"}>{side === "front" ? (ne ? "प्रश्न" : "Question") : ne ? "उत्तर" : "Answer"}</span>
        {tag && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 normal-case">{tag}</span>}
      </div>
      <div className="flex flex-1 items-center justify-center py-6">{children}</div>
      <div className="text-center text-sm text-slate-400">{footer}</div>
    </div>
  );
}
