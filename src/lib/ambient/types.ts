export type EffectId =
  | "fireflies"
  | "snow"
  | "bubbles"
  | "confetti"
  | "constellation"
  | "stardust"
  | "embers"
  | "leaves"
  | "rain"
  | "flow"
  | "spooky"
  | "neon"
  | "wind"
  | "sunlight"
  | "stars"
  | "ambient"
  | "big-circles"
  | "confetti-cannon"
  | "confetti-explosions"
  | "confetti-falling"
  | "confetti-parade"
  | "fire"
  | "fireworks"
  | "fountain"
  | "hyperspace"
  | "links"
  | "matrix"
  | "sea-anemone"
  | "squares"
  | "triangles"
  | "aurora"
  | "nebula"
  | "petals"
  | "glitch"
  | "ripple"
  | "starfall";

export interface Burst {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Life from 1 down to 0. */
  life: number;
  hue: number;
}

export interface EffectProps {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
  reducedMotion: boolean;
  /** Cursor X in CSS pixels, or -999 when off-screen. */
  mx: number;
  /** Cursor Y in CSS pixels, or -999 when off-screen. */
  my: number;
  /** Cursor velocity X (smoothed). */
  mvx: number;
  /** Cursor velocity Y (smoothed). */
  mvy: number;
  /** Scroll velocity (px per frame, smoothed). */
  sv: number;
  /** Scroll progress 0..1 across the page. */
  sp: number;
  /** Wind value (-0.5..0.5), sine-driven. */
  wind: number;
  /** Whether dark theme is active. */
  dark: boolean;
  /** Shared burst/emitter particles (spark/explosion). */
  bursts: Burst[];
}

export type EffectFn = (props: EffectProps) => void;

export interface EffectDefinition {
  id: EffectId;
  name: string;
  draw: EffectFn;
  /** Base hue used for click bursts. */
  hue: number;
  /** When true, the canvas is tint-filled (not cleared) each frame — for trail effects. */
  tint?: boolean;
  /** Effect-specific pointerdown behavior (e.g. pop bubbles, splash rain). */
  click?(props: EffectProps, x: number, y: number): void;
  /** Re-initialize the effect's particle state. */
  reset?(props: EffectProps): void;
}

export interface AmbientSurfaceProps {
  /** Initial effect to show. Defaults to "fireflies". */
  defaultEffect?: EffectId;
  /** Controlled effect. If provided, component is controlled. */
  effect?: EffectId;
  /** Callback when effect changes. */
  onEffectChange?: (effect: EffectId) => void;
  /** Whether to show the built-in effect selector. Defaults to true. */
  showControls?: boolean;
  /** Whether the canvas should fill the viewport. Defaults to false. */
  fullscreen?: boolean;
  /** Start in dark theme. Defaults to true (the reference starts dark). */
  dark?: boolean;
  /** Explicit override for the user's motion preference. When undefined, respects prefers-reduced-motion. */
  reduceMotion?: boolean;
  /** CSS class applied to the canvas wrapper. */
  className?: string;
  /** Additional styles applied to the canvas. */
  style?: React.CSSProperties;
}
