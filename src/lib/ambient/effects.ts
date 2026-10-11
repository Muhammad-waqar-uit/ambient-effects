import type { Burst, EffectDefinition, EffectProps } from "./types";

/* ---------- shared helpers (port of the reference IIFE helpers) ---------- */

let WIDTH = 0;
let HEIGHT = 0;
let DARK = true;
let REDUCED = false;

/** The component calls this each frame so draw code stays line-for-line with the reference. */
export function setAmbientGlobals(
  width: number,
  height: number,
  dark: boolean,
  reducedMotion: boolean,
): void {
  WIDTH = width;
  HEIGHT = height;
  DARK = dark;
  REDUCED = reducedMotion;
}

function R(): number {
  return Math.random();
}

const TAU = 6.2832;

function mk<T>(n: number, f: (i: number) => T): T[] {
  const a: T[] = [];
  for (let i = 0; i < n; i++) a.push(f(i));
  return a;
}

/** Count scaling from the reference: viewport area + reduced-motion = half density. */
function cnt(n: number): number {
  return Math.round(n * Math.min(1.4, Math.max(0.45, (WIDTH * HEIGHT) / 900000)) * (REDUCED ? 0.5 : 1));
}

/** Color helper honoring theme: lightness is dimmed in light mode. */
function hsl(h: number, s: number, l: number, a: number): string {
  return `hsla(${h}, ${s}%, ${DARK ? l : l * 0.72}%, ${a})`;
}

function wrap(p: { x: number; y: number }, m = 30): void {
  if (p.x < -m) p.x = WIDTH + m;
  if (p.x > WIDTH + m) p.x = -m;
  if (p.y < -m) p.y = HEIGHT + m;
  if (p.y > HEIGHT + m) p.y = -m;
}

/** Cursor repulsion with velocity push, from the reference. */
function rep(
  p: { x: number; y: number; vx: number; vy: number },
  r: number,
  k: number,
  mx: number,
  my: number,
  mvx: number,
  mvy: number,
): number {
  const dx = p.x - mx;
  const dy = p.y - my;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  if (d < r) {
    const f = 1 - d / r;
    p.vx += (dx / d) * f * k + mvx * f * 0.05;
    p.vy += (dy / d) * f * k + mvy * f * 0.05;
    return f;
  }
  return 0;
}

function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  h: number,
  a: number,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hsl(h, 100, 68, a));
  g.addColorStop(1, hsl(h, 100, 68, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = hsl(h, 100, 90, Math.min(1, a + 0.2));
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, r * 0.14), 0, TAU);
  ctx.fill();
}

/* ---------- shared burst system (the reference's E array) ---------- */

export const bursts: { current: Burst[] } = { current: [] };

export function spawnBurst(x: number, y: number, n: number, h: number): void {
  for (let i = 0; i < n; i++) {
    const a = R() * TAU;
    const s = 1 + R() * 5;
    bursts.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, hue: h + R() * 40 - 20 });
  }
}

export function drawBursts(ctx: CanvasRenderingContext2D, dark: boolean): void {
  const E = bursts.current;
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  for (let i = E.length - 1; i >= 0; i--) {
    const e = E[i]!;
    e.x += e.vx;
    e.y += e.vy;
    e.vx *= 0.96;
    e.vy = e.vy * 0.96 + 0.06;
    e.life -= 0.018;
    if (e.life <= 0) {
      E.splice(i, 1);
      continue;
    }
    ctx.fillStyle = hsl(e.hue, 90, 70, e.life);
    ctx.beginPath();
    ctx.arc(e.x, e.y, 2 * e.life + 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

export function clearBursts(): void {
  bursts.current.length = 0;
}

/* ---------- particle storage per effect id ---------- */

const store = new Map<string, unknown[]>();

function storeFor<T>(key: string): T[] {
  let v = store.get(key);
  if (!v) {
    v = [];
    store.set(key, v);
  }
  return v as T[];
}

/** Drop all particle state for an effect (used on switch/resize). */
export function resetEffect(id: string): void {
  store.delete(id);
  if (id === "rain") store.delete("rain-puddles");
}

/**
 * Pointerdown velocity push from the reference: every particle of the active
 * effect that has a vx field and sits within 340px gets shoved away.
 */
export function pushParticles(effectId: string, x: number, y: number): void {
  const A = store.get(effectId);
  if (!A) return;
  for (const raw of A) {
    const p = raw as { x?: number; y?: number; vx?: number; vy?: number };
    if (typeof p.vx !== "number" || typeof p.vy !== "number") continue;
    if (typeof p.x !== "number" || typeof p.y !== "number") continue;
    const dx = p.x - x;
    const dy = p.y - y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < 340) {
      const f = 1 - d / 340;
      p.vx += (dx / d) * 8 * f;
      p.vy += (dy / d) * 8 * f;
    }
  }
}

/* ---------- 1. Fireflies ---------- */

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  ph: number;
  h: number;
}

function initFireflies(_props?: Partial<EffectProps>): void {
  const A = storeFor<Firefly>("fireflies");
  A.length = 0;
  A.push(...mk(cnt(70), () => ({ x: R() * WIDTH, y: R() * HEIGHT, vx: 0, vy: 0, a: R() * TAU, ph: R() * TAU, h: 45 + R() * 30 })));
}

function drawFireflies(props: EffectProps): void {
  const { ctx, mx, my, sv, dark } = props;
  const A = storeFor<Firefly>("fireflies");
  if (A.length === 0) initFireflies(props);
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  A.forEach((p) => {
    p.a += (R() - 0.5) * 0.25;
    p.vx += Math.cos(p.a) * 0.04;
    p.vy += Math.sin(p.a) * 0.04 - sv * 0.01;
    const dx = mx - p.x;
    const dy = my - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 320 && d > 60) {
      p.vx += (dx / d) * 0.03;
      p.vy += (dy / d) * 0.03;
    }
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.x += p.vx;
    p.y += p.vy;
    wrap(p);
    glow(ctx, p.x, p.y, 14, p.h, 0.3 + 0.7 * Math.max(0, Math.sin(props.time * 2 + p.ph)));
  });
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 2. Snow ---------- */

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  ph: number;
}

