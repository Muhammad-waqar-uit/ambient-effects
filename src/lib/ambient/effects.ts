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
  // Auxiliary stores are namespaced `<id>::<name>` so this cannot collide with
  // effect ids that share a prefix (e.g. "confetti" vs "confetti-cannon").
  const prefix = `${id}::`;
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
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

/* ---------- shared helpers for the extended effect set ---------- */

/**
 * Named object state for effects that need timers/queues in addition to
 * particle arrays. Keys are namespaced with `::` so `resetEffect` can clear
 * them without colliding with effect ids that share a prefix.
 */
function stateFor<T>(id: string, make: () => T): T {
  const key = `${id}::state`;
  const existing = store.get(key);
  if (existing) return existing as unknown as T;
  const fresh = make();
  store.set(key, fresh as unknown as unknown[]);
  return fresh;
}

const PARTY_HUES = [0, 35, 52, 120, 175, 205, 265, 300, 330];
function partyHue(): number {
  return PARTY_HUES[Math.floor(R() * PARTY_HUES.length)] as number;
}

/* ---------- 15. Ambient (slow, soft light blobs) ---------- */

interface AmbientOrb {
  x: number;
  y: number;
  r: number;
  hue: number;
  ph: number;
  sp: number;
}

function initAmbient(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const base = Math.min(W || 1200, H || 800);
  const A = storeFor<AmbientOrb>("ambient");
  A.length = 0;
  A.push(
    ...mk(cnt(8), () => ({
      x: R() * W,
      y: R() * H,
      r: base * (0.16 + R() * 0.26),
      hue: 180 + R() * 140,
      ph: R() * TAU,
      sp: 0.04 + R() * 0.07,
    })),
  );
}

function drawAmbient(props: EffectProps): void {
  const { ctx, mx, my, dark, reducedMotion } = props;
  const A = storeFor<AmbientOrb>("ambient");
  if (A.length === 0) initAmbient(props);
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  A.forEach((o) => {
    o.ph += o.sp * (reducedMotion ? 0.35 : 1);
    o.x += Math.cos(o.ph) * 0.22 + props.wind * 0.12;
    o.y += Math.sin(o.ph * 0.8) * 0.16;
    const dx = o.x - mx;
    const dy = o.y - my;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < o.r * 0.9) {
      const f = 1 - d / (o.r * 0.9);
      o.x += (dx / d) * f * 0.6;
      o.y += (dy / d) * f * 0.6;
    }
    wrap(o, o.r);
    const rr = o.r * (0.88 + 0.12 * Math.sin(o.ph * 1.7));
    const a = dark ? 0.17 : 0.12;
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, rr);
    g.addColorStop(0, hsl(o.hue, 85, 66, a));
    g.addColorStop(0.55, hsl(o.hue, 85, 58, a * 0.45));
    g.addColorStop(1, hsl(o.hue, 85, 52, 0));
    ctx.fillStyle = g;
    ctx.fillRect(o.x - rr, o.y - rr, rr * 2, rr * 2);
  });
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 16. Big Circles (huge drifting rings) ---------- */

interface BigCircle {
  x: number;
  y: number;
  r: number;
  rot: number;
  vr: number;
  vx: number;
  vy: number;
  hue: number;
}

function initBigCircles(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const base = Math.min(W || 1200, H || 800);
  const A = storeFor<BigCircle>("big-circles");
  A.length = 0;
  A.push(
    ...mk(cnt(6), () => ({
      x: R() * W,
      y: R() * H,
      r: base * (0.12 + R() * 0.22),
      rot: R() * TAU,
      vr: (R() - 0.5) * 0.006,
      vx: (R() - 0.5) * 0.5,
      vy: (R() - 0.5) * 0.4,
      hue: 195 + R() * 95,
    })),
  );
}

function drawBigCircles(props: EffectProps): void {
  const { ctx, mx, my, mvx, mvy, dark, reducedMotion } = props;
  const A = storeFor<BigCircle>("big-circles");
  if (A.length === 0) initBigCircles(props);
  A.forEach((c) => {
    c.rot += c.vr * (reducedMotion ? 0.3 : 1);
    c.x += c.vx + mvx * 0.004;
    c.y += c.vy + mvy * 0.004;
    const dx = c.x - mx;
    const dy = c.y - my;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < c.r) {
      const f = 1 - d / c.r;
      c.x += (dx / d) * f * 1.6;
      c.y += (dy / d) * f * 1.6;
    }
    wrap(c, c.r);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.strokeStyle = hsl(c.hue, 70, dark ? 70 : 40, dark ? 0.5 : 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, c.r * 0.74, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hsl(c.hue + 25, 80, dark ? 76 : 45, 0.75);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, c.r * 0.9, c.rot * 2, c.rot * 2 + 1.1);
    ctx.stroke();
    ctx.fillStyle = hsl(c.hue, 80, dark ? 82 : 45, 0.55);
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  });
}

/* ---------- 17. Confetti Cannon (bursts fired up from the bottom) ---------- */

interface CannonPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  hue: number;
}

interface CannonState {
  pieces: CannonPiece[];
  next: number;
}

function cannonState(): CannonState {
  return stateFor<CannonState>("confetti-cannon", () => ({ pieces: [], next: 30 }));
}

function fireCannon(s: CannonState, x: number, y: number, n: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (R() - 0.5) * spread;
    const speed = 8 + R() * 7;
    s.pieces.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      rot: R() * TAU,
      vr: (R() - 0.5) * 0.5,
      w: 4 + R() * 7,
      h: 8 + R() * 9,
      hue: partyHue(),
    });
  }
  if (s.pieces.length > 1400) s.pieces.splice(0, s.pieces.length - 1400);
}

function initConfettiCannon(): void {
  const s = cannonState();
  s.pieces.length = 0;
  s.next = 30;
}

function clickConfettiCannon(props: EffectProps, x: number, y: number): void {
  fireCannon(cannonState(), x, y, 60, 2.7);
  void props;
}

function drawConfettiCannon(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, dark } = props;
  const s = cannonState();
  s.next -= 1;
  if (s.next <= 0) {
    fireCannon(s, width / 2, height + 8, 48, 1.1);
    s.next = 80 + R() * 50;
  }
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  for (let i = s.pieces.length - 1; i >= 0; i--) {
    const p = s.pieces[i]!;
    p.vy += 0.19;
    p.vx *= 0.992;
    p.vx += Math.sin(time * 2.4 + p.rot) * 0.05;
    p.rot += p.vr;
    p.x += p.vx;
    p.y += p.vy;
    if (p.y > height + 60 || p.x < -80 || p.x > width + 80) {
      s.pieces.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = hsl(p.hue, 88, dark ? 62 : 46, 0.95);
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
  void mx;
  void my;
}

/* ---------- 18. Confetti Explosions (radial confetti bursts) ---------- */

interface ExplosionPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  hue: number;
  life: number;
}

interface ExplosionState {
  pieces: ExplosionPiece[];
  next: number;
}

function explosionState(): ExplosionState {
  return stateFor<ExplosionState>("confetti-explosions", () => ({ pieces: [], next: 40 }));
}

function boom(s: ExplosionState, x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = R() * TAU;
    const speed = 2 + R() * 7;
    s.pieces.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      rot: R() * TAU,
      vr: (R() - 0.5) * 0.6,
      w: 4 + R() * 6,
      h: 7 + R() * 8,
      hue: partyHue(),
      life: 1,
    });
  }
  if (s.pieces.length > 1600) s.pieces.splice(0, s.pieces.length - 1600);
}

function initConfettiExplosions(): void {
  const s = explosionState();
  s.pieces.length = 0;
  s.next = 30;
}

function clickConfettiExplosions(props: EffectProps, x: number, y: number): void {
  boom(explosionState(), x, y, 70);
  void props;
}

