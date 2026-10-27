/**
 * A small friendly face for drawings (test tubes, beakers, crates…).
 * Centre at (x, y); `scale` 1 ≈ 30px wide. Moods change the eyes and mouth.
 */
export type Mood = "happy" | "sour" | "wow" | "calm" | "strain" | "curious";

export default function Face({ x, y, scale = 1, mood = "happy" }: { x: number; y: number; scale?: number; mood?: Mood }) {
  const ink = "#3D405B";
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden style={{ transition: "transform 300ms" }}>
      {/* cheeks */}
      <ellipse cx={-11} cy={5} rx={4} ry={2.6} fill="#F6A6A0" opacity={0.6} />
      <ellipse cx={11} cy={5} rx={4} ry={2.6} fill="#F6A6A0" opacity={0.6} />
      {/* eyes */}
      {mood === "sour" ? (
        <>
          <path d="M-10 -5 l5 3 l-5 3" fill="none" stroke={ink} strokeWidth={2.4} />
          <path d="M10 -5 l-5 3 l5 3" fill="none" stroke={ink} strokeWidth={2.4} />
        </>
      ) : mood === "strain" ? (
        <>
          <path d="M-11 -3 h7" stroke={ink} strokeWidth={2.6} />
          <path d="M4 -3 h7" stroke={ink} strokeWidth={2.6} />
        </>
      ) : (
        <>
          <ellipse cx={-7} cy={-2} rx={mood === "wow" ? 3.4 : 2.8} ry={mood === "calm" ? 1.6 : mood === "wow" ? 4 : 3.4} fill={ink} />
          <ellipse cx={7} cy={-2} rx={mood === "wow" ? 3.4 : 2.8} ry={mood === "calm" ? 1.6 : mood === "wow" ? 4 : 3.4} fill={ink} />
          {mood !== "calm" && (
            <>
              <circle cx={-6} cy={-3.4} r={1} fill="white" />
              <circle cx={8} cy={-3.4} r={1} fill="white" />
            </>
          )}
        </>
      )}
      {/* mouth */}
      {mood === "happy" && <path d="M-5 5 q5 5 10 0" fill="none" stroke={ink} strokeWidth={2.4} />}
      {mood === "calm" && <path d="M-3 6 q3 2 6 0" fill="none" stroke={ink} strokeWidth={2.2} />}
      {mood === "sour" && <path d="M-6 8 q2 -3 4 0 q2 3 4 0 q2 -3 4 0" fill="none" stroke={ink} strokeWidth={2.2} />}
      {mood === "wow" && <ellipse cx={0} cy={7} rx={3} ry={3.6} fill={ink} />}
      {mood === "strain" && <path d="M-5 7 h10" stroke={ink} strokeWidth={2.4} />}
      {mood === "curious" && <path d="M-4 7 q4 -2 8 1" fill="none" stroke={ink} strokeWidth={2.2} />}
    </g>
  );
}