function initSnow(_props?: Partial<EffectProps>): void {
  const A = storeFor<Snowflake>("snow");
  A.length = 0;
  A.push(...mk(cnt(170), () => ({ x: R() * WIDTH, y: R() * HEIGHT, vx: 0, vy: 0, z: R(), ph: R() * TAU })));
}

function drawSnow(props: EffectProps): void {
  const { ctx, mx, my, mvx, mvy, sv, wind } = props;
  const A = storeFor<Snowflake>("snow");
  if (A.length === 0) initSnow(props);
  A.forEach((p) => {
    rep(p, 160, 1.2, mx, my, mvx, mvy);
    p.vy -= sv * 0.03 * (0.4 + p.z);
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.x += p.vx + Math.sin(props.time + p.ph) * 0.4 + wind;
    p.y += p.vy + 0.5 + p.z * 1.3;
    wrap(p);
    ctx.fillStyle = hsl(205, 50, 92, 0.45 + 0.5 * p.z);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1 + p.z * 2.4, 0, TAU);
    ctx.fill();
  });
}

/* ---------- 3. Bubbles ---------- */

interface Bubble {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  ph: number;
}

function initBubbles(_props?: Partial<EffectProps>): void {
  const A = storeFor<Bubble>("bubbles");
  A.length = 0;
  A.push(...mk(cnt(38), () => ({ x: R() * WIDTH, y: R() * HEIGHT, r: 8 + R() * 30, vx: 0, vy: 0, ph: R() * TAU })));
}

function drawBubbles(props: EffectProps): void {
  const { ctx, mx, my, mvx, mvy, sv } = props;
  const A = storeFor<Bubble>("bubbles");
  if (A.length === 0) initBubbles(props);
  A.forEach((p) => {
    rep(p, 150, 0.8, mx, my, mvx, mvy);
    p.vy -= sv * 0.03;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.x += p.vx + Math.sin(props.time * 0.8 + p.ph) * 0.4;
    p.y += p.vy - (0.5 + (9 / p.r) * 1.6);
    if (p.y < -p.r * 2) {
      p.y = HEIGHT + p.r;
      p.x = R() * WIDTH;
    }
    const g = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.1, p.x, p.y, p.r);
    g.addColorStop(0, hsl(190, 80, 85, 0.05));
    g.addColorStop(1, hsl(190, 80, 80, 0.2));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = hsl(190, 80, 82, 0.6);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = hsl(0, 0, 100, 0.7);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 0.72, 3.5, 4.4);
    ctx.stroke();
  });
}

function clickBubbles(props: EffectProps, x: number, y: number): void {
  storeFor<Bubble>("bubbles").forEach((p) => {
    if (Math.hypot(p.x - x, p.y - y) < p.r + 45) {
      spawnBurst(p.x, p.y, 10, 190);
      p.y = HEIGHT + p.r;
      p.x = R() * WIDTH;
    }
  });
}

/* ---------- 4. Confetti ---------- */

interface Confetto {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rs: number;
  f: number;
  w: number;
  h: number;
  ph: number;
}

function initConfetti(_props?: Partial<EffectProps>): void {
  const A = storeFor<Confetto>("confetti");
  A.length = 0;
  A.push(...mk(cnt(100), () => ({ x: R() * WIDTH, y: R() * HEIGHT, vx: 0, vy: 0, r: R() * 6, rs: (R() - 0.5) * 0.1, f: R() * 6, w: 5 + R() * 7, h: R() * 360, ph: R() * TAU })));
}

function drawConfetti(props: EffectProps): void {
  const { ctx, mx, my, mvx, mvy, sv, wind } = props;
  const A = storeFor<Confetto>("confetti");
  if (A.length === 0) initConfetti(props);
  A.forEach((p) => {
    rep(p, 170, 1.4, mx, my, mvx, mvy);
    p.vy -= sv * 0.03;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.x += p.vx + Math.sin(props.time + p.ph) * 0.5 + wind;
    p.y += p.vy + 0.9;
    p.r += p.rs;
    p.f += 0.07;
    wrap(p);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.r);
    ctx.scale(1, Math.cos(p.f));
    ctx.fillStyle = hsl(p.h, 85, 62, 0.95);
    ctx.fillRect(-p.w / 2, -p.w * 0.3, p.w, p.w * 0.6);
    ctx.restore();
  });
}