function drawConfettiExplosions(props: EffectProps): void {
  const { ctx, width, height, dark } = props;
  const s = explosionState();
  s.next -= 1;
  if (s.next <= 0) {
    boom(s, width * (0.15 + R() * 0.7), height * (0.18 + R() * 0.45), 55);
    s.next = 55 + R() * 55;
  }
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  for (let i = s.pieces.length - 1; i >= 0; i--) {
    const p = s.pieces[i]!;
    p.vy += 0.13;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.rot += p.vr;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.012;
    if (p.life <= 0) {
      s.pieces.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(1, p.life * 1.6);
    ctx.fillStyle = hsl(p.hue, 90, dark ? 64 : 48, 0.95);
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 19. Confetti Falling (steady full-screen drift) ---------- */

interface FallPiece {
  x: number;
  y: number;
  vy: number;
  sway: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  hue: number;
  z: number;
}

function initConfettiFalling(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<FallPiece>("confetti-falling");
  A.length = 0;
  A.push(
    ...mk(cnt(110), () => ({
      x: R() * W,
      y: R() * H,
      vy: 1.4 + R() * 3,
      sway: 0.4 + R() * 1.4,
      rot: R() * TAU,
      vr: (R() - 0.5) * 0.12,
      w: 4 + R() * 6,
      h: 7 + R() * 9,
      hue: partyHue(),
      z: 0.4 + R() * 0.6,
    })),
  );
}

function drawConfettiFalling(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, mvx, mvy, wind, dark, reducedMotion } = props;
  const A = storeFor<FallPiece>("confetti-falling");
  if (A.length === 0) initConfettiFalling(props);
  for (const p of A) {
    p.y += p.vy * p.z + Math.abs(props.sv) * 0.15;
    p.x += Math.sin(time * 1.5 + p.rot) * p.sway + wind * 1.1;
    p.rot += p.vr * (reducedMotion ? 0.3 : 1);
    const dx = p.x - mx;
    const dy = p.y - my;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < 150) {
      const f = 1 - d / 150;
      p.x += (dx / d) * f * 2.2 + mvx * f * 0.04;
      p.y += (dy / d) * f * 2.2 + mvy * f * 0.04;
    }
    if (p.y > height + 24) {
      p.y = -24;
      p.x = R() * width;
    }
    if (p.x < -30) p.x = width + 30;
    if (p.x > width + 30) p.x = -30;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = 0.55 + p.z * 0.4;
    ctx.fillStyle = hsl(p.hue, 85, dark ? 64 : 46, 0.95);
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/* ---------- 20. Confetti Parade (streaming horizontal ribbons) ---------- */

interface ParadePiece {
  x: number;
  y: number;
  vx: number;
  ph: number;
  hue: number;
  len: number;
  th: number;
}

function initConfettiParade(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<ParadePiece>("confetti-parade");
  A.length = 0;
  A.push(
    ...mk(cnt(16), () => ({
      x: R() * W,
      y: H * (0.12 + R() * 0.76),
      vx: (R() < 0.5 ? -1 : 1) * (1.4 + R() * 2.6),
      ph: R() * TAU,
      hue: partyHue(),
      len: 40 + R() * 120,
      th: 2 + R() * 3,
    })),
  );
}

function drawConfettiParade(props: EffectProps): void {
  const { ctx, width, time, mx, my, mvx, mvy, dark, reducedMotion } = props;
  const A = storeFor<ParadePiece>("confetti-parade");
  if (A.length === 0) initConfettiParade(props);
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  for (const p of A) {
    p.ph += reducedMotion ? 0.01 : 0.03;
    p.x += p.vx + Math.sin(p.ph) * 0.5;
    p.y += Math.sin(time * 0.9 + p.ph) * 0.4;
    const dx = p.x - mx;
    const dy = p.y - my;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < 170) {
      const f = 1 - d / 170;
      p.y += (dy / d) * f * 2.2 + mvy * f * 0.03;
      p.x += (dx / d) * f * 0.8 + mvx * f * 0.02;
    }
    if (p.vx > 0 && p.x - p.len / 2 > width + 40) p.x = -p.len / 2 - 40;
    if (p.vx < 0 && p.x + p.len / 2 < -40) p.x = width + p.len / 2 + 40;

    ctx.lineCap = "round";
    const span = p.len;
    // Three parallel ribbons (phase-shifted, not position-shifted, so they
    // stream instead of crossing into lens shapes).
    for (let s = 0; s < 3; s++) {
      ctx.strokeStyle = hsl(p.hue + s * 14, 88, dark ? 66 : 46, 0.75);
      ctx.lineWidth = p.th;
      ctx.beginPath();
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = p.x - span / 2 + span * t;
        const y = p.y + Math.sin(p.ph + t * 5.2 + s * 2.2) * 8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Confetti pieces riding the middle ribbon.
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      const x = p.x - span / 2 + span * t;
      const y = p.y + Math.sin(p.ph + t * 5.2 + 2.2) * 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.ph * 1.4 + i);
      ctx.fillStyle = hsl(p.hue + i * 9, 90, dark ? 68 : 46, 0.9);
      ctx.fillRect(-2.4, -4, 4.8, 8);
      ctx.restore();
    }
  }
  ctx.lineCap = "butt";
  ctx.globalCompositeOperation = "source-over";
}
/* ---------- 21. Fire (rising flame wall) ---------- */

interface Flame {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  hue: number;
}

function respawnFlame(p: Flame, width: number, height: number): void {
  p.x = R() * width;
  p.y = height + 6 + R() * 30;
  p.vx = (R() - 0.5) * 0.9;
  p.vy = -(1.2 + R() * 2.9);
  p.r = 5 + R() * 15;
  p.life = 0.6 + R() * 0.5;
  p.hue = 6 + R() * 28;
}

function initFire(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<Flame>("fire");
  A.length = 0;
  A.push(
    ...mk(cnt(110), (i) => {
      const f: Flame = { x: 0, y: 0, vx: 0, vy: 0, r: 0, life: 0, hue: 0 };
      respawnFlame(f, W, H);
      f.y = H - (i / Math.max(1, cnt(110))) * H;
      return f;
    }),
  );
}

function drawFire(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, mvx, mvy, dark, reducedMotion } = props;
  const A = storeFor<Flame>("fire");
  if (A.length === 0) initFire(props);
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  A.forEach((p, i) => {
    p.life -= 0.015;
    p.x += p.vx + Math.sin(time * 2.2 + p.y * 0.04) * 0.45;
    p.y += p.vy;
    p.vy -= 0.02;
    p.r *= 0.995;
    rep(p, 120, 0.06, mx, my, mvx, mvy);
    if (p.life <= 0 || p.y < -60) respawnFlame(p, width, height);
    // Hotter and tighter near birth, cooling as it rises.
    const age = 1 - Math.max(0, p.life);
    const a = Math.max(0, p.life) * (reducedMotion ? 0.42 : 0.55);
    const rr = Math.max(1, p.r * (0.45 + p.life * 0.75));
    const heat = p.hue + age * 16;
    if (i % 9 === 0) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 3);
      g.addColorStop(0, hsl(heat + 12, 100, 60, a * 0.34));
      g.addColorStop(1, hsl(heat, 100, 48, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr * 3, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = hsl(heat, 100, 52, a * 0.6);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rr * 0.72, rr * 1.55, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = hsl(heat + 30, 100, 78, a * 0.5);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + rr * 0.35, rr * 0.4, rr * 0.7, 0, 0, TAU);
    ctx.fill();
  });
  // Ember glow along the floor so the flame has a base.
  const floor = ctx.createLinearGradient(0, height - 100, 0, height);
  floor.addColorStop(0, hsl(20, 100, 50, 0));
  floor.addColorStop(1, hsl(24, 100, 52, dark ? 0.2 : 0.12));
  ctx.fillStyle = floor;
  ctx.fillRect(0, height - 100, width, 100);
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 22. Fireworks (rockets + spark shells) ---------- */

interface Rocket {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  hue: number;
  targetY: number;
}

interface FwSpark {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  hue: number;
  life: number;
  decay: number;
}

interface FireworksState {
  rockets: Rocket[];
  sparks: FwSpark[];
  next: number;
}

function fireworksState(): FireworksState {
  return stateFor<FireworksState>("fireworks", () => ({ rockets: [], sparks: [], next: 30 }));
}

function launchRocket(s: FireworksState, width: number, height: number, x?: number): void {
  const sx = x ?? width * (0.18 + R() * 0.64);
  s.rockets.push({
    x: sx,
    y: height + 6,
    px: sx,
    py: height + 6,
    vx: (R() - 0.5) * 1.4,
    vy: -(10.5 + R() * 5),
    hue: partyHue(),
    targetY: 70 + R() * height * 0.38,
  });
}

function shell(s: FireworksState, x: number, y: number, hue: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = R() * TAU;
    const speed = 1.2 + R() * 8.6;
    s.sparks.push({
      x,
      y,
      px: x,
      py: y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      hue: hue + R() * 24 - 12,
      life: 1,
      decay: 0.006 + R() * 0.009,
    });
  }
  if (s.sparks.length > 2000) s.sparks.splice(0, s.sparks.length - 2000);
}

function initFireworks(): void {
  const s = fireworksState();
  s.rockets.length = 0;
  s.sparks.length = 0;
  s.next = 24;
}

function clickFireworks(props: EffectProps, x: number, y: number): void {
  const s = fireworksState();
  shell(s, x, y, partyHue(), 80);
  void props;
}

function drawFireworks(props: EffectProps): void {
  const { ctx, width, height, dark } = props;
  const s = fireworksState();
  s.next -= 1;
  if (s.next <= 0) {
    launchRocket(s, width, height);
    s.next = 30 + R() * 42;
  }
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

  for (let i = s.rockets.length - 1; i >= 0; i--) {
    const r = s.rockets[i]!;
    r.px = r.x;
    r.py = r.y;
    r.vy += 0.16;
    r.x += r.vx;
    r.y += r.vy;
    ctx.strokeStyle = hsl(r.hue, 85, 80, 0.85);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(r.px, r.py);
    ctx.lineTo(r.x, r.y);
    ctx.stroke();
    const rg = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 12);
    rg.addColorStop(0, hsl(r.hue, 95, 92, 0.85));
    rg.addColorStop(1, hsl(r.hue, 95, 70, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 12, 0, TAU);
    ctx.fill();
    if (r.vy >= -1.2 || r.y <= r.targetY) {
      shell(s, r.x, r.y, r.hue, 110);
      s.rockets.splice(i, 1);
    }
  }

  for (let i = s.sparks.length - 1; i >= 0; i--) {
    const p = s.sparks[i]!;
    p.px = p.x;
    p.py = p.y;
    p.vx *= 0.985;
    p.vy = p.vy * 0.988 + 0.045;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) {
      s.sparks.splice(i, 1);
      continue;
    }
    ctx.strokeStyle = hsl(p.hue, 95, 74, Math.min(1, p.life * 1.7));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.px, p.py);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (i % 4 === 0) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
      g.addColorStop(0, hsl(p.hue, 95, 82, Math.min(1, p.life) * 0.55));
      g.addColorStop(1, hsl(p.hue, 95, 70, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 23. Fountain (water jet with splash rings) ---------- */

interface WaterDrop {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
}

interface FountainRing {
  x: number;
  y: number;
  r: number;
  max: number;
}

function initFountain(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  storeFor<FountainRing>("fountain::rings").length = 0;
  const A = storeFor<WaterDrop>("fountain");
  A.length = 0;
  A.push(
    ...mk(cnt(130), (i) => {
      const t = i / Math.max(1, cnt(130));
      return {
        x: W / 2 + (R() - 0.5) * 26,
        y: H - 2 - t * H * 0.55,
        px: W / 2,
        py: H,
        vx: (R() - 0.5) * 3.4,
        vy: -(7 + R() * 4.5) * (0.55 + t * 0.45),
        life: 1,
        hue: 190 + R() * 26,
      };
    }),
  );
}

function drawFountain(props: EffectProps): void {
  const { ctx, width, height, mx, my, mvx, mvy, dark } = props;
  const A = storeFor<WaterDrop>("fountain");
  if (A.length === 0) initFountain(props);
  const rings = storeFor<FountainRing>("fountain::rings");
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  A.forEach((p) => {
    p.px = p.x;
    p.py = p.y;
    p.vy += 0.22;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.006;
    rep(p, 110, 0.05, mx, my, mvx, mvy);
    if (p.y > height - 4 && p.vy > 0) {
      rings.push({ x: p.x, y: height - 2, r: 1, max: 34 + R() * 40 });
      p.x = width / 2 + (R() - 0.5) * 34;
      p.y = height - 2;
      p.px = p.x;
      p.py = p.y;
      p.vx = (R() - 0.5) * 3.6;
      p.vy = -(7.5 + R() * 4.5);
      p.life = 1;
    }
    if (p.life <= 0) {
      p.life = 1;
      p.x = width / 2;
      p.y = height - 2;
    }
    const a = dark ? 0.75 : 0.55;
    ctx.strokeStyle = hsl(p.hue, 75, 82, a * Math.max(0.2, p.life));
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p.px, p.py);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  for (let i = rings.length - 1; i >= 0; i--) {
    const o = rings[i]!;
    o.r += 1.6;
    if (o.r > o.max) {
      rings.splice(i, 1);
      continue;
    }
    ctx.strokeStyle = hsl(198, 80, 84, (1 - o.r / o.max) * 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, o.r, o.r * 0.3, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 24. Hyperspace (star streaks rushing past) ---------- */

interface HyperStar {
  a: number;
  d: number;
  sp: number;
  hue: number;
  w: number;
}

function initHyperspace(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const maxR = Math.max(W || 1200, H || 800);
  const A = storeFor<HyperStar>("hyperspace");
  A.length = 0;
  A.push(
    ...mk(cnt(190), () => ({
      a: R() * TAU,
      d: 4 + R() * maxR * 0.8,
      sp: 0.014 + R() * 0.032,
      hue: 200 + R() * 90,
      w: 0.7 + R() * 2,
    })),
  );
}

function drawHyperspace(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, mvx, mvy, dark, reducedMotion } = props;
  const A = storeFor<HyperStar>("hyperspace");
  if (A.length === 0) initHyperspace(props);
  const maxR = Math.max(width, height) * 0.95;
  const cx = width / 2 + (mx > 0 ? (mx - width / 2) * -0.06 : Math.sin(time * 0.3) * 10);
  const cy = height / 2 + (my > 0 ? (my - height / 2) * -0.06 : Math.cos(time * 0.24) * 8);
  const warp = 1 + Math.min(2.4, Math.hypot(mvx, mvy) * 0.06);
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  ctx.lineCap = "round";
  for (const s of A) {
    const prev = s.d;
    s.d *= 1 + s.sp * warp * (reducedMotion ? 0.35 : 1);
    if (s.d > maxR) {
      s.d = 4 + R() * 26;
      s.a = R() * TAU;
    }
    const ca = Math.cos(s.a);
    const sa = Math.sin(s.a);
    const radial = s.d / maxR;
    const alpha = Math.min(0.95, 0.2 + radial * 0.9);
    ctx.strokeStyle = hsl(s.hue, 60, 90, alpha);
    ctx.lineWidth = s.w * (0.45 + radial * 1.5);
    ctx.beginPath();
    ctx.moveTo(cx + ca * prev, cy + sa * prev);
    ctx.lineTo(cx + ca * s.d, cy + sa * s.d);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 25. Links (linked particle network) ---------- */

interface LinkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  z: number;
}

function initLinks(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<LinkNode>("links");
  A.length = 0;
  A.push(
    ...mk(cnt(46), () => ({
      x: R() * W,
      y: R() * H,
      vx: (R() - 0.5) * 0.7,
      vy: (R() - 0.5) * 0.7,
      hue: 195 + R() * 45,
      z: 0.6 + R() * 0.8,
    })),
  );
}

function drawLinks(props: EffectProps): void {
  const { ctx, width, height, mx, my, mvx, mvy, dark, reducedMotion } = props;
  const A = storeFor<LinkNode>("links");
  if (A.length === 0) initLinks(props);
  for (const p of A) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.996;
    p.vy *= 0.996;
    rep(p, 170, 0.05, mx, my, mvx, mvy);
    wrap(p, 20);
    void width;
    void height;
  }
  const maxD = 150;
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  for (let i = 0; i < A.length; i++) {
    const a = A[i]!;
    for (let j = i + 1; j < A.length; j++) {
      const b = A[j]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < maxD) {
        const alpha = (1 - d / maxD) * 0.5;
        ctx.strokeStyle = hsl(205, 70, dark ? 72 : 45, alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    if (mx > 0) {
      const dx = a.x - mx;
      const dy = a.y - my;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 240) {
        ctx.strokeStyle = hsl(190, 90, dark ? 78 : 45, (1 - d / 240) * 0.6);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mx, my);
        ctx.stroke();
      }
    }
    ctx.fillStyle = hsl(a.hue, 85, dark ? 82 : 42, 0.9);
    ctx.beginPath();
    ctx.arc(a.x, a.y, 1.7 * a.z, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  void reducedMotion;
}

/* ---------- 26. Matrix (digital rain columns) ---------- */

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  len: number;
  ph: number;
  glyphs: string[];
}

const MATRIX_GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789<>{}[]/\\|=+*".split("");

function matrixGlyph(): string {
  return MATRIX_GLYPHS[Math.floor(R() * MATRIX_GLYPHS.length)] ?? "0";
}

function initMatrix(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<MatrixColumn>("matrix");
  A.length = 0;
  const cols = Math.max(14, Math.floor((W || 1200) / 22));
  A.push(
    ...mk(cols, (i) => {
      const len = 8 + Math.floor(R() * 10);
      return {
        x: (i + 0.5) * ((W || 1200) / cols),
        y: R() * H,
        speed: 2 + R() * 4.5,
        len,
        ph: R() * TAU,
        glyphs: mk(len, () => matrixGlyph()),
      };
    }),
  );
}

function drawMatrix(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, dark, reducedMotion } = props;
  const A = storeFor<MatrixColumn>("matrix");
  if (A.length === 0) initMatrix(props);
  const glyphH = 14;
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const c of A) {
    c.y += c.speed * (reducedMotion ? 0.4 : 1);
    if (c.y - c.len * glyphH > height) {
      c.y = -R() * 120;
      c.x = R() * width;
      c.speed = 2 + R() * 4.5;
      c.glyphs = mk(c.len, () => matrixGlyph());
    }
    // Glyphs mutate slowly so columns read as text, not static.
    if (R() < 0.05) c.glyphs[Math.floor(R() * c.glyphs.length)] = matrixGlyph();
    for (let i = 0; i < c.glyphs.length; i++) {
      const gy = c.y - i * glyphH;
      if (gy < -glyphH || gy > height + glyphH) continue;
      const ch = c.glyphs[i] ?? "0";
      const near = mx > 0 && Math.abs(c.x - mx) < 34 && Math.abs(gy - my) < 46;
      const alpha = near ? 0.95 : (1 - i / c.glyphs.length) * 0.78;
      ctx.fillStyle = near
        ? hsl(300, 95, 78, 1)
        : i === 0
          ? hsl(130, 90, dark ? 88 : 30, 0.95)
          : hsl(135, 85, dark ? 56 : 32, alpha);
      ctx.fillText(ch, c.x, gy);
    }
  }
  void time;
}
/* ---------- 27. Sea Anemone (swaying tendrils from the sea floor) ---------- */

interface Tendril {
  bx: number;
  len: number;
  ph: number;
  amp: number;
  hue: number;
  sway: number;
  w: number;
}

function initSeaAnemone(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<Tendril>("sea-anemone");
  A.length = 0;
  A.push(
    ...mk(cnt(26), (i) => ({
      bx: ((i + 0.5) / cnt(26)) * W + (R() - 0.5) * 30,
      len: H * (0.28 + R() * 0.5),
      ph: R() * TAU,
      amp: 16 + R() * 44,
      hue: 155 + R() * 70,
      sway: (R() - 0.5) * 0.5,
      w: 2 + R() * 3.4,
    })),
  );
}

function drawSeaAnemone(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, dark, reducedMotion } = props;
  const A = storeFor<Tendril>("sea-anemone");
  if (A.length === 0) initSeaAnemone(props);
  ctx.lineCap = "round";
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  const steps = 11;
  for (const t of A) {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const wave = Math.sin(time * 0.9 + t.ph + u * 2.8) * t.amp * u;
      const drift = t.sway * u * u * height * 0.12 + props.wind * u * 18;
      let x = t.bx + wave + drift;
      let y = height + 8 - t.len * u;
      const dx = x - mx;
      const dy = y - my;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (mx > 0 && d < 190) {
        const f = (1 - d / 190) * u;
        x += (dx / d) * f * 46;
        y += (dy / d) * f * 26;
      }
      pts.push({ x, y });
    }
    // One path, two passes: a wide soft body plus a thin bright core. Stroking
    // each segment separately would leave gaps between the round caps.
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i]!.x, pts[i]!.y);
    }
    ctx.strokeStyle = hsl(t.hue, 82, dark ? 60 : 40, reducedMotion ? 0.1 : 0.17);
    ctx.lineWidth = t.w * 2;
    ctx.stroke();
    ctx.strokeStyle = hsl(t.hue + 12, 88, dark ? 78 : 44, 0.75);
    ctx.lineWidth = Math.max(0.7, t.w * 0.5);
    ctx.stroke();
    const tip = pts[pts.length - 1]!;
    const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 12);
    g.addColorStop(0, hsl(t.hue + 20, 100, 82, 0.55));
    g.addColorStop(1, hsl(t.hue, 100, 60, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 12, 0, TAU);
    ctx.fill();
  }
  ctx.lineCap = "butt";
  ctx.globalCompositeOperation = "source-over";
  void width;
}

