import type {
  EffectId,
  EffectDefinition,
  EffectProps,
} from "./types";

/* ---------- helpers ---------- */

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function hsla(
  hue: number,
  saturation: number,
  lightness: number,
  alpha: number,
): string {
  return `hsla(${hue}, ${saturation * 100}%, ${lightness * 100}%, ${alpha})`;
}

/* ---------- particle storage ---------- */

// Simple particle storage per effect ID. Particles are stored as unknown[]
// and cast to the correct type inside each draw function.
const particleStore = new Map<
  string,
  { particles: unknown[]; lastW?: number; lastH?: number }
>();

function withParticles<T extends unknown[]>(
  id: string,
  draw: (props: EffectProps & { particles: T }) => void,
): EffectDefinition["draw"] {
  return (props) => {
    const { width, height } = props;

    let entry = particleStore.get(id);
    if (!entry) {
      entry = { particles: [] as unknown[] };
      particleStore.set(id, entry);
    }

    // Reset particles if canvas resized.
    if (entry.lastW !== width || entry.lastH !== height) {
      entry.lastW = width;
      entry.lastH = height;
      entry.particles = [];
    }

    draw({ ...props, particles: entry.particles as T });
  };
}

/* ---------- fireflies ---------- */

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  hue: number;
  life: number;
  maxLife: number;
}

function createFirefly(w: number, h: number): Firefly {
  return {
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.3, 0.3),
    vy: rand(-0.3, 0.3),
    r: rand(1.2, 2.6),
    phase: rand(0, Math.PI * 2),
    hue: rand(40, 60),
    life: rand(4, 10),
    maxLife: 10,
  };
}

function drawFireflies(props: EffectProps & { particles: Firefly[] }) {
  const { ctx, width, height, time, reducedMotion, particles } = props;

  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  // Spawn new fireflies slowly.
  if (particles.length < 80 && Math.random() < 0.3) {
    particles.push(createFirefly(width, height));
  }

  // Remove dead fireflies and keep a rolling count.
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 0.02;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  for (const p of particles) {
    p.x += p.vx + Math.sin(time * 1.2 + p.phase) * 0.4;
    p.y += p.vy + Math.cos(time * 0.9 + p.phase) * 0.4;

    if (p.x < 0) p.x += width;
    if (p.x > width) p.x -= width;
    if (p.y < 0) p.y += height;
    if (p.y > height) p.y -= height;

    const alpha = 0.25 + 0.75 * ((Math.sin(time * 2 + p.phase) + 1) / 2);
    const glow = p.r * (1 + 0.8 * alpha);

    ctx.beginPath();
    ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 0.85, 0.7, alpha * 0.35);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 0.9, 0.9, 0.9);
    ctx.fill();
  }
}

/* ---------- snow ---------- */

interface Snowflake {
  x: number;
  y: number;
  r: number;
  speed: number;
  wind: number;
  wobble: number;
  phase: number;
  opacity: number;
}

function createSnowflake(w: number, h: number): Snowflake {
  return {
    x: rand(0, w),
    y: rand(-h, 0),
    r: rand(1.5, 4.5),
    speed: rand(0.4, 1.2),
    wind: rand(-0.2, 0.2),
    wobble: rand(0, Math.PI * 2),
    phase: rand(0, Math.PI * 2),
    opacity: rand(0.5, 1),
  };
}