/* ---------- 5. Constellation ---------- */

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function initConstellation(_props?: Partial<EffectProps>): void {
  const A = storeFor<Star>("constellation");
  A.length = 0;
  A.push(...mk(cnt(85), () => ({ x: R() * WIDTH, y: R() * HEIGHT, vx: (R() - 0.5) * 0.4, vy: (R() - 0.5) * 0.4 })));
}

function drawConstellation(props: EffectProps): void {
  const { ctx, mx, my, sv } = props;
  const A = storeFor<Star>("constellation");
  if (A.length === 0) initConstellation(props);
  A.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy - sv * 0.12;
    const dx = p.x - mx;
    const dy = p.y - my;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < 140) {
      p.x += (dx / d) * 1.4;
      p.y += (dy / d) * 1.4;
    }
    wrap(p);
  });
  ctx.lineWidth = 1;
  for (let i = 0; i < A.length; i++) {
    const p = A[i];
    for (let j = i + 1; j < A.length; j++) {
      const q = A[j];
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < 125) {
        ctx.strokeStyle = hsl(200, 60, 82, (1 - d / 125) * 0.5);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
    const dm = Math.hypot(p.x - mx, p.y - my);
    if (dm < 200) {
      ctx.strokeStyle = hsl(320, 80, 78, (1 - dm / 200) * 0.7);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(mx, my);
      ctx.stroke();
    }
    ctx.fillStyle = hsl(200, 60, 88, 0.9);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.8, 0, TAU);
    ctx.fill();
  }
}

/* ---------- 6. Stardust ---------- */

interface StardustP {
  x: number;
  y: number;
  ph: number;
  z: number;
}

function initStardust(_props?: Partial<EffectProps>): void {
  const A = storeFor<StardustP>("stardust");
  A.length = 0;
  A.push(...mk(cnt(90), () => ({ x: R() * WIDTH, y: R() * HEIGHT, ph: R() * TAU, z: R() })));
}

function drawStardust(props: EffectProps): void {
  const { ctx, mx, my, mvx, mvy, sv } = props;
  const A = storeFor<StardustP>("stardust");
  if (A.length === 0) initStardust(props);
  const sp2 = Math.hypot(mvx, mvy);
  if (mx > 0 && sp2 > 2) {
    for (let k = 0; k < Math.min(6, sp2 / 4); k++) {
      bursts.current.push({ x: mx, y: my, vx: (R() - 0.5) * 1.6, vy: (R() - 0.5) * 1.6, life: 1, hue: 320 + R() * 70 });
    }
  }
  A.forEach((p) => {
    p.y -= sv * 0.05 * (0.3 + p.z);
    const al = 0.15 + 0.7 * Math.max(0, Math.sin(props.time * 1.6 + p.ph));
    const r = 0.7 + p.z * 1.4;
    ctx.fillStyle = hsl(45, 60, 92, al);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fill();
    if (p.z > 0.7 && al > 0.6) {
      ctx.strokeStyle = hsl(45, 60, 92, al * 0.6);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(p.x - r * 4, p.y);
      ctx.lineTo(p.x + r * 4, p.y);
      ctx.moveTo(p.x, p.y - r * 4);
      ctx.lineTo(p.x, p.y + r * 4);
      ctx.stroke();
    }
  });
}

/* ---------- 7. Embers ---------- */

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  ph: number;
  h: number;
}

function initEmbers(_props?: Partial<EffectProps>): void {
  const A = storeFor<Ember>("embers");
  A.length = 0;
  A.push(...mk(cnt(100), () => ({ x: R() * WIDTH, y: R() * HEIGHT, vx: 0, vy: 0, z: R(), ph: R() * TAU, h: 12 + R() * 30 })));
}

function drawEmbers(props: EffectProps): void {
  const { ctx, mx, my, mvx, mvy, sv, wind, dark } = props;
  const A = storeFor<Ember>("embers");
  if (A.length === 0) initEmbers(props);
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  A.forEach((p) => {
    rep(p, 150, 1, mx, my, mvx, mvy);
    p.vy -= sv * 0.03;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.x += p.vx + Math.sin(props.time * 1.5 + p.ph) * 0.5 + wind * 0.5;
    p.y += p.vy - (0.6 + p.z * 1.4);
    if (p.y < -20) {
      p.y = HEIGHT + 20;
      p.x = R() * WIDTH;
    }
    glow(ctx, p.x, p.y, 6 + p.z * 8, p.h, (0.3 + 0.7 * Math.abs(Math.sin(props.time * 5 + p.ph))) * Math.min(1, p.y / (HEIGHT * 0.4) + 0.2) * 0.8);
  });
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 8. Leaves ---------- */

interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  r: number;
  rs: number;
  f: number;
  ph: number;
  h: number;
}