/* ---------- 28. Squares (rotating square grid) ---------- */

interface SquareP {
  x: number;
  y: number;
  s: number;
  rot: number;
  vr: number;
  ph: number;
  hue: number;
  filled: boolean;
}

function initSquares(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<SquareP>("squares");
  A.length = 0;
  const gap = 78;
  const cols = Math.ceil((W || 1200) / gap);
  const rows = Math.ceil((H || 800) / gap);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      A.push({
        x: (c + 0.5) * gap + (R() - 0.5) * 10,
        y: (r + 0.5) * gap + (R() - 0.5) * 10,
        s: 5 + R() * 9,
        rot: R() * TAU,
        vr: (R() - 0.5) * 0.02,
        ph: R() * TAU,
        hue: 190 + R() * 140,
        filled: R() < 0.16,
      });
    }
  }
}

function drawSquares(props: EffectProps): void {
  const { ctx, mx, my, mvx, mvy, dark, reducedMotion } = props;
  const A = storeFor<SquareP>("squares");
  if (A.length === 0) initSquares(props);
  A.forEach((q) => {
    q.rot += q.vr * (reducedMotion ? 0.3 : 1);
    q.ph += reducedMotion ? 0.01 : 0.03;
    const dx = q.x - mx;
    const dy = q.y - my;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const push = d < 150 ? (1 - d / 150) * 12 : 0;
    const ox = (dx / d) * push + mvx * 0.05;
    const oy = (dy / d) * push + mvy * 0.05;
    const s = q.s * (0.8 + 0.3 * Math.sin(q.ph));
    ctx.save();
    ctx.translate(q.x + ox, q.y + oy);
    ctx.rotate(q.rot + q.ph * 0.4);
    if (q.filled) {
      ctx.fillStyle = hsl(q.hue, 80, dark ? 62 : 45, 0.16);
      ctx.fillRect(-s / 2, -s / 2, s, s);
    }
    ctx.strokeStyle = hsl(q.hue, 85, dark ? 72 : 42, 0.62);
    ctx.lineWidth = 1.3;
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  });
}

/* ---------- 29. Stars (twinkling sky with shooting stars) ---------- */

interface SkyStar {
  x: number;
  y: number;
  z: number;
  ph: number;
  ts: number;
  hue: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
}

function initStars(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  storeFor<ShootingStar>("stars::shoot").length = 0;
  const A = storeFor<SkyStar>("stars");
  A.length = 0;
  A.push(
    ...mk(cnt(190), () => ({
      x: R() * W,
      y: R() * H,
      z: 0.25 + R() * 0.75,
      ph: R() * TAU,
      ts: 0.4 + R() * 1.8,
      hue: 205 + R() * 55,
    })),
  );
}

function clickStars(props: EffectProps, x: number, y: number): void {
  storeFor<ShootingStar>("stars::shoot").push({
    x,
    y,
    vx: 3 + R() * 4,
    vy: 1.6 + R() * 2.4,
    life: 1,
    hue: 210 + R() * 50,
  });
  void props;
}