function drawSnow(props: EffectProps & { particles: Snowflake[] }) {
  const { ctx, width, height, time, reducedMotion, particles } = props;

  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  if (particles.length < 220 && Math.random() < 0.5) {
    particles.push(createSnowflake(width, height));
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.y += p.speed;
    p.x += p.wind + Math.sin(time * 1.5 + p.phase) * 0.35;
    p.wobble += 0.04;

    if (p.y > height + 10) {
      particles.splice(i, 1);
    }
  }

  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${p.opacity * 0.85})`;
    ctx.fill();

    // small highlight
    ctx.beginPath();
    ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
  }
}

/* ---------- bubbles ---------- */

interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  wobble: number;
  phase: number;
  hue: number;
  opacity: number;
}

function createBubble(w: number, h: number): Bubble {
  return {
    x: rand(0, w),
    y: rand(h, h + 40),
    r: rand(4, 14),
    speed: rand(0.3, 0.9),
    wobble: rand(-1, 1),
    phase: rand(0, Math.PI * 2),
    hue: rand(190, 230),
    opacity: rand(0.2, 0.6),
  };
}

function drawBubbles(props: EffectProps & { particles: Bubble[] }) {
  const { ctx, width, height, time, reducedMotion, particles } = props;

  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  if (particles.length < 40 && Math.random() < 0.4) {
    particles.push(createBubble(width, height));
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.y -= p.speed;
    p.x += Math.sin(time * 1.2 + p.phase) * p.wobble;
    p.phase += 0.02;

    if (p.y < -p.r) {
      particles.splice(i, 1);
    }
  }

  for (const p of particles) {
    // outer glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = hsla(p.hue, 0.5, 0.7, p.opacity * 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();

    // main bubble
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 0.4, 0.85, p.opacity * 0.25);
    ctx.fill();
    ctx.strokeStyle = hsla(p.hue, 0.3, 0.9, p.opacity * 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();

    // highlight
    ctx.beginPath();
    ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
    ctx.fill();
  }
}

/* ---------- confetti ---------- */

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  rotation: number;
  rotSpeed: number;
  w: number;
  h: number;
  gravity: number;
  opacity: number;
}

function createConfetti(w: number, h: number): Confetti {
  return {
    x: rand(0, w),
    y: rand(-h * 0.5, -10),
    vx: rand(-2, 2),
    vy: rand(1, 3),
    r: rand(2, 5),
    hue: rand(0, 360),
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(-0.2, 0.2),
    w: rand(4, 10),
    h: rand(2, 5),
    gravity: rand(0.05, 0.12),
    opacity: rand(0.6, 1),
  };
}

function drawConfetti(props: EffectProps & { particles: Confetti[] }) {
  const { ctx, width, height, reducedMotion, particles } = props;

  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  if (particles.length < 150 && Math.random() < 0.6) {
    particles.push(createConfetti(width, height));
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += p.gravity;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;
    p.opacity -= 0.002;

    if (p.y > height + 20 || p.opacity <= 0) {
      particles.splice(i, 1);
    }
  }

  ctx.save();
  for (const p of particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = hsla(p.hue, 0.9, 0.6, 1);
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.restore();
}

/* ---------- constellation ---------- */

interface Star {
  x: number;
  y: number;
  r: number;
  hue: number;
  twinkle: number;
  phase: number;
}

function createStar(w: number, h: number): Star {
  return {
    x: rand(0, w),
    y: rand(0, h),
    r: rand(0.6, 1.8),
    hue: rand(200, 260),
    twinkle: rand(0.3, 1),
    phase: rand(0, Math.PI * 2),
  };
}

function dist(a: Star, b: Star): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function drawConstellation(props: EffectProps & { particles: Star[] }) {
  const { ctx, width, height, reducedMotion, particles } = props;

  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  if (particles.length < 80 && Math.random() < 0.3) {
    particles.push(createStar(width, height));
  }

  // Draw connections between nearby stars.
  const maxDist = 110;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const d = dist(a, b);
      if (d > maxDist) continue;

      const alpha = (1 - d / maxDist) * 0.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = hsla(220, 0.5, 0.7, alpha);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }

  for (const p of particles) {
    const alpha = 0.3 + 0.7 * ((Math.sin(p.phase) + 1) / 2);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 0.4, 0.9, alpha);
    ctx.fill();

    // glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 0.3, 0.8, alpha * 0.15);
    ctx.fill();
  }
}

/* ---------- stardust ---------- */

interface Stardust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  life: number;
  maxLife: number;
  phase: number;
}

function createStardust(w: number, h: number): Stardust {
  return {
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.2, 0.2),
    vy: rand(-0.2, 0.2),
    r: rand(0.4, 1.4),
    hue: rand(210, 280),
    life: rand(3, 8),
    maxLife: 8,
    phase: rand(0, Math.PI * 2),
  };
}

function drawStardust(props: EffectProps & { particles: Stardust[] }) {
  const { ctx, width, height, time, reducedMotion, particles } = props;

  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  if (particles.length < 120 && Math.random() < 0.4) {
    particles.push(createStardust(width, height));
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 0.015;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) p.x += width;
    if (p.x > width) p.x -= width;
    if (p.y < 0) p.y += height;
    if (p.y > height) p.y -= height;
  }

  for (const p of particles) {
    const lifeRatio = p.life / p.maxLife;
    const alpha = lifeRatio * (0.4 + 0.6 * ((Math.sin(time * 2 + p.phase) + 1) / 2));

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * lifeRatio, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 0.6, 0.8, alpha);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * lifeRatio * 3, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 0.4, 0.9, alpha * 0.15);
    ctx.fill();
  }
}

/* ---------- embers ---------- */

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  life: number;
  maxLife: number;
  phase: number;
}

function createEmber(w: number, h: number): Ember {
  return {
    x: rand(0, w),
    y: h + rand(10, 30),
    vx: rand(-0.4, 0.4),
    vy: rand(-1.5, -0.6),
    r: rand(1.5, 3.5),
    hue: rand(15, 45),
    life: rand(3, 7),
    maxLife: 7,
    phase: rand(0, Math.PI * 2),
  };
}

function drawEmbers(props: EffectProps & { particles: Ember[] }) {
  const { ctx, width, height, time, reducedMotion, particles } = props;

  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  if (particles.length < 70 && Math.random() < 0.5) {
    particles.push(createEmber(width, height));
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 0.02;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  for (const p of particles) {
    p.x += p.vx + Math.sin(time * 1.3 + p.phase) * 0.2;
    p.y += p.vy;
    p.vy *= 0.998;

    const lifeRatio = p.life / p.maxLife;
    const alpha = lifeRatio * (0.6 + 0.4 * ((Math.sin(time * 2.5 + p.phase) + 1) / 2));

    // glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 0.9, 0.6, alpha * 0.2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 1, 0.7, alpha);
    ctx.fill();
  }
}

/* ---------- leaves ---------- */

interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rotation: number;
  rotSpeed: number;
  hue: number;
  phase: number;
  fallSpeed: number;
}

function createLeaf(w: number, h: number): Leaf {
  return {
    x: rand(0, w),
    y: rand(-h, 0),
    vx: rand(-0.3, 0.3),
    vy: rand(0.3, 0.8),
    w: rand(8, 18),
    h: rand(4, 8),
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(-0.02, 0.02),
    hue: rand(20, 50),
    phase: rand(0, Math.PI * 2),
    fallSpeed: rand(0.3, 0.9),
  };
}

function drawLeaves(props: EffectProps & { particles: Leaf[] }) {
  const { ctx, width, height, time, reducedMotion, particles } = props;

  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  if (particles.length < 35 && Math.random() < 0.3) {
    particles.push(createLeaf(width, height));
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += 0.003;
    p.x += p.vx + Math.sin(time * 0.8 + p.phase) * 0.5;
    p.y += p.vy * p.fallSpeed;
    p.rotation += p.rotSpeed;

    if (p.y > height + 20) {
      particles.splice(i, 1);
    }
  }

  ctx.save();
  for (const p of particles) {
    const lifeRatio = Math.min(1, (height - p.y) / height);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = 0.5 + 0.5 * lifeRatio;
    ctx.fillStyle = hsla(p.hue, 0.7, 0.5, 1);
    ctx.beginPath();
    ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ---------- rain ---------- */

interface Raindrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
  phase: number;
}

function createRaindrop(w: number, h: number): Raindrop {
  return {
    x: rand(0, w),
    y: rand(-h, 0),
    speed: rand(12, 22),
    length: rand(8, 18),
    opacity: rand(0.2, 0.5),
    phase: rand(0, Math.PI * 2),
  };
}

function drawRain(props: EffectProps & { particles: Raindrop[] }) {
  const { ctx, width, height, reducedMotion, particles } = props;

  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  if (particles.length < 300 && Math.random() < 0.8) {
    particles.push(createRaindrop(width, height));
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.y += p.speed;
    p.x -= 0.5;

    if (p.y > height + 10) {
      particles.splice(i, 1);
    }
  }

  ctx.strokeStyle = "rgba(170,190,220,0.4)";
  ctx.lineWidth = 1;

  for (const p of particles) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 1, p.y + p.length);
    ctx.stroke();
  }
}

/* ---------- flow ---------- */

interface FlowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  life: number;
  maxLife: number;
  phase: number;
}

function createFlowParticle(w: number, h: number): FlowParticle {
  return {
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(0.2, 0.8),
    vy: rand(-0.2, 0.2),
    r: rand(1.5, 4),
    hue: rand(170, 210),
    life: rand(4, 10),
    maxLife: 10,
    phase: rand(0, Math.PI * 2),
  };
}

function drawFlow(props: EffectProps & { particles: FlowParticle[] }) {
  const { ctx, width, height, time, reducedMotion, particles } = props;

  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  if (particles.length < 100 && Math.random() < 0.4) {
    particles.push(createFlowParticle(width, height));
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 0.02;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy + Math.sin(time * 0.5 + p.phase) * 0.1;

    if (p.x > width + 20) {
      p.x = -20;
      p.life = p.maxLife;
    }
    if (p.y < -20) p.y = height + 20;
    if (p.y > height + 20) p.y = -20;

    const lifeRatio = p.life / p.maxLife;
    const alpha = lifeRatio * 0.6;

    // trail
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 0.5, 0.7, alpha * 0.2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = hsla(p.hue, 0.7, 0.8, alpha);
    ctx.fill();
  }
}

/* ---------- effect registry ---------- */

export const effects: EffectDefinition[] = [
  {
    id: "fireflies",
    name: "Fireflies",
    draw: withParticles("fireflies", drawFireflies),
  },
  {
    id: "snow",
    name: "Snow",
    draw: withParticles("snow", drawSnow),
  },
  {
    id: "bubbles",
    name: "Bubbles",
    draw: withParticles("bubbles", drawBubbles),
  },
  {
    id: "confetti",
    name: "Confetti",
    draw: withParticles("confetti", drawConfetti),
  },
  {
    id: "constellation",
    name: "Constellation",
    draw: withParticles("constellation", drawConstellation),
  },
  {
    id: "stardust",
    name: "Stardust",
    draw: withParticles("stardust", drawStardust),
  },
  {
    id: "embers",
    name: "Embers",
    draw: withParticles("embers", drawEmbers),
  },
  {
    id: "leaves",
    name: "Leaves",
    draw: withParticles("leaves", drawLeaves),
  },
  {
    id: "rain",
    name: "Rain",
    draw: withParticles("rain", drawRain),
  },
  {
    id: "flow",
    name: "Flow",
    draw: withParticles("flow", drawFlow),
  },
];

export function getEffect(id: EffectId): EffectDefinition {
  const found = effects.find((e) => e.id === id);
  if (!found) {
    // Safe fallback to fireflies.
    return effects[0];
  }
  return found;
}
