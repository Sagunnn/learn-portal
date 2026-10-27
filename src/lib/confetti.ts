/**
 * Small dependency-free confetti burst on a temporary full-screen canvas.
 * Skipped entirely when the student prefers reduced motion.
 */
const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9", "#a855f7"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  life: number;
  round: boolean;
}

let canvas: HTMLCanvasElement | null = null;
let particles: Particle[] = [];
let running = false;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function ensureCanvas() {
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "60" });
  document.body.appendChild(canvas);
  return canvas;
}

function frame() {
  const c = canvas;
  if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  if (c.width !== innerWidth * dpr || c.height !== innerHeight * dpr) {
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
  }
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of particles) {
    p.vy += 0.32; // gravity
    p.vx *= 0.985; // air
    p.vy *= 0.985;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.round) {
      ctx.beginPath();
      ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1);
    }
    ctx.restore();
  }
  if (particles.length) requestAnimationFrame(frame);
  else {
    running = false;
    canvas?.remove();
    canvas = null;
  }
}

/** Burst from a screen point. `power` scales particle count and speed. */
export function confetti(x = innerWidth / 2, y = innerHeight / 3, power = 1) {
  if (typeof window === "undefined" || reducedMotion()) return;
  ensureCanvas();
  const count = Math.round(70 * power);
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = (6 + Math.random() * 8) * Math.min(1.4, 0.7 + power * 0.4);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 90 + Math.random() * 50,
      round: Math.random() < 0.25,
    });
  }
  if (!running) {
    running = true;
    requestAnimationFrame(frame);
  }
}

/** Burst from the centre of an element (falls back to the top-middle of the screen). */
export function confettiAt(el: Element | null | undefined, power = 1) {
  if (!el) return confetti(undefined, undefined, power);
  const r = el.getBoundingClientRect();
  confetti(r.left + r.width / 2, r.top + r.height / 2, power);
}