function drawStars(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, dark, reducedMotion } = props;
  const A = storeFor<SkyStar>("stars");
  if (A.length === 0) initStars(props);
  const spawn = storeFor<ShootingStar>("stars::shoot");
  const px = mx > 0 ? (mx - width / 2) * -0.012 : 0;
  const py = my > 0 ? (my - height / 2) * -0.012 : 0;
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  for (const s of A) {
    s.x += s.z * 0.05 + props.wind * 0.05 * s.z;
    s.y += s.z * 0.018;
    if (s.x > width + 4) s.x = -4;
    if (s.x < -4) s.x = width + 4;
    if (s.y > height + 4) s.y = -4;
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(time * s.ts * (reducedMotion ? 0.4 : 1) + s.ph));
    const x = s.x + px * s.z;
    const y = s.y + py * s.z;
    const r = 0.5 + s.z * 1.5;
    if (s.z > 0.82) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 7 * s.z);
      g.addColorStop(0, hsl(s.hue, 30, 92, 0.55 * tw));
      g.addColorStop(1, hsl(s.hue, 30, 92, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 7 * s.z, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = hsl(s.hue, 25, dark ? 94 : 30, tw);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  for (let i = spawn.length - 1; i >= 0; i--) {
    const m = spawn[i]!;
    m.x += m.vx;
    m.y += m.vy;
    m.life -= 0.012;
    if (m.life <= 0 || m.x > width + 120 || m.y > height + 120) {
      spawn.splice(i, 1);
      continue;
    }
    const tail = 20 + m.life * 110;
    const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail * 0.12, m.y - m.vy * tail * 0.12);
    g.addColorStop(0, hsl(m.hue, 60, 94, m.life));
    g.addColorStop(1, hsl(m.hue, 70, 70, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - m.vx * tail * 0.12, m.y - m.vy * tail * 0.12);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 30. Triangles (drifting rotating triangles) ---------- */

interface Tri {
  x: number;
  y: number;
  s: number;
  rot: number;
  vr: number;
  vx: number;
  vy: number;
  hue: number;
}

function initTriangles(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<Tri>("triangles");
  A.length = 0;
  A.push(
    ...mk(cnt(46), () => ({
      x: R() * W,
      y: R() * H,
      s: 8 + R() * 26,
      rot: R() * TAU,
      vr: (R() - 0.5) * 0.02,
      vx: (R() - 0.5) * 0.6,
      vy: (R() - 0.5) * 0.6,
      hue: 235 + R() * 70,
    })),
  );
}

function drawTriangles(props: EffectProps): void {
  const { ctx, mx, my, mvx, mvy, dark, reducedMotion } = props;
  const A = storeFor<Tri>("triangles");
  if (A.length === 0) initTriangles(props);
  for (const t of A) {
    t.rot += t.vr * (reducedMotion ? 0.3 : 1);
    t.x += t.vx;
    t.y += t.vy;
    rep(t, 160, 0.06, mx, my, mvx, mvy);
    wrap(t, t.s);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.rot);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU - Math.PI / 2;
      const x = Math.cos(a) * t.s;
      const y = Math.sin(a) * t.s;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = hsl(t.hue, 85, dark ? 72 : 44, 0.55);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = hsl(t.hue, 85, dark ? 66 : 44, 0.07);
    ctx.fill();
    ctx.restore();
  }
}

/* ---------- 31. Aurora (shimmering polar curtains) ---------- */

interface AuroraBand {
  hue: number;
  y: number;
  amp: number;
  ph: number;
  speed: number;
  h: number;
}

function initAurora(props?: Partial<EffectProps>): void {
  const H = props?.height ?? HEIGHT;
  const bands = [
    { hue: 150, y: 0.26, h: 0.17 },
    { hue: 176, y: 0.32, h: 0.2 },
    { hue: 268, y: 0.21, h: 0.13 },
    { hue: 206, y: 0.38, h: 0.11 },
  ];
  const A = storeFor<AuroraBand>("aurora");
  A.length = 0;
  A.push(
    ...bands.map((b) => ({
      hue: b.hue,
      y: H * b.y,
      amp: 34 + R() * 54,
      ph: R() * TAU,
      speed: 0.35 + R() * 0.4,
      h: H * b.h,
    })),
  );
}

function drawAurora(props: EffectProps): void {
  const { ctx, width, time, mx, my, dark, reducedMotion } = props;
  const A = storeFor<AuroraBand>("aurora");
  if (A.length === 0) initAurora(props);
  const t = reducedMotion ? time * 0.35 : time;
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  for (const b of A) {
    const edge = (x: number): number => {
      const wave =
        Math.sin(x * 0.0045 + t * b.speed + b.ph) * b.amp +
        Math.sin(x * 0.012 - t * b.speed * 1.6 + b.ph * 2) * b.amp * 0.34;
      let warp = 0;
      if (mx > 0) {
        const f = Math.max(0, 1 - Math.abs(x - mx) / 340);
        warp = (my - (b.y + wave)) * f * 0.28;
      }
      return b.y + wave + warp;
    };
    const step = 14;
    ctx.beginPath();
    ctx.moveTo(-20, edge(-20));
    for (let x = 0; x <= width + 20; x += step) ctx.lineTo(x, edge(x));
    for (let x = width + 20; x >= -20; x -= step) ctx.lineTo(x, edge(x) + b.h);
    ctx.closePath();
    // The canvas keeps this frame (tint mode), so per-frame alpha must stay
    // low or the layers accumulate into white.
    const k = dark ? 1 : 0.75;
    const shimmer = 0.55 + 0.45 * Math.sin(t * 0.7 + b.ph);
    const g = ctx.createLinearGradient(0, b.y - b.amp, 0, b.y + b.amp + b.h);
    g.addColorStop(0, hsl(b.hue, 85, 60, 0.004));
    g.addColorStop(0.42, hsl(b.hue, 85, 62, 0.021 * shimmer * k));
    g.addColorStop(0.78, hsl(b.hue + 16, 90, 66, 0.012 * shimmer * k));
    g.addColorStop(1, hsl(b.hue + 30, 90, 66, 0));
    ctx.fillStyle = g;
    ctx.fill();
    // Vertical striations give the curtain its ray structure.
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 7) {
      const top = edge(x);
      const a = (0.008 + 0.012 * Math.abs(Math.sin(x * 0.02 + t * 1.3 + b.ph))) * shimmer * k;
      ctx.strokeStyle = hsl(b.hue + 10, 92, 72, a);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + b.h * 0.86);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 32. Nebula (volumetric space clouds + embedded stars) ---------- */

interface Cloud {
  x: number;
  y: number;
  r: number;
  hue: number;
  ph: number;
  sp: number;
}

interface NebStar {
  x: number;
  y: number;
  z: number;
  ph: number;
}

interface NebulaState {
  clouds: Cloud[];
  stars: NebStar[];
}

function nebulaState(): NebulaState {
  return stateFor<NebulaState>("nebula", () => ({ clouds: [], stars: [] }));
}

function initNebula(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const s = nebulaState();
  s.clouds = mk(cnt(11), () => ({
    x: R() * W,
    y: R() * H,
    r: Math.min(W, H) * (0.18 + R() * 0.3),
    hue: 215 + R() * 115,
    ph: R() * TAU,
    sp: 0.03 + R() * 0.06,
  }));
  s.stars = mk(cnt(90), () => ({ x: R() * W, y: R() * H, z: 0.4 + R() * 0.6, ph: R() * TAU }));
}

function drawNebula(props: EffectProps): void {
  const { ctx, mx, my, dark, reducedMotion } = props;
  const s = nebulaState();
  if (s.clouds.length === 0) initNebula(props);
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  for (const c of s.clouds) {
    c.ph += c.sp * (reducedMotion ? 0.3 : 1);
    c.x += Math.cos(c.ph) * 0.2 + props.wind * 0.1;
    c.y += Math.sin(c.ph * 0.7) * 0.15;
    if (mx > 0) {
      const dx = c.x - mx;
      const dy = c.y - my;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < c.r) {
        const f = 1 - d / c.r;
        c.x += (dx / d) * f * 0.35;
        c.y += (dy / d) * f * 0.35;
      }
    }
    wrap(c, c.r);
    const a = dark ? 0.13 : 0.08;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    g.addColorStop(0, hsl(c.hue, 80, 62, a));
    g.addColorStop(0.5, hsl(c.hue + 22, 80, 55, a * 0.45));
    g.addColorStop(1, hsl(c.hue + 35, 80, 52, 0));
    ctx.fillStyle = g;
    ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
  }
  for (const st of s.stars) {
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(props.time * 0.8 + st.ph));
    ctx.fillStyle = hsl(220, 30, dark ? 94 : 35, tw * 0.9);
    ctx.beginPath();
    ctx.arc(st.x, st.y, 0.6 + st.z * 1.2, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 33. Petals (fluttering blossom petals) ---------- */

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  s: number;
  ph: number;
  hue: number;
}

function initPetals(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<Petal>("petals");
  A.length = 0;
  A.push(
    ...mk(cnt(52), () => ({
      x: R() * W,
      y: R() * H,
      vx: (R() - 0.5) * 0.8,
      vy: 0.9 + R() * 1.7,
      rot: R() * TAU,
      vr: (R() - 0.5) * 0.05,
      s: 7 + R() * 9,
      ph: R() * TAU,
      hue: 322 + R() * 30,
    })),
  );
}

function drawPetals(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, mvx, mvy, dark, reducedMotion } = props;
  const A = storeFor<Petal>("petals");
  if (A.length === 0) initPetals(props);
  for (const p of A) {
    p.ph += reducedMotion ? 0.02 : 0.05;
    p.y += p.vy + Math.abs(props.sv) * 0.12;
    p.x += p.vx + Math.sin(p.ph) * 1.4 + props.wind * 1.2;
    p.rot += p.vr;
    rep(p, 170, 0.04, mx, my, mvx, mvy);
    if (p.y > height + 24) {
      p.y = -24;
      p.x = R() * width;
    }
    if (p.x < -30) p.x = width + 30;
    if (p.x > width + 30) p.x = -30;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const flip = 0.55 + 0.45 * Math.abs(Math.cos(p.ph * 1.7));
    ctx.scale(1, flip);
    ctx.fillStyle = hsl(p.hue, 72, dark ? 80 : 62, 0.78);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(p.s * 0.72, -p.s * 0.62, p.s * 0.72, p.s * 0.62, 0, p.s);
    ctx.bezierCurveTo(-p.s * 0.72, p.s * 0.62, -p.s * 0.72, -p.s * 0.62, 0, 0);
    ctx.fill();
    ctx.strokeStyle = hsl(p.hue + 8, 60, dark ? 90 : 55, 0.25);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(0, p.s - 1);
    ctx.stroke();
    ctx.restore();
  }
  void time;
}

/* ---------- 34. Glitch (scanline displacement bursts) ---------- */

interface GlitchState {
  next: number;
  burst: number;
  seed: number;
}

function glitchState(): GlitchState {
  return stateFor<GlitchState>("glitch", () => ({ next: 40, burst: 0, seed: R() * 1000 }));
}

function initGlitch(): void {
  const s = glitchState();
  s.next = 40;
  s.burst = 0;
  s.seed = R() * 1000;
}

function clickGlitch(props: EffectProps, x: number, y: number): void {
  const s = glitchState();
  s.burst = 22;
  void props;
  void x;
  void y;
}

/** Layered sines standing in for a signal trace. */
function signalAt(x: number, t: number, seed: number): number {
  return (
    Math.sin(x * 0.014 + t * 1.7 + seed) * 0.5 +
    Math.sin(x * 0.031 - t * 2.6 + seed * 1.7) * 0.28 +
    Math.sin(x * 0.07 + t * 3.4) * 0.14
  );
}

function drawGlitch(props: EffectProps): void {
  const { ctx, canvas, width, height, time, dark } = props;
  const s = glitchState();
  const dpr = canvas.width / width || 1;

  // Base signal: grid, RGB-split trace and data bars give the bursts
  // something real to tear apart.
  ctx.fillStyle = dark ? "rgba(6, 8, 14, 0.55)" : "rgba(246, 247, 250, 0.55)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = dark ? "rgba(120, 220, 255, 0.07)" : "rgba(20, 60, 90, 0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const mid = height * 0.46;
  const traces: [number, string][] = [
    [-3, "rgba(255, 0, 200, 0.55)"],
    [3, "rgba(0, 255, 240, 0.55)"],
    [0, dark ? "rgba(235, 245, 255, 0.9)" : "rgba(18, 28, 46, 0.85)"],
  ];
  for (const [off, color] of traces) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = mid + signalAt(x, time, s.seed) * (height * 0.16) + off;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 7; i++) {
    const bx = width * (0.07 + i * 0.13);
    const bw = 30 + ((Math.sin(time * 0.6 + i * 2.1) + 1) / 2) * 150;
    ctx.fillStyle =
      i % 3 === 0 ? "rgba(0, 255, 240, 0.16)" : i % 3 === 1 ? "rgba(255, 0, 200, 0.14)" : "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(bx, height * 0.72, bw, 4 + ((i * 7) % 12));
  }

  const bandY = ((time * 60) % (height + 160)) - 80;
  const band = ctx.createLinearGradient(0, bandY - 70, 0, bandY + 70);
  band.addColorStop(0, "rgba(80, 220, 255, 0)");
  band.addColorStop(0.5, "rgba(80, 220, 255, 0.1)");
  band.addColorStop(1, "rgba(80, 220, 255, 0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY - 70, width, 140);

  // Trigger bursts.
  s.next -= 1;
  if (s.next <= 0) {
    s.burst = 10 + Math.floor(R() * 18);
    s.next = 30 + R() * 70;
  }
  const active = s.burst > 0;
  if (active) s.burst -= 1;

  // Displace real slices of the canvas — light jitter always, heavy in bursts.
  const slices = active ? 10 : R() < 0.35 ? 1 : 0;
  for (let i = 0; i < slices; i++) {
    const sy = Math.floor(R() * Math.max(1, height - 40));
    const sh = Math.floor(4 + R() * 26);
    const off = (R() - 0.5) * (active ? 90 : 14);
    ctx.drawImage(canvas, 0, sy * dpr, canvas.width, sh * dpr, off, sy, width, sh);
  }

  if (!active) return;

  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i++) {
    const y = R() * height;
    const h = 1 + R() * 4;
    const w = width * (0.15 + R() * 0.8);
    const x = R() * (width - w);
    const pick = R();
    ctx.fillStyle =
      pick < 0.34 ? "rgba(0, 255, 240, 0.3)" : pick < 0.68 ? "rgba(255, 0, 200, 0.28)" : "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(x, y, w, h);
  }
  for (let i = 0; i < 3; i++) {
    const x = R() * width;
    const y = R() * height;
    ctx.fillStyle = R() < 0.5 ? "rgba(0, 255, 240, 0.18)" : "rgba(255, 0, 200, 0.16)";
    ctx.fillRect(x, y, 3 + R() * 40, 20 + R() * 120);
  }
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 35. Ripple (expanding water rings) ---------- */

interface RippleRing {
  x: number;
  y: number;
  r: number;
  max: number;
  hue: number;
}

function initRipple(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<RippleRing>("ripple");
  A.length = 0;
  A.push(
    ...mk(7, () => ({
      x: R() * W,
      y: R() * H,
      r: R() * 60,
      max: 110 + R() * 180,
      hue: 190 + R() * 40,
    })),
  );
}

function clickRipple(props: EffectProps, x: number, y: number): void {
  const A = storeFor<RippleRing>("ripple");
  A.push({ x, y, r: 2, max: 220, hue: 195 + R() * 30 });
  A.push({ x, y, r: 2, max: 140, hue: 200 + R() * 30 });
  void props;
}

function drawRipple(props: EffectProps): void {
  const { ctx, width, height, mx, my, mvx, mvy, dark } = props;
  const A = storeFor<RippleRing>("ripple");
  if (A.length === 0) initRipple(props);
  if (A.length < 18 && R() < 0.07) {
    A.push({ x: R() * width, y: R() * height, r: 1, max: 90 + R() * 170, hue: 190 + R() * 40 });
  }
  if (mx > 0 && Math.hypot(mvx, mvy) > 7 && R() < 0.06 && A.length < 22) {
    A.push({ x: mx, y: my, r: 1, max: 70 + R() * 70, hue: 200 + R() * 30 });
  }
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  for (let i = A.length - 1; i >= 0; i--) {
    const o = A[i]!;
    o.r += 1.7;
    if (o.r > o.max) {
      A.splice(i, 1);
      continue;
    }
    const life = 1 - o.r / o.max;
    ctx.strokeStyle = hsl(o.hue, 78, dark ? 78 : 44, life * 0.85);
    ctx.lineWidth = 1.2 + life * 2.2;
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, o.r, o.r * 0.42, 0, 0, TAU);
    ctx.stroke();
    if (o.r < 14) {
      ctx.fillStyle = hsl(o.hue, 92, dark ? 92 : 50, (1 - o.r / 14) * 0.9);
      ctx.beginPath();
      ctx.arc(o.x, o.y, 3, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
  void height;
}

/* ---------- 36. Starfall (drifting sky + purple stars that splash) ---------- */

interface FallStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  hue: number;
  floor: number;
}

interface SplashBit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
}

interface SplashRing {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
  hue: number;
}

interface StarfallState {
  dots: NebStar[];
  stars: FallStar[];
  bits: SplashBit[];
  rings: SplashRing[];
  next: number;
}

function starfallState(): StarfallState {
  return stateFor<StarfallState>("starfall", () => ({ dots: [], stars: [], bits: [], rings: [], next: 18 }));
}

function initStarfall(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const s = starfallState();
  s.stars = [];
  s.bits = [];
  s.rings = [];
  s.next = 10;
  s.dots = mk(cnt(210), () => ({
    x: R() * W,
    y: R() * H,
    z: 0.25 + R() * 0.75,
    ph: R() * TAU,
  }));
}

function spawnFallStar(s: StarfallState, x: number, floor: number): void {
  s.stars.push({
    x,
    y: -40 - R() * 120,
    vx: (R() - 0.5) * 0.5,
    vy: 5 + R() * 4,
    len: 70 + R() * 150,
    hue: 262 + R() * 26,
    floor,
  });
}

function clickStarfall(props: EffectProps, x: number, y: number): void {
  const s = starfallState();
  spawnFallStar(s, x - 26, Math.max(80, y));
  spawnFallStar(s, x + 26, Math.max(80, y));
  void props;
}

function splash(s: StarfallState, x: number, y: number, hue: number): void {
  s.rings.push({ x, y, r: 1, max: 46 + R() * 54, life: 1, hue });
  s.rings.push({ x, y, r: 1, max: 26 + R() * 26, life: 1, hue: hue + 12 });
  const n = 8 + Math.floor(R() * 8);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (R() - 0.5) * 2.6;
    const speed = 0.8 + R() * 3.2;
    s.bits.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 1,
      hue: hue + R() * 18 - 9,
    });
  }
}