function initLeaves(_props?: Partial<EffectProps>): void {
  const A = storeFor<Leaf>("leaves");
  A.length = 0;
  A.push(...mk(cnt(40), () => ({ x: R() * WIDTH, y: R() * HEIGHT, vx: 0, vy: 0, s: 10 + R() * 14, r: R() * 6, rs: (R() - 0.5) * 0.03, f: R() * 6, ph: R() * TAU, h: 12 + R() * 40 })));
}

function drawLeaves(props: EffectProps): void {
  const { ctx, mx, my, mvx, mvy, sv, wind } = props;
  const A = storeFor<Leaf>("leaves");
  if (A.length === 0) initLeaves(props);
  A.forEach((p) => {
    rep(p, 180, 1.3, mx, my, mvx, mvy);
    p.vy -= sv * 0.03;
    p.vx += Math.sin(props.time * 0.7 + p.ph) * 0.02 + wind * 0.02;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.x += p.vx + Math.sin(props.time + p.ph) * 0.9;
    p.y += p.vy + 0.8 + p.s * 0.02;
    p.r += Math.sin(props.time * 0.8 + p.ph) * 0.02 + p.rs;
    p.f += 0.03;
    wrap(p, 40);
    const s = p.s;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.r);
    ctx.scale(Math.cos(p.f) * 0.8 + 0.2, 1);
    ctx.fillStyle = hsl(p.h, 75, 52, 0.95);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.85, -s * 0.2, 0, s);
    ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, 0, -s);
    ctx.fill();
    ctx.strokeStyle = hsl(p.h, 70, 30, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(0, s * 1.3);
    ctx.stroke();
    ctx.restore();
  });
}

/* ---------- 9. Rain ---------- */

interface Drop {
  x: number;
  y: number;
  vy: number;
  gy: number;
  z: number;
}

interface Puddle {
  x: number;
  y: number;
  r: number;
  m: number;
}

function initRain(_props?: Partial<EffectProps>): void {
  storeFor<Puddle>("rain-puddles").length = 0;
  const A = storeFor<Drop>("rain");
  A.length = 0;
  A.push(...mk(cnt(140), () => ({ x: R() * WIDTH, y: R() * HEIGHT, vy: 12 + R() * 10, gy: HEIGHT * (0.55 + R() * 0.4), z: R() })));
}

function drawRain(props: EffectProps): void {
  const { ctx, mx, my, mvx, mvy, sv, wind } = props;
  const A = storeFor<Drop>("rain");
  if (A.length === 0) initRain(props);
  const RP = storeFor<Puddle>("rain-puddles");
  const sl = wind * 3 + (mx > 0 ? (mx / WIDTH - 0.5) * 4 : 0);
  A.forEach((p) => {
    p.x += sl;
    p.y += p.vy + Math.abs(sv) * 0.5;
    ctx.strokeStyle = hsl(205, 60, 86, 0.25 + 0.4 * p.z);
    ctx.lineWidth = 0.8 + p.z;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - sl * 2, p.y - 10 - p.z * 14);
    ctx.stroke();
    if (p.y >= p.gy) {
      RP.push({ x: p.x, y: p.gy, r: 1, m: 20 + R() * 24 });
      p.y = -20;
      p.x = R() * WIDTH;
      p.gy = HEIGHT * (0.55 + R() * 0.4);
    }
  });
  if (mx > 0 && Math.hypot(mvx, mvy) > 3 && R() < 0.25) RP.push({ x: mx, y: my, r: 1, m: 50 });
  for (let i = RP.length - 1; i >= 0; i--) {
    const o = RP[i];
    o.r += 1 + o.m * 0.01;
    if (o.r > o.m) {
      RP.splice(i, 1);
      continue;
    }
    ctx.strokeStyle = hsl(205, 70, 86, (1 - o.r / o.m) * 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, o.r, o.r * 0.35, 0, 0, TAU);
    ctx.stroke();
  }
}

function clickRain(_props: EffectProps, x: number, y: number): void {
  storeFor<Puddle>("rain-puddles").push({ x, y, r: 1, m: 150 });
}

/* ---------- 10. Flow ---------- */

interface FlowP {
  x: number;
  y: number;
  h: number;
}

function initFlow(_props?: Partial<EffectProps>): void {
  const A = storeFor<FlowP>("flow");
  A.length = 0;
  A.push(...mk(cnt(520), () => ({ x: R() * WIDTH, y: R() * HEIGHT, h: R() })));
}