function drawStarfall(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, dark, reducedMotion } = props;
  const s = starfallState();
  if (s.dots.length === 0) initStarfall(props);
  const px = mx > 0 ? (mx - width / 2) * -0.016 : 0;
  const py = my > 0 ? (my - height / 2) * -0.016 : 0;

  // Background sky: slow parallax drift + twinkle.
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  for (const d of s.dots) {
    d.x += d.z * 0.06 + props.wind * 0.05 * d.z;
    d.y += d.z * 0.025;
    if (d.x > width + 4) d.x = -4;
    if (d.x < -4) d.x = width + 4;
    if (d.y > height + 4) d.y = -4;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * (0.5 + d.z) * (reducedMotion ? 0.4 : 1) + d.ph));
    const x = d.x + px * d.z;
    const y = d.y + py * d.z;
    if (d.z > 0.86) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 6.5);
      g.addColorStop(0, hsl(215, 45, 92, 0.5 * tw));
      g.addColorStop(1, hsl(215, 45, 92, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = hsl(210 + d.z * 30, 30, dark ? 95 : 30, tw);
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + d.z * 1.4, 0, TAU);
    ctx.fill();
  }

  // Spawn the purple fallers.
  s.next -= 1;
  if (s.next <= 0 && s.stars.length < 9) {
    spawnFallStar(s, width * (0.08 + R() * 0.84), height * (0.82 + R() * 0.16));
    s.next = 18 + R() * 34;
  }

  for (let i = s.stars.length - 1; i >= 0; i--) {
    const f = s.stars[i]!;
    f.x += f.vx;
    f.y += f.vy;
    const topY = f.y - f.len;
    const g = ctx.createLinearGradient(f.x, topY, f.x, f.y);
    g.addColorStop(0, hsl(f.hue, 85, 62, 0));
    g.addColorStop(0.55, hsl(f.hue, 85, 64, 0.4));
    g.addColorStop(1, hsl(f.hue + 12, 95, 82, 0.95));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(f.x, topY);
    ctx.lineTo(f.x, f.y);
    ctx.stroke();
    const head = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9);
    head.addColorStop(0, hsl(f.hue + 15, 100, 88, 0.95));
    head.addColorStop(0.4, hsl(f.hue, 100, 72, 0.5));
    head.addColorStop(1, hsl(f.hue, 100, 64, 0));
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 9, 0, TAU);
    ctx.fill();
    if (f.y >= f.floor) {
      splash(s, f.x, f.floor, f.hue);
      s.stars.splice(i, 1);
    }
  }

  // Splash bits.
  for (let i = s.bits.length - 1; i >= 0; i--) {
    const b = s.bits[i]!;
    b.vy += 0.17;
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 0.026;
    if (b.life <= 0) {
      s.bits.splice(i, 1);
      continue;
    }
    ctx.fillStyle = hsl(b.hue, 95, 78, b.life);
    ctx.beginPath();
    ctx.arc(b.x, b.y, 1.4 * b.life + 0.5, 0, TAU);
    ctx.fill();
  }

  // Expanding splash rings — the "water splash" at the bottom.
  for (let i = s.rings.length - 1; i >= 0; i--) {
    const r = s.rings[i]!;
    r.r += 2.1;
    r.life -= 0.018;
    if (r.life <= 0 || r.r > r.max) {
      s.rings.splice(i, 1);
      continue;
    }
    ctx.strokeStyle = hsl(r.hue, 95, 80, r.life * 0.65);
    ctx.lineWidth = 1 + r.life * 1.4;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.r, r.r * 0.34, 0, 0, TAU);
    ctx.stroke();
  }

  // A soft floor glow so landings read as water.
  const floor = ctx.createLinearGradient(0, height - 40, 0, height);
  floor.addColorStop(0, hsl(272, 80, 60, 0));
  floor.addColorStop(1, hsl(272, 80, 60, dark ? 0.08 : 0.05));
  ctx.fillStyle = floor;
  ctx.fillRect(0, height - 40, width, 40);
  ctx.globalCompositeOperation = "source-over";
}

/* Cached radial-glow sprite: drawing a pre-rendered canvas is far cheaper than
   allocating a radial gradient for every glowing particle, every frame. */
const glowSprites = new Map<string, HTMLCanvasElement>();

function glowSprite(hue: number, sat: number, light: number): HTMLCanvasElement {
  const key = `${hue}|${sat}|${light}`;
  const cached = glowSprites.get(key);
  if (cached) return cached;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, hsl(hue, sat, light, 0.9));
    grad.addColorStop(0.35, hsl(hue, sat, light, 0.28));
    grad.addColorStop(1, hsl(hue, sat, light, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  glowSprites.set(key, canvas);
  return canvas;
}

/* ---------- 37. Hacker (binary rain, CRT scanlines, intrusion alerts) ---------- */

interface HackColumn {
  x: number;
  y: number;
  speed: number;
  glyphs: string[];
  amber: boolean;
}

interface HackerState {
  cols: HackColumn[];
  alert: number;
}

const HACKER_KANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ";
const HACKER_HEX = "0123456789ABCDEF";

function hackerGlyph(): string {
  const r = R();
  if (r < 0.42) return HACKER_KANA.charAt(Math.floor(R() * HACKER_KANA.length));
  if (r < 0.78) return HACKER_HEX.charAt(Math.floor(R() * HACKER_HEX.length));
  return R() < 0.5 ? "0" : "1";
}

function hackerState(): HackerState {
  return stateFor<HackerState>("hacker", () => ({ cols: [], alert: 0 }));
}

function initHacker(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const s = hackerState();
  s.cols = [];
  s.alert = 0;
  const cols = Math.max(14, Math.floor((W || 1200) / 19));
  for (let i = 0; i < cols; i++) {
    const len = 10 + Math.floor(R() * 16);
    s.cols.push({
      x: (i + 0.5) * ((W || 1200) / cols),
      y: R() * H,
      speed: 3 + R() * 6,
      amber: R() < 0.12,
      glyphs: mk(len, () => hackerGlyph()),
    });
  }
}

function drawHacker(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, dark, reducedMotion } = props;
  const s = hackerState();
  if (s.cols.length === 0) initHacker(props);
  const glyphH = 15;
  const flicker = reducedMotion ? 1 : 0.9 + 0.1 * Math.sin(time * 37);
  ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (s.alert <= 0 && R() < 0.0022) s.alert = 26;
  const alerting = s.alert > 0;
  if (alerting) s.alert -= 1;

  for (const c of s.cols) {
    c.y += c.speed * (reducedMotion ? 0.4 : 1);
    if (c.y - c.glyphs.length * glyphH > height) {
      c.y = -R() * 160;
      c.x = R() * width;
      c.speed = 3 + R() * 6;
      c.amber = R() < 0.12;
      c.glyphs = mk(c.glyphs.length, () => hackerGlyph());
    }
    if (R() < 0.14) c.glyphs[Math.floor(R() * c.glyphs.length)] = hackerGlyph();
    for (let i = 0; i < c.glyphs.length; i++) {
      const gy = c.y - i * glyphH;
      if (gy < -glyphH || gy > height + glyphH) continue;
      const near = mx > 0 && Math.abs(c.x - mx) < 30 && Math.abs(gy - my) < 44;
      const t = i / c.glyphs.length;
      // Trailing glyphs drop off faster than linearly so the head reads as motion.
      const alpha = (1 - t) * (1 - t * 0.45) * (near ? 1 : 0.85) * flicker;
      const hue = near || alerting ? 0 : c.amber ? 38 : 132;
      if (i < 2) {
        // Cached phosphor bloom sprite — no gradient or shadow allocated per frame.
        const sprite = glowSprite(hue, 95, dark ? 70 : 45);
        const size = (i === 0 ? 34 : 22) * flicker;
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(sprite, c.x - size / 2, gy - size / 2, size, size);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.fillStyle = near
        ? hsl(0, 95, 70, 1)
        : i === 0
          ? hsl(hue, 100, dark ? 94 : 32, 0.98)
          : hsl(hue, 90, dark ? 62 : 30, Math.max(0, alpha));
      ctx.fillText(c.glyphs[i] ?? "0", c.x, gy);
    }
  }

  // CRT scanlines.
  ctx.fillStyle = dark ? "rgba(0, 0, 0, 0.16)" : "rgba(20, 30, 24, 0.05)";
  for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);

  // Phosphor bloom along the bottom.
  const bloom = ctx.createLinearGradient(0, height - 90, 0, height);
  bloom.addColorStop(0, hsl(135, 90, 55, 0));
  bloom.addColorStop(1, hsl(135, 90, 55, dark ? 0.12 : 0.06));
  ctx.fillStyle = bloom;
  ctx.fillRect(0, height - 90, width, 90);

  // Intrusion alert.
  if (alerting) {
    const a = s.alert / 26;
    ctx.fillStyle = hsl(0, 90, 55, 0.09 * a);
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = hsl(0, 92, 62, 0.55 * a);
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, width - 12, height - 12);
    ctx.font = "600 12px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = hsl(0, 95, 70, 0.9 * a);
    ctx.fillText("!! INTRUSION DETECTED", width - 18, 30);
  }
}

/* ---------- 38. Music Bars (equalizer with peaks and beats) ---------- */

interface MusicBar {
  h: number;
  peak: number;
}

interface MusicState {
  bars: MusicBar[];
  beat: number;
}

function musicState(): MusicState {
  return stateFor<MusicState>("music-bars", () => ({ bars: [], beat: 0 }));
}

function initMusicBars(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const s = musicState();
  const n = Math.max(24, Math.min(72, Math.floor((W || 1200) / 15)));
  s.bars = mk(n, () => ({ h: 0.08, peak: 0.08 }));
  s.beat = 0;
}

function clickMusicBars(): void {
  musicState().beat = 1.35;
}

function drawMusicBars(props: EffectProps): void {
  const { ctx, width, height, time, dark, reducedMotion } = props;
  const s = musicState();
  if (s.bars.length === 0) initMusicBars(props);
  s.beat = Math.max(0, s.beat - (reducedMotion ? 0.014 : 0.022));
  if (s.beat <= 0 && R() < 0.014) s.beat = 1;
  const env = 0.35 + 0.65 * s.beat;
  const n = s.bars.length;
  const gap = 3;
  const bw = Math.max(3, (width - gap * (n + 1)) / n);
  const base = height - 34;
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

  for (let i = 0; i < n; i++) {
    const b = s.bars[i]!;
    const bass = 0.5 + 0.5 * Math.sin(time * 3.1 + i * 0.32);
    const mid = 0.5 + 0.5 * Math.sin(time * 5.9 + i * 0.83 + 1.7);
    const hiss = 0.5 + 0.5 * Math.sin(time * 11 + i * 1.9);
    const target = Math.min(1, (0.1 + 0.55 * bass * mid + 0.2 * hiss) * env);
    b.h += (target - b.h) * 0.18;
    b.peak = Math.max(b.peak - 0.008, b.h);
    const x = gap + i * (bw + gap);
    const bh = Math.max(4, b.h * height * 0.62);
    const y = base - bh;
    const hue = 196 + (i / n) * 124;
    const g = ctx.createLinearGradient(0, base, 0, y);
    g.addColorStop(0, hsl(hue, 95, 58, 0.85));
    g.addColorStop(0.6, hsl(hue + 24, 95, 64, 0.9));
    g.addColorStop(1, hsl(hue + 52, 95, 72, 0.95));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = hsl(hue + 60, 100, 86, 0.9);
    ctx.fillRect(x, y, bw, 2);
    const py = base - b.peak * height * 0.62;
    ctx.fillStyle = hsl(hue + 40, 100, 90, 0.5);
    ctx.fillRect(x, py, bw, 1.5);
  }

  ctx.fillStyle = hsl(210, 60, dark ? 65 : 40, 0.22);
  ctx.fillRect(0, base, width, 1);
  ctx.fillStyle = hsl(280, 70, dark ? 55 : 45, 0.18);
  ctx.fillRect(0, base + 6, width, 1);
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 39. Radio Glitch (tuner spectrum with static and channel hops) ---------- */

interface RadioState {
  channel: number;
  next: number;
  glitch: number;
}

const RADIO_HUES = [186, 42, 300, 140];

function radioState(): RadioState {
  return stateFor<RadioState>("radio-glitch", () => ({ channel: 0, next: 260, glitch: 0 }));
}

function initRadio(): void {
  const s = radioState();
  s.channel = 0;
  s.next = 260;
  s.glitch = 0;
}

function hopChannel(s: RadioState): void {
  s.channel = (s.channel + 1) % RADIO_HUES.length;
  s.glitch = 18;
  s.next = 280 + R() * 560;
}

function clickRadio(): void {
  hopChannel(radioState());
}

function drawRadio(props: EffectProps): void {
  const { ctx, width, height, time, dark, reducedMotion } = props;
  const s = radioState();
  s.next -= reducedMotion ? 0.4 : 1;
  if (s.next <= 0) hopChannel(s);
  if (s.glitch > 0) s.glitch -= 1;
  const glitching = s.glitch > 0;
  const hue = RADIO_HUES[s.channel] ?? 186;
  const midY = height * 0.54;
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

  // Spectrum, mirrored around the baseline.
  const n = Math.max(28, Math.min(64, Math.floor(width / 22)));
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * (width / n);
    const amp =
      (0.1 + 0.9 * Math.abs(signalAt(i * 22, time * (1 + s.channel * 0.25), s.channel * 3.7))) *
      height *
      0.16;
    const jitter = glitching && R() < 0.35 ? (R() - 0.5) * 34 : 0;
    ctx.fillStyle = hsl(hue, 90, dark ? 62 : 42, 0.5);
    ctx.fillRect(x - 3 + jitter, midY - amp, 6, amp);
    ctx.fillStyle = hsl(hue + 32, 95, dark ? 70 : 44, 0.34);
    ctx.fillRect(x - 3 + jitter, midY, 6, amp * 0.55);
  }

  // Waveform trace.
  ctx.strokeStyle = hsl(hue + 10, 100, dark ? 88 : 38, 0.95);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 6) {
    const y = midY + signalAt(x, time * 2.2 + s.channel * 5, s.channel * 11.3) * height * 0.1;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Tuner readout.
  const freq = 88 + s.channel * 7.3;
  const label = `FM ${freq.toFixed(1)}`;
  ctx.font = "600 20px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (glitching) {
    const split = 2 + R() * 3;
    ctx.fillStyle = "rgba(0, 255, 240, 0.75)";
    ctx.fillText(glitching ? "NO SIGNAL" : label, width / 2 + split, height * 0.22);
    ctx.fillStyle = "rgba(255, 0, 200, 0.7)";
    ctx.fillText("NO SIGNAL", width / 2 - split, height * 0.22);
    ctx.fillStyle = dark ? "rgba(240, 250, 255, 0.95)" : "rgba(20, 30, 50, 0.9)";
    ctx.fillText("NO SIGNAL", width / 2, height * 0.22);
  } else {
    ctx.fillStyle = hsl(hue, 85, dark ? 86 : 36, 0.9);
    ctx.fillText(label, width / 2, height * 0.22);
  }

  ctx.font = "500 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = hsl(hue, 75, dark ? 70 : 40, 0.85);
  ctx.fillText(`${glitching ? "STEREO LOST" : "STEREO"}  ·  ${s.channel + 1}/4`, width - 18, height * 0.12);

  // Static bursts.
  if (glitching) {
    for (let i = 0; i < 80; i++) {
      const y = R() * height;
      ctx.fillStyle = R() < 0.5 ? "rgba(255, 255, 255, 0.16)" : hsl(hue, 90, 70, 0.18);
      ctx.fillRect(R() * width, y, R() * 40 + 4, 1);
    }
  }

  // Tuner scale with a sweeping needle.
  const scaleY = height * 0.88;
  ctx.fillStyle = hsl(hue, 60, dark ? 55 : 40, 0.35);
  ctx.fillRect(width * 0.1, scaleY, width * 0.8, 1);
  for (let i = 0; i <= 20; i++) {
    const x = width * 0.1 + (i / 20) * width * 0.8;
    const h = i % 5 === 0 ? 8 : 4;
    ctx.fillRect(x, scaleY - h, 1, h);
  }
  const needle = width * 0.1 + ((time * 26 + s.channel * 90) % (width * 0.8));
  ctx.fillStyle = hsl(hue + 20, 95, dark ? 78 : 40, 0.9);
  ctx.fillRect(needle, scaleY - 14, 2, 16);
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 40. Star Drops (purple stars that splash into water rings) ---------- */

interface StarDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  hue: number;
  floor: number;
}

interface DropBit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
}

interface DropRing {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
  hue: number;
}

interface StarDropsState {
  drops: StarDrop[];
  bits: DropBit[];
  rings: DropRing[];
  next: number;
}

function starDropsState(): StarDropsState {
  return stateFor<StarDropsState>("star-drops", () => ({ drops: [], bits: [], rings: [], next: 10 }));
}

function initStarDrops(): void {
  const s = starDropsState();
  s.drops = [];
  s.bits = [];
  s.rings = [];
  s.next = 10;
}

function spawnDrop(s: StarDropsState, x: number, floor: number): void {
  s.drops.push({
    x,
    y: -40 - R() * 140,
    vx: (R() - 0.5) * 0.5,
    vy: 5 + R() * 4.2,
    len: 70 + R() * 150,
    hue: 262 + R() * 26,
    floor,
  });
}

function dropSplash(s: StarDropsState, x: number, y: number, hue: number): void {
  s.rings.push({ x, y, r: 1, max: 50 + R() * 60, life: 1, hue });
  s.rings.push({ x, y, r: 1, max: 26 + R() * 28, life: 1, hue: hue + 14 });
  const n = 8 + Math.floor(R() * 8);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (R() - 0.5) * 2.6;
    const speed = 0.8 + R() * 3.2;
    s.bits.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 1,
      hue: hue + R() * 18 - 9,
    });
  }
}

function clickStarDrops(props: EffectProps, x: number, y: number): void {
  const s = starDropsState();
  const floor = Math.max(80, y);
  spawnDrop(s, x - 26, floor);
  spawnDrop(s, x + 26, floor);
  void props;
}

function drawStarDrops(props: EffectProps): void {
  const { ctx, width, height, dark, reducedMotion } = props;
  const s = starDropsState();
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

  s.next -= 1;
  if (s.next <= 0 && s.drops.length < 16) {
    spawnDrop(s, width * (0.08 + R() * 0.84), height * (0.82 + R() * 0.16));
    if (R() < 0.35) spawnDrop(s, width * (0.08 + R() * 0.84), height * (0.82 + R() * 0.16));
    s.next = 10 + R() * 22;
  }

  for (let i = s.drops.length - 1; i >= 0; i--) {
    const f = s.drops[i]!;
    f.x += f.vx;
    f.y += f.vy * (reducedMotion ? 0.6 : 1);
    const topY = f.y - f.len;
    const g = ctx.createLinearGradient(f.x, topY, f.x, f.y);
    g.addColorStop(0, hsl(f.hue, 85, 62, 0));
    g.addColorStop(0.55, hsl(f.hue, 85, 64, 0.42));
    g.addColorStop(1, hsl(f.hue + 12, 95, 84, 0.95));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(f.x, topY);
    ctx.lineTo(f.x, f.y);
    ctx.stroke();
    const head = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10);
    head.addColorStop(0, hsl(f.hue + 15, 100, 90, 0.95));
    head.addColorStop(0.4, hsl(f.hue, 100, 74, 0.5));
    head.addColorStop(1, hsl(f.hue, 100, 64, 0));
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 10, 0, TAU);
    ctx.fill();
    if (f.y >= f.floor) {
      dropSplash(s, f.x, f.floor, f.hue);
      s.drops.splice(i, 1);
    }
  }

  for (let i = s.bits.length - 1; i >= 0; i--) {
    const b = s.bits[i]!;
    b.vy += 0.17;
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 0.026;
    if (b.life <= 0) {
      s.bits.splice(i, 1);
      continue;
    }
    ctx.fillStyle = hsl(b.hue, 95, 78, b.life);
    ctx.beginPath();
    ctx.arc(b.x, b.y, 1.4 * b.life + 0.5, 0, TAU);
    ctx.fill();
  }

  for (let i = s.rings.length - 1; i >= 0; i--) {
    const r = s.rings[i]!;
    r.r += 2.1;
    r.life -= 0.018;
    if (r.life <= 0 || r.r > r.max) {
      s.rings.splice(i, 1);
      continue;
    }
    ctx.strokeStyle = hsl(r.hue, 95, 80, r.life * 0.7);
    ctx.lineWidth = 1 + r.life * 1.5;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.r, r.r * 0.34, 0, 0, TAU);
    ctx.stroke();
  }

  const floorGlow = ctx.createLinearGradient(0, height - 46, 0, height);
  floorGlow.addColorStop(0, hsl(272, 80, 60, 0));
  floorGlow.addColorStop(1, hsl(272, 80, 60, dark ? 0.1 : 0.06));
  ctx.fillStyle = floorGlow;
  ctx.fillRect(0, height - 46, width, 46);
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 41. Night Sky (dense drifting starfield) ---------- */

interface NightStar {
  x: number;
  y: number;
  z: number;
  ph: number;
  ts: number;
  hue: number;
}

function initNightSky(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<NightStar>("night-sky");
  A.length = 0;
  A.push(
    ...mk(cnt(330), () => ({
      x: R() * W,
      y: R() * H,
      z: 0.2 + R() * 0.8,
      ph: R() * TAU,
      ts: 0.35 + R() * 1.9,
      hue: 200 + R() * 60,
    })),
  );
}