function drawFlow(props: EffectProps): void {
  const { ctx, mx, my, sv, sp } = props;
  const A = storeFor<FlowP>("flow");
  if (A.length === 0) initFlow(props);
  A.forEach((p) => {
    const an = Math.sin(p.x * 0.004 + props.time * 0.2) * 3 + Math.cos(p.y * 0.005 - props.time * 0.15) * 3 + sp * 6;
    let vx = Math.cos(an) * 1.4;
    let vy = Math.sin(an) * 1.4 - sv * 0.1;
    const dx = p.x - mx;
    const dy = p.y - my;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < 220) {
      const f = 1 - d / 220;
      vx += (-dy / d) * f * 3 + (dx / d) * f;
      vy += (dx / d) * f * 3 + (dy / d) * f;
    }
    const px = p.x;
    const py = p.y;
    p.x += vx;
    p.y += vy;
    if (p.x < 0 || p.x > WIDTH || p.y < 0 || p.y > HEIGHT) {
      p.x = R() * WIDTH;
      p.y = R() * HEIGHT;
      return; // reference parity: respawned particles must not stroke a teleport line
    }
    ctx.strokeStyle = hsl(p.h * 140 + 170, 80, 66, 0.75);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
}

/* ---------- 11. Spooky (Halloween lantern, ghosts, red eye-pairs, lightning, fog) ---------- */

interface Ghost {
  x: number;
  y: number;
  vy: number;
  vx: number;
  w: number;
  bobPh: number;
  life: number;
  lifeMax: number;
}

interface EyePair {
  x: number;
  y: number;
  gap: number;
  life: number;
  lifeMax: number;
}

interface FogPatch {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  ph: number;
}

interface SpookyState {
  eyes: EyePair[];
  fog: FogPatch[];
  nextFlash: number;
  flash: number;
  flashSeq: number[];
  flashIdx: number;
}

function spookyStore(): SpookyState {
  const existing = store.get("spooky-state");
  if (existing) return existing as unknown as SpookyState;
  const fresh: SpookyState = {
    eyes: [],
    fog: [],
    nextFlash: 240,
    flash: 0,
    flashSeq: [],
    flashIdx: 0,
  };
  store.set("spooky-state", fresh as unknown as unknown[]);
  return fresh;
}

function initSpooky(_props?: Partial<EffectProps>): void {
  store.delete("spooky-state");
  store.delete("spooky-ghosts");
  const props = _props as EffectProps | undefined;
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const state = {
    ghosts: [] as Ghost[],
    eyes: [] as EyePair[],
    fog: mk(cnt(6), () => ({
      x: R() * W,
      y: H * (0.62 + R() * 0.35),
      w: W * (0.18 + R() * 0.25),
      h: 40 + R() * 80,
      vx: (R() - 0.5) * 0.35,
      ph: R() * TAU,
    })) as FogPatch[],
    nextFlash: timeUntilFirst(240),
    flash: 0,
    flashSeq: [0.5, 0, 0.75, 0, 0.28, 0] as number[],
    flashIdx: 0,
  };
  store.set("spooky-state", state as unknown as unknown[]);
  const ghosts = storeFor<Ghost>("spooky-ghosts");
  ghosts.length = 0;
  ghosts.push(
    ...mk(cnt(5), () => ({
      x: R() * W,
      y: H * (0.08 + R() * 0.62),
      vy: -(0.1 + R() * 0.15),
      vx: (R() - 0.5) * 0.3,
      w: 22 + R() * 40,
      bobPh: R() * TAU,
      life: R() * 600,
      lifeMax: 900 + R() * 900,
    })),
  );
}

function timeUntilFirst(frames: number): number {
  // First strike early, like the reference's 4s lead-in scaled to frames.
  return 60 + R() * (frames - 60);
}

function drawGhostShape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number): void {
  // Classic sheet-ghost: rounded head, wavy hem — same silhouette as the reference symbol.
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(x, y - h, x, y + h * 0.4);
  g.addColorStop(0, rgba(246, 241, 255, 0.95));
  g.addColorStop(1, rgba(184, 166, 240, 0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.4, y + h * 0.35);
  ctx.lineTo(x - w * 0.4, y - h * 0.15);
  ctx.arc(x, y - h * 0.15, w * 0.4, Math.PI, 0, false);
  const bob = 4;
  const waves = 4;
  for (let i = waves; i >= 0; i--) {
    const wx = x - w * 0.4 + (i / waves) * w * 0.8;
    ctx.lineTo(wx, y + h * 0.35 + (i % 2 === 0 ? bob : -bob) * 0.4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = rgba(190, 170, 255, 0.75);
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
  // Eyes + mouth
  ctx.fillStyle = rgba(19, 12, 25, 0.95);
  ctx.beginPath();
  ctx.ellipse(x - w * 0.14, y - h * 0.2, w * 0.04, h * 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w * 0.14, y - h * 0.2, w * 0.04, h * 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.02, w * 0.05, h * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

function drawSpooky(props: EffectProps): void {
  const { ctx, width, height, mx, my, dark, time } = props;
  const A = storeFor<Ghost>("spooky-ghosts");
  if (A.length === 0) initSpooky(props as Partial<EffectProps>);
  const st = spookyStore();

  // Fog patches near the bottom (reference fog layer).
  st.fog.forEach((f) => {
    f.x += f.vx;
    if (f.x < -f.w * 0.5) f.x = width + f.w * 0.5;
    if (f.x > width + f.w * 0.5) f.x = -f.w * 0.5;
    const flick = 0.7 + 0.3 * Math.sin(time * 0.4 + f.ph);
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.w * 0.6);
    g.addColorStop(0, rgba(169, 139, 230, 0.16 * flick));
    g.addColorStop(1, rgba(169, 139, 230, 0));
    ctx.fillStyle = g;
    ctx.fillRect(f.x - f.w * 0.6, f.y - f.h * 0.6, f.w * 1.2, f.h * 1.2);
  });

  // Lantern darkening: light hole follows cursor (reference #dark layer).
  const lx = mx > 0 ? mx : width * 0.5;
  const ly = my > 0 ? my : height * 0.35;
  ctx.fillStyle = rgba(4, 1, 8, dark ? 0.72 : 0.6);
  ctx.fillRect(0, 0, width, height);
  const lantern = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.min(width, height) * 0.22);
  lantern.addColorStop(0, rgba(255, 210, 150, 0.16));
  lantern.addColorStop(0.55, rgba(255, 190, 120, 0.05));
  lantern.addColorStop(1, rgba(0, 0, 0, 0));
  ctx.fillStyle = lantern;
  ctx.fillRect(0, 0, width, height);
  // Hole: punch through darkness with destination-out around the lantern.
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  const hole = ctx.createRadialGradient(lx, ly, 0, lx, ly, 210);
  hole.addColorStop(0, rgba(0, 0, 0, 0.95));
  hole.addColorStop(0.55, rgba(0, 0, 0, 0.55));
  hole.addColorStop(1, rgba(0, 0, 0, 0));
  ctx.fillStyle = hole;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Ghosts drifting upward with bob; respawn at bottom on expiry.
  A.forEach((g) => {
    g.life += 1;
    if (g.y < -g.w * 2 || g.life > g.lifeMax) {
      g.y = height + 60;
      g.x = R() * width;
      g.life = 0;
      g.vy = -(0.1 + R() * 0.15);
    }
    g.x += Math.sin(time * 0.3 + g.bobPh) * 0.4 + g.vx * 0.1;
    g.y += g.vy;
    const bob = Math.sin(time * 2 + g.bobPh) * 5;
    const fade = Math.sin((g.life / g.lifeMax) * Math.PI) * 0.5;
    drawGhostShape(ctx, g.x, g.y + bob, g.w, g.w * 1.25, Math.max(0.06, fade));
  });

  // Red eye-pairs that blink on then off (reference .eyes blink keyframes).
  const eyes = st.eyes;
  if (R() < 0.006 && eyes.length < 3) {
    eyes.push({ x: width * (0.08 + R() * 0.8), y: height * (0.12 + R() * 0.7), gap: 12 + R() * 12, life: 0, lifeMax: 260 });
  }
  for (let i = eyes.length - 1; i >= 0; i--) {
    const e = eyes[i]!;
    e.life += 1;
    if (e.life > e.lifeMax) {
      eyes.splice(i, 1);
      continue;
    }
    const prog = e.life / e.lifeMax;
    // Blink envelope: fade in, hold, quick squash-blink, fade out.
    let al = prog < 0.14 ? prog / 0.14 : prog > 0.85 ? (1 - prog) / 0.15 : 1;
    let sy = 1;
    if (prog > 0.42 && prog < 0.46) sy = 0.12; // blink squash
    al *= 0.9;
    [-1, 1].forEach((side) => {
      const ex = e.x + side * e.gap * 0.5;
      const grad = ctx.createRadialGradient(ex, e.y, 0, ex, e.y, 14);
      grad.addColorStop(0, rgba(255, 255, 255, 0.9 * al));
      grad.addColorStop(0.4, rgba(255, 51, 71, 0.8 * al));
      grad.addColorStop(1, rgba(122, 0, 16, 0));
      ctx.fillStyle = grad;
      ctx.save();
      ctx.translate(ex, e.y);
      ctx.scale(1.6, 0.9 * sy);
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
  }

  // Sudden lightning flash + optional ghost apparition (reference strike()).
  st.nextFlash -= 1;
  if (st.nextFlash <= 0 && st.flashSeq.length === 0) {
    st.flashSeq = [0.5, 0, 0.75, 0, 0.28, 0];
    st.flashIdx = 0;
    st.nextFlash = 540 + R() * 900; // ~9-24s between strikes
    if (R() < 0.5) {
      A.push({
        x: width * (0.05 + R() * 0.7),
        y: height * (0.25 + R() * 0.5),
        vy: -0.2,
        vx: 0,
        w: 60 + R() * 60,
        bobPh: 0,
        life: 0,
        lifeMax: 26, // apparition lasts ~0.43s like the reference
      });
    }
  }
  if (st.flashSeq.length > 0) {
    st.flash = st.flashSeq[st.flashIdx] ?? 0;
    st.flashIdx += 1;
    if (st.flashIdx >= st.flashSeq.length) st.flashSeq = [];
    if (st.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = rgba(214, 204, 255, st.flash);
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    ctx.fillStyle = rgba(0, 0, 0, 0);
  } else {
    st.flash = 0;
  }
}

function clickSpooky(props: EffectProps, x: number, y: number): void {
  // Clicking launches a flash + apparition at the click point.
  const st = spookyStore();
  st.flashSeq = [0.5, 0, 0.75, 0, 0.28, 0];
  st.flashIdx = 0;
  const A = storeFor<Ghost>("spooky-ghosts");
  A.push({ x, y, vy: -0.3, vx: 0, w: 60, bobPh: 0, life: 0, lifeMax: 26 });
  spawnBurst(x, y, 8, 280);
}

/* ---------- 12. Neon (glowing neon strokes flickering on and off) ---------- */

interface NeonShape {
  kind: "circuit";
  x: number;
  y: number;
  len: number;
  dir: number;
  turnAfter: number;
  hue: number;
  phase: number;
  flickRate: number;
}

function initNeon(_props?: Partial<EffectProps>): void {
  const A = storeFor<NeonShape>("neon");
  A.length = 0;
  A.push(...mk(cnt(60), () => ({
    kind: "circuit" as const,
    x: R() * WIDTH,
    y: R() * HEIGHT,
    len: 40 + R() * 130,
    dir: Math.floor(R() * 4) * (Math.PI / 2),
    turnAfter: 30 + R() * 120,
    hue: [315, 190, 275, 160][Math.floor(R() * 4)]!,
    phase: R() * TAU,
    flickRate: 0.5 + R() * 1.5,
  })));
}

function drawNeon(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, dark } = props;
  const A = storeFor<NeonShape>("neon");
  if (A.length === 0) initNeon(props as Partial<EffectProps>);
  ctx.lineCap = "round";
  A.forEach((s) => {
    // Flicker envelope: mostly on, occasional off blink.
    const blinkGate = Math.sin(time * s.flickRate + s.phase * 7) > -0.85;
    // Cursor proximity boosts glow (interaction layer parity).
    const dm = Math.hypot(s.x - mx, s.y - my);
    const boost = dm < 200 ? 0.5 * (1 - dm / 200) : 0;
    let alpha = (0.35 + boost) * (blinkGate ? 1 : 0.15);
    if (!dark) alpha *= 0.55;
    const px = Math.cos(s.dir);
    const py = Math.sin(s.dir);
    const ex = s.x + px * s.len;
    const ey = s.y + py * s.len;
    ctx.save();
    ctx.shadowColor = hsl(s.hue, 100, 60, alpha);
    ctx.shadowBlur = (18 + boost * 22) * (blinkGate ? 1 : 3);
    ctx.strokeStyle = hsl(s.hue, 100, 72, alpha);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = hsl(s.hue, 100, 92, alpha * 0.9); // hot core
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    // drift + turn
    s.x += px * 0.25;
    s.y += py * 0.25;
    const travel = Math.hypot(s.x - (s.x - px), s.y - (s.y - py));
    void travel;
    if (R() < 0.02) s.dir += Math.PI / 2 * (R() < 0.5 ? 1 : -1);
    if (s.x < -s.len || s.x > width + s.len || s.y < -s.len || s.y > height + s.len) {
      s.x = R() * width;
      s.y = R() * height;
      s.turnAfter = 30 + R() * 120;
    }
    s.turnAfter -= 1;
    if (s.turnAfter <= 0) {
      s.turnAfter = 60 + R() * 150;
      s.dir += Math.PI / 2 * (R() < 0.5 ? 1 : -1);
    }
  });
}

/* ---------- 13. Wind (flowing wind streaks with gust bursts) ---------- */

interface WindStreak {
  x: number;
  y: number;
  len: number;
  z: number;
  vx: number;
  vy: number;
  ph: number;
}

function initWind(_props?: Partial<EffectProps>): void {
  const A = storeFor<WindStreak>("wind");
  A.length = 0;
  A.push(...mk(cnt(120), () => ({
    x: R() * WIDTH,
    y: R() * HEIGHT,
    len: 10 + R() * 60,
    z: R(),
    vx: 1 + R() * 2.5,
    vy: 0,
    ph: R() * TAU,
  })));
}

function drawWind(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, mvx, mvy, sv, wind, dark } = props;
  const A = storeFor<WindStreak>("wind");
  if (A.length === 0) initWind(props as Partial<EffectProps>);
  // Global gusts follow the sine-driven wind + a slow breathing term.
  const gust = 1 + Math.sin(time * 0.5) * 0.5;
  A.forEach((p) => {
    const dx = p.x - mx;
    const dy = p.y - my;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 180) {
      const f = 1 - d / 180;
      p.vx += (-dy / d) * f * 1.6 + mvx * f * 0.08;
      p.vy += (dx / d) * f * 1.6 + mvy * f * 0.08;
    }
    p.vy -= sv * 0.03;
    p.vx *= 0.94;
    p.vy *= 0.94;
    const speed = p.vx + (0.9 + p.z * 1.4) * gust + wind * 2;
    const px = p.x;
    const py = p.y;
    p.x += speed;
    p.y += p.vy + Math.sin(time * 1.4 + p.ph) * 0.5;
    if (p.x > width + 80) {
      p.x = -80;
      p.y = R() * height;
    }
    if (p.y < -40 || p.y > height + 40) p.y = R() * height;
    const alpha = (0.12 + p.z * 0.3) * gust * 0.9;
    ctx.strokeStyle = dark
      ? hslaSafe(210, 40, 88, alpha)
      : hslaSafe(210, 45, 40, alpha * 0.5);
    ctx.lineWidth = 0.7 + p.z * 1.3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - Math.min(p.len, Math.abs(speed) * 6), py + Math.sin(time * 1.4 + p.ph) * 2);
    ctx.stroke();
  });
}

function hslaSafe(h: number, s: number, l: number, a: number): string {
  return `hsla(${h},${s}%,${l}%,${a})`;
}

/* ---------- 14. Sunlight (warm golden rays + floating dust motes) ---------- */

interface SunMote {
  x: number;
  y: number;
  z: number;
  ph: number;
  drift: number;
}

function initSunlight(_props?: Partial<EffectProps>): void {
  const A = storeFor<SunMote>("sunlight");
  A.length = 0;
  A.push(...mk(cnt(110), () => ({
    x: R() * WIDTH,
    y: R() * HEIGHT,
    z: R(),
    ph: R() * TAU,
    drift: 0.1 + R() * 0.4,
  })));
}

function drawSunlight(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, dark, sp } = props;
  const A = storeFor<SunMote>("sunlight");
  if (A.length === 0) initSunlight(props as Partial<EffectProps>);
  // Light origin: sun at 78% -8% like a hero glow; scroll slides it.
  const sx = width * 0.78;
  const sy = height * (-0.08) + sp * height * 0.2;
  // Big warm haze.
  const haze = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(width, height) * 0.75);
  haze.addColorStop(0, rgba(255, 214, 140, dark ? 0.28 : 0.5));
  haze.addColorStop(0.4, rgba(255, 190, 110, dark ? 0.12 : 0.22));
  haze.addColorStop(1, rgba(255, 190, 110, 0));
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);
  // Rotating light rays (god-rays feel).
  ctx.save();
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  ctx.translate(sx, sy);
  ctx.rotate(time * 0.02);
  for (let i = 0; i < 9; i++) {
    const an = (i / 9) * TAU;
    const rayLen = Math.max(width, height) * 1.2;
    const g = ctx.createLinearGradient(0, 0, Math.cos(an) * rayLen, Math.sin(an) * rayLen);
    g.addColorStop(0, rgba(255, 220, 150, 0.14));
    g.addColorStop(1, rgba(255, 220, 150, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(an - 0.045) * rayLen, Math.sin(an - 0.045) * rayLen);
    ctx.lineTo(Math.cos(an + 0.045) * rayLen, Math.sin(an + 0.045) * rayLen);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Dust motes drifting down-right, twinkling, cursor-reactive.
  A.forEach((m) => {
    const dx = m.x - mx;
    const dy = m.y - my;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 160) {
      const f = 1 - d / 160;
      m.x += (dx / d) * f * 0.8;
      m.y += (dy / d) * f * 0.8;
    }
    m.y += m.drift + Math.sin(time * 0.8 + m.ph) * 0.2;
    m.x += 0.15 + m.z * 0.3;
    if (m.y > height + 20) {
      m.y = -20;
      m.x = R() * width;
    }
    if (m.x > width + 20) m.x = -20;
    const tw = 0.4 + 0.6 * Math.max(0, Math.sin(time * 1.3 + m.ph));
    const r = 0.8 + m.z * 2;
    ctx.fillStyle = rgba(255, 236, 180, (dark ? 0.5 : 0.75) * tw * (0.35 + m.z));
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, TAU);
    ctx.fill();
  });
}