function drawNightSky(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, sp, dark, reducedMotion } = props;
  const A = storeFor<NightStar>("night-sky");
  if (A.length === 0) initNightSky(props);
  const px = mx > 0 ? (mx - width / 2) * -0.014 : 0;
  const py = my > 0 ? (my - height / 2) * -0.014 : 0;
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

  // Faint galactic band for depth.
  const band = ctx.createLinearGradient(0, height * 0.15, width, height * 0.7);
  band.addColorStop(0, hsl(230, 70, 50, dark ? 0.05 : 0.03));
  band.addColorStop(0.5, hsl(265, 70, 55, dark ? 0.07 : 0.04));
  band.addColorStop(1, hsl(200, 70, 50, dark ? 0.03 : 0.02));
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, width, height);

  for (const s of A) {
    s.x += s.z * 0.12 + props.wind * 0.1 * s.z;
    s.y += s.z * 0.028 - sp * 0.3 * s.z;
    if (s.x > width + 4) s.x = -4;
    if (s.x < -4) s.x = width + 4;
    if (s.y > height + 4) s.y = -4;
    if (s.y < -4) s.y = height + 4;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * s.ts * (reducedMotion ? 0.4 : 1) + s.ph));
    const x = s.x + px * s.z;
    const y = s.y + py * s.z;
    if (s.z > 0.84) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 8 * s.z);
      g.addColorStop(0, hsl(s.hue, 40, 92, 0.5 * tw));
      g.addColorStop(1, hsl(s.hue, 40, 92, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 8 * s.z, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = hsl(s.hue, 30, dark ? 94 : 30, tw);
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + s.z * 1.5, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  void height;
}

/* ---------- 42. Space Rocks (drifting asteroids with craters) ---------- */

interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vr: number;
  shape: number[];
  hue: number;
  z: number;
}

function initSpaceRocks(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const stars = storeFor<NightStar>("space-rocks::stars");
  stars.length = 0;
  stars.push(
    ...mk(cnt(90), () => ({
      x: R() * W,
      y: R() * H,
      z: 0.3 + R() * 0.7,
      ph: R() * TAU,
      ts: 0.3 + R() * 1.4,
      hue: 205 + R() * 50,
    })),
  );
  const A = storeFor<Rock>("space-rocks");
  A.length = 0;
  A.push(
    ...mk(cnt(15), () => {
      const z = 0.35 + R() * 0.9;
      return {
        x: R() * W,
        y: R() * H,
        vx: (R() - 0.5) * 0.9 * z,
        vy: (R() - 0.35) * 0.6 * z,
        r: 7 + R() * 30 * z,
        rot: R() * TAU,
        vr: (R() - 0.5) * 0.02,
        shape: mk(10, () => 0.7 + R() * 0.45),
        hue: 25 + R() * 20,
        z,
      };
    }),
  );
}

function drawSpaceRocks(props: EffectProps): void {
  const { ctx, time, mx, my, mvx, mvy, dark, reducedMotion } = props;
  const A = storeFor<Rock>("space-rocks");
  if (A.length === 0) initSpaceRocks(props);
  const stars = storeFor<NightStar>("space-rocks::stars");
  for (const s of stars) {
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(time * s.ts + s.ph));
    ctx.fillStyle = hsl(s.hue, 25, dark ? 92 : 32, tw * 0.9);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 0.4 + s.z, 0, TAU);
    ctx.fill();
  }
  for (const r of A) {
    r.x += r.vx;
    r.y += r.vy;
    r.rot += r.vr * (reducedMotion ? 0.3 : 1);
    rep(r, 150, 0.03, mx, my, mvx, mvy);
    wrap(r, r.r * 2);
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    ctx.beginPath();
    for (let i = 0; i < r.shape.length; i++) {
      const a = (i / r.shape.length) * TAU;
      const rad = r.r * (r.shape[i] ?? 1);
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(-r.r * 0.35, -r.r * 0.4, r.r * 0.1, 0, 0, r.r * 1.15);
    g.addColorStop(0, hsl(r.hue, 18, dark ? 46 : 62, 0.98));
    g.addColorStop(0.65, hsl(r.hue, 14, dark ? 30 : 54, 0.98));
    g.addColorStop(1, hsl(r.hue, 16, dark ? 16 : 44, 0.98));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = hsl(r.hue, 30, dark ? 62 : 72, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    // Craters.
    ctx.fillStyle = hsl(r.hue, 10, dark ? 14 : 46, 0.5);
    for (let c = 0; c < 3; c++) {
      const ca = (c * 2.1 + 0.7) * 1.7;
      const cd = r.r * (0.25 + c * 0.18);
      ctx.beginPath();
      ctx.ellipse(Math.cos(ca) * cd, Math.sin(ca) * cd, r.r * 0.16, r.r * 0.11, ca, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- 43. Saturn Ring (ringed planet with moons) ---------- */

interface SaturnMoon {
  a: number;
  dist: number;
  speed: number;
  r: number;
  hue: number;
}

function initSaturnRing(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const moons = storeFor<SaturnMoon>("saturn-ring::moons");
  moons.length = 0;
  moons.push(
    ...mk(3, (i) => ({
      a: R() * TAU,
      dist: 1.75 + i * 0.42 + R() * 0.1,
      speed: 0.004 + R() * 0.006,
      r: 3 + R() * 3,
      hue: 40 + R() * 30,
    })),
  );
  const stars = storeFor<NightStar>("saturn-ring::stars");
  stars.length = 0;
  const base = Math.min(W || 1200, H || 800);
  stars.push(
    ...mk(130, () => ({
      x: R() * W,
      y: R() * H,
      z: 0.3 + R() * 0.7,
      ph: R() * TAU,
      ts: 0.3 + R() * 1.2,
      hue: 205 + R() * 50,
    })),
  );
  void base;
}

function drawSaturnRing(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, dark, reducedMotion } = props;
  const moons = storeFor<SaturnMoon>("saturn-ring::moons");
  if (moons.length === 0) initSaturnRing(props);
  const stars = storeFor<NightStar>("saturn-ring::stars");
  if (stars.length === 0) initSaturnRing(props);
  const R0 = Math.min(width, height) * 0.22;
  const cx = width * 0.5 + (mx > 0 ? (mx - width / 2) * 0.035 : Math.sin(time * 0.15) * 8);
  const cy = height * 0.5 + (my > 0 ? (my - height / 2) * 0.03 : Math.cos(time * 0.12) * 6);
  const tilt = -0.3 + 0.05 * Math.sin(time * 0.14);
  const spin = reducedMotion ? time * 0.05 : time;

  ctx.globalCompositeOperation = "source-over";
  for (const s of stars) {
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(time * s.ts * (reducedMotion ? 0.4 : 1) + s.ph));
    ctx.fillStyle = hsl(s.hue, 25, dark ? 92 : 32, tw);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 0.5 + s.z * 1.2, 0, TAU);
    ctx.fill();
  }

  // Back half of the rings.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  for (let k = 0; k < 6; k++) {
    const rx = R0 * (1.42 + k * 0.19);
    const ry = rx * 0.3;
    ctx.strokeStyle = hsl(42 - k * 2, 45, dark ? 62 - k * 4 : 46, 0.34 - k * 0.03);
    ctx.lineWidth = k === 0 ? 1 : 2 + (k % 3);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, Math.PI, TAU);
    ctx.stroke();
  }
  ctx.restore();

  // Planet body.
  const sphere = ctx.createRadialGradient(cx - R0 * 0.35, cy - R0 * 0.4, R0 * 0.1, cx, cy, R0 * 1.1);
  sphere.addColorStop(0, hsl(42, 62, dark ? 76 : 68, 1));
  sphere.addColorStop(0.55, hsl(35, 55, dark ? 57 : 58, 1));
  sphere.addColorStop(1, hsl(28, 45, dark ? 24 : 44, 1));
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(cx, cy, R0, 0, TAU);
  ctx.fill();

  // Cloud bands clipped to the disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R0, 0, TAU);
  ctx.clip();
  for (let i = -4; i <= 4; i++) {
    const y = cy + (i / 4.6) * R0;
    ctx.fillStyle = hsl(38 + i * 2, 45, dark ? 68 : 70, 0.16);
    ctx.beginPath();
    ctx.ellipse(cx, y, R0 * 1.05, R0 * (0.05 + Math.abs(i) * 0.006), 0, 0, TAU);
    ctx.fill();
  }
  // Terminator shadow.
  const shade = ctx.createLinearGradient(cx - R0, cy, cx + R0, cy);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.65, "rgba(0,0,0,0.12)");
  shade.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = shade;
  ctx.fillRect(cx - R0, cy - R0, R0 * 2, R0 * 2);
  ctx.restore();

  // Front half of the rings.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  for (let k = 0; k < 6; k++) {
    const rx = R0 * (1.42 + k * 0.19);
    const ry = rx * 0.3;
    ctx.strokeStyle = hsl(46 - k * 3, 55, dark ? 70 - k * 4 : 52, 0.55 - k * 0.06);
    ctx.lineWidth = k === 0 ? 1 : 2 + (k % 3);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();

  // Moons.
  for (const m of moons) {
    m.a += m.speed * (reducedMotion ? 0.4 : 1);
    const x = cx + Math.cos(m.a) * R0 * m.dist;
    const y = cy + Math.sin(m.a) * R0 * m.dist * 0.55;
    const mg = ctx.createRadialGradient(x - m.r * 0.4, y - m.r * 0.4, 0.5, x, y, m.r * 2);
    mg.addColorStop(0, hsl(m.hue, 40, dark ? 84 : 70, 0.95));
    mg.addColorStop(1, hsl(m.hue, 30, dark ? 40 : 55, 0.1));
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(x, y, m.r * 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = hsl(m.hue, 25, dark ? 86 : 62, 1);
    ctx.beginPath();
    ctx.arc(x, y, m.r, 0, TAU);
    ctx.fill();
  }
  void spin;
}

/* ---------- 44. Cosmic Planets (a system of drifting worlds) ---------- */

interface Planet {
  x: number;
  y: number;
  r: number;
  hue: number;
  ring: boolean;
  moons: number;
  ph: number;
  speed: number;
  z: number;
}

function initCosmicPlanets(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const base = Math.min(W || 1200, H || 800);
  const A = storeFor<Planet>("cosmic-planets");
  A.length = 0;
  const hues = [18, 42, 196, 148, 288, 330];
  // Spread the worlds on a jittered 3x2 grid so they never clump in one corner.
  const cellW = W / 3;
  const cellH = H / 2;
  A.push(
    ...mk(6, (i) => ({
      x: cellW * ((i % 3) + 0.5 + (R() - 0.5) * 0.55),
      y: cellH * (Math.floor(i / 3) + 0.5 + (R() - 0.5) * 0.55),
      r: base * (0.035 + R() * 0.075),
      hue: hues[i % hues.length] ?? 200,
      ring: i === 1 || i === 4,
      moons: i % 3 === 0 ? 2 : i % 2,
      ph: R() * TAU,
      speed: 0.0008 + R() * 0.0018,
      z: 0.5 + R() * 0.6,
    })),
  );
  const stars = storeFor<NightStar>("cosmic-planets::stars");
  stars.length = 0;
  stars.push(
    ...mk(120, () => ({
      x: R() * W,
      y: R() * H,
      z: 0.3 + R() * 0.7,
      ph: R() * TAU,
      ts: 0.3 + R() * 1.3,
      hue: 205 + R() * 55,
    })),
  );
}

function drawCosmicPlanets(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, dark, reducedMotion } = props;
  const A = storeFor<Planet>("cosmic-planets");
  if (A.length === 0) initCosmicPlanets(props);
  const stars = storeFor<NightStar>("cosmic-planets::stars");
  if (stars.length === 0) initCosmicPlanets(props);
  const px = mx > 0 ? (mx - width / 2) * -0.02 : 0;
  const py = my > 0 ? (my - height / 2) * -0.02 : 0;

  for (const s of stars) {
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(time * s.ts + s.ph));
    ctx.fillStyle = hsl(s.hue, 25, dark ? 92 : 32, tw * 0.9);
    ctx.beginPath();
    ctx.arc(s.x + px * s.z * 0.4, s.y + py * s.z * 0.4, 0.4 + s.z, 0, TAU);
    ctx.fill();
  }

  for (const p of A) {
    p.ph += p.speed * (reducedMotion ? 0.35 : 1);
    p.x += Math.cos(p.ph) * 0.18 * p.z + props.wind * 0.06;
    p.y += Math.sin(p.ph * 0.8) * 0.14 * p.z;
    wrap(p, p.r * 1.6);
    const x = p.x + px * p.z;
    const y = p.y + py * p.z;

    // Atmosphere.
    const halo = ctx.createRadialGradient(x, y, p.r * 0.8, x, y, p.r * 1.7);
    halo.addColorStop(0, hsl(p.hue, 90, 62, dark ? 0.22 : 0.12));
    halo.addColorStop(1, hsl(p.hue, 90, 60, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, p.r * 1.7, 0, TAU);
    ctx.fill();

    // Back half of the ring, drawn behind the planet so it reads as a ring.
    if (p.ring) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.32 + Math.sin(time * 0.1 + p.ph) * 0.05);
      for (let k = 0; k < 3; k++) {
        const rx = p.r * (1.55 + k * 0.28);
        ctx.strokeStyle = hsl(p.hue - 6, 55, dark ? 60 : 46, 0.3 - k * 0.06);
        ctx.lineWidth = 1.5 + k;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, rx * 0.28, 0, Math.PI, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Body.
    const g = ctx.createRadialGradient(x - p.r * 0.35, y - p.r * 0.4, p.r * 0.1, x, y, p.r);
    g.addColorStop(0, hsl(p.hue, 70, dark ? 76 : 66, 1));
    g.addColorStop(0.55, hsl(p.hue + 8, 62, dark ? 56 : 54, 1));
    g.addColorStop(1, hsl(p.hue + 18, 55, dark ? 18 : 36, 1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, TAU);
    ctx.fill();

    // Surface details, clipped.
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, TAU);
    ctx.clip();
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = hsl(p.hue + i * 4, 55, dark ? 70 : 60, 0.12);
      ctx.beginPath();
      ctx.ellipse(x, y + (i / 2.4) * p.r, p.r * 1.1, p.r * 0.07, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Front half of the ring, in front of the planet.
    if (p.ring) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.32 + Math.sin(time * 0.1 + p.ph) * 0.05);
      for (let k = 0; k < 3; k++) {
        const rx = p.r * (1.55 + k * 0.28);
        ctx.strokeStyle = hsl(p.hue - 6, 55, dark ? 74 : 56, 0.42 - k * 0.09);
        ctx.lineWidth = 1.5 + k;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, rx * 0.28, 0, 0, Math.PI);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Moons.
    for (let m = 0; m < p.moons; m++) {
      const a = p.ph * (2 + m) + m * 2.1;
      const md = p.r * (1.75 + m * 0.4);
      const mxp = x + Math.cos(a) * md;
      const myp = y + Math.sin(a) * md * 0.6;
      ctx.fillStyle = hsl(p.hue + 30, 30, dark ? 88 : 60, 0.9);
      ctx.beginPath();
      ctx.arc(mxp, myp, 1.6 + m * 0.7, 0, TAU);
      ctx.fill();
    }
  }
  void height;
}

/* ---------- 45. Emoji (picture-like particles) ---------- */

const EMOJI_SET = ["✨", "🌟", "⭐", "🚀", "🪐", "🌙", "💫", "👾", "🍀", "🎈", "🔥", "❄️"];

interface EmojiP {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  s: number;
  e: number;
  ph: number;
}

function initEmoji(props?: Partial<EffectProps>): void {
  const W = props?.width ?? WIDTH;
  const H = props?.height ?? HEIGHT;
  const A = storeFor<EmojiP>("emoji");
  A.length = 0;
  A.push(
    ...mk(cnt(30), () => ({
      x: R() * W,
      y: R() * H,
      vx: (R() - 0.5) * 0.9,
      vy: (R() - 0.5) * 0.9,
      rot: (R() - 0.5) * 0.6,
      vr: (R() - 0.5) * 0.02,
      s: 20 + R() * 22,
      e: Math.floor(R() * EMOJI_SET.length),
      ph: R() * TAU,
    })),
  );
}

function clickEmoji(props: EffectProps, x: number, y: number): void {
  const A = storeFor<EmojiP>("emoji");
  A.push({
    x,
    y,
    vx: (R() - 0.5) * 2,
    vy: (R() - 0.5) * 2,
    rot: (R() - 0.5) * 0.6,
    vr: (R() - 0.5) * 0.04,
    s: 24 + R() * 18,
    e: Math.floor(R() * EMOJI_SET.length),
    ph: R() * TAU,
  });
  if (A.length > 60) A.splice(0, A.length - 60);
  void props;
}

function drawEmoji(props: EffectProps): void {
  const { ctx, width, height, time, mx, my, mvx, mvy, reducedMotion } = props;
  const A = storeFor<EmojiP>("emoji");
  if (A.length === 0) initEmoji(props);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const p of A) {
    p.ph += reducedMotion ? 0.01 : 0.03;
    p.x += p.vx + Math.sin(p.ph) * 0.35;
    p.y += p.vy + Math.cos(p.ph * 0.7) * 0.3;
    p.rot += p.vr * (reducedMotion ? 0.3 : 1);
    rep(p, 160, 0.05, mx, my, mvx, mvy);
    wrap(p, p.s);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot + Math.sin(p.ph) * 0.2);
    ctx.font = `${p.s}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.globalAlpha = 0.9;
    ctx.fillText(EMOJI_SET[p.e] ?? "✨", 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  void time;
  void width;
  void height;
}

/* ---------- registration ---------- */

export const effects: EffectDefinition[] = [
  /* Presets — parity with the tsParticles preset catalogue */
  { id: "ambient", name: "Ambient", group: "Presets", hue: 220, draw: drawAmbient, reset: initAmbient },
  { id: "big-circles", name: "Big Circles", group: "Presets", hue: 210, draw: drawBigCircles, reset: initBigCircles },
  { id: "bubbles", name: "Bubbles", group: "Presets", hue: 190, draw: drawBubbles, click: clickBubbles, reset: initBubbles },
  { id: "confetti", name: "Confetti", group: "Presets", hue: 330, draw: drawConfetti, reset: initConfetti },
  { id: "confetti-cannon", name: "Confetti Cannon", group: "Presets", hue: 330, draw: drawConfettiCannon, click: clickConfettiCannon, reset: initConfettiCannon },
  { id: "confetti-explosions", name: "Confetti Explosions", group: "Presets", hue: 330, draw: drawConfettiExplosions, click: clickConfettiExplosions, reset: initConfettiExplosions },
  { id: "confetti-falling", name: "Confetti Falling", group: "Presets", hue: 330, draw: drawConfettiFalling, reset: initConfettiFalling },
  { id: "confetti-parade", name: "Confetti Parade", group: "Presets", hue: 330, draw: drawConfettiParade, reset: initConfettiParade },
  { id: "fire", name: "Fire", group: "Presets", hue: 25, draw: drawFire, reset: initFire },
  { id: "fireflies", name: "Fireflies", group: "Presets", hue: 60, draw: drawFireflies, reset: initFireflies },
  { id: "fireworks", name: "Fireworks", group: "Presets", hue: 300, draw: drawFireworks, click: clickFireworks, reset: initFireworks },
  { id: "fountain", name: "Fountain", group: "Presets", hue: 200, draw: drawFountain, reset: initFountain },
  { id: "hyperspace", name: "Hyperspace", group: "Presets", hue: 260, draw: drawHyperspace, reset: initHyperspace },
  { id: "links", name: "Links", group: "Presets", hue: 210, draw: drawLinks, reset: initLinks },
  { id: "matrix", name: "Matrix", group: "Presets", hue: 135, draw: drawMatrix, reset: initMatrix },
  { id: "sea-anemone", name: "Sea Anemone", group: "Presets", hue: 170, draw: drawSeaAnemone, reset: initSeaAnemone },
  { id: "snow", name: "Snow", group: "Presets", hue: 205, draw: drawSnow, reset: initSnow },
  { id: "squares", name: "Squares", group: "Presets", hue: 210, draw: drawSquares, reset: initSquares },
  { id: "stars", name: "Stars", group: "Presets", hue: 220, draw: drawStars, click: clickStars, reset: initStars },
  { id: "triangles", name: "Triangles", group: "Presets", hue: 260, draw: drawTriangles, reset: initTriangles },

  /* Classic — the original hand-written set */
  { id: "constellation", name: "Constellation", group: "Classic", hue: 200, draw: drawConstellation, reset: initConstellation },
  { id: "stardust", name: "Stardust", group: "Classic", hue: 320, draw: drawStardust, reset: initStardust },
  { id: "embers", name: "Embers", group: "Classic", hue: 25, draw: drawEmbers, reset: initEmbers },
  { id: "leaves", name: "Leaves", group: "Classic", hue: 30, draw: drawLeaves, reset: initLeaves },
  { id: "rain", name: "Rain", group: "Classic", hue: 205, draw: drawRain, click: clickRain, reset: initRain },
  { id: "flow", name: "Flow", group: "Classic", hue: 180, draw: drawFlow, tint: true, reset: initFlow },
  { id: "spooky", name: "Spooky", group: "Classic", hue: 280, draw: drawSpooky, click: clickSpooky, reset: initSpooky },
  { id: "neon", name: "Neon", group: "Classic", hue: 315, draw: drawNeon, reset: initNeon },
  { id: "wind", name: "Wind", group: "Classic", hue: 210, draw: drawWind, reset: initWind },
  { id: "sunlight", name: "Sunlight", group: "Classic", hue: 45, draw: drawSunlight, reset: initSunlight },

  /* Cosmic — skies, stars and planets */
  { id: "aurora", name: "Aurora", group: "Cosmic", hue: 160, draw: drawAurora, tint: true, reset: initAurora },
  { id: "nebula", name: "Nebula", group: "Cosmic", hue: 280, draw: drawNebula, reset: initNebula },
  { id: "starfall", name: "Starfall", group: "Cosmic", hue: 272, draw: drawStarfall, click: clickStarfall, reset: initStarfall },
  { id: "star-drops", name: "Star Drops", group: "Cosmic", hue: 272, draw: drawStarDrops, click: clickStarDrops, reset: initStarDrops },
  { id: "night-sky", name: "Night Sky", group: "Cosmic", hue: 225, draw: drawNightSky, reset: initNightSky },
  { id: "space-rocks", name: "Space Rocks", group: "Cosmic", hue: 32, draw: drawSpaceRocks, reset: initSpaceRocks },
  { id: "saturn-ring", name: "Saturn Ring", group: "Cosmic", hue: 40, draw: drawSaturnRing, reset: initSaturnRing },
  { id: "cosmic-planets", name: "Cosmic Planets", group: "Cosmic", hue: 210, draw: drawCosmicPlanets, reset: initCosmicPlanets },

  /* Digital — screens, signals and sound */
  { id: "glitch", name: "Glitch", group: "Digital", hue: 190, draw: drawGlitch, click: clickGlitch, reset: initGlitch },
  { id: "hacker", name: "Hacker", group: "Digital", hue: 135, draw: drawHacker, reset: initHacker },
  { id: "music-bars", name: "Music Bars", group: "Digital", hue: 260, draw: drawMusicBars, click: clickMusicBars, reset: initMusicBars },
  { id: "radio-glitch", name: "Radio Glitch", group: "Digital", hue: 186, draw: drawRadio, click: clickRadio, reset: initRadio },

  /* Playful — petals, water and pictures */
  { id: "petals", name: "Petals", group: "Playful", hue: 335, draw: drawPetals, reset: initPetals },
  { id: "ripple", name: "Ripple", group: "Playful", hue: 200, draw: drawRipple, click: clickRipple, reset: initRipple },
  { id: "emoji", name: "Emoji", group: "Playful", hue: 300, draw: drawEmoji, click: clickEmoji, reset: initEmoji },
];

export function getEffect(id: string): EffectDefinition {
  return effects.find((e) => e.id === id) ?? effects[0]!;
}