/* ---------- registration ---------- */

export const effects: EffectDefinition[] = [
  { id: "fireflies", name: "Fireflies", hue: 60, draw: drawFireflies, reset: initFireflies },
  { id: "snow", name: "Snow", hue: 205, draw: drawSnow, reset: initSnow },
  { id: "bubbles", name: "Bubbles", hue: 190, draw: drawBubbles, click: clickBubbles, reset: initBubbles },
  { id: "confetti", name: "Confetti", hue: 330, draw: drawConfetti, reset: initConfetti },
  { id: "constellation", name: "Constellation", hue: 200, draw: drawConstellation, reset: initConstellation },
  { id: "stardust", name: "Stardust", hue: 320, draw: drawStardust, reset: initStardust },
  { id: "embers", name: "Embers", hue: 25, draw: drawEmbers, reset: initEmbers },
  { id: "leaves", name: "Leaves", hue: 30, draw: drawLeaves, reset: initLeaves },
  { id: "rain", name: "Rain", hue: 205, draw: drawRain, click: clickRain, reset: initRain },
  { id: "flow", name: "Flow", hue: 180, draw: drawFlow, tint: true, reset: initFlow },
  { id: "spooky", name: "Spooky", hue: 280, draw: drawSpooky, click: clickSpooky, reset: initSpooky },
  { id: "neon", name: "Neon", hue: 315, draw: drawNeon, reset: initNeon },
  { id: "wind", name: "Wind", hue: 210, draw: drawWind, reset: initWind },
  { id: "sunlight", name: "Sunlight", hue: 45, draw: drawSunlight, reset: initSunlight },
];

export function getEffect(id: string): EffectDefinition {
  return effects.find((e) => e.id === id) ?? effects[0]!;
}
