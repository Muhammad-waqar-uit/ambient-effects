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
  | "flow";

export interface EffectProps {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
  reducedMotion: boolean;
}

export type EffectFn = (props: EffectProps) => void;

export interface EffectDefinition {
  id: EffectId;
  name: string;
  draw: EffectFn;
  reset?(props: EffectProps): void;
}

export interface AmbientSurfaceProps {
  /** Initial effect to show. Defaults to "fireflies". */
  defaultEffect?: EffectId;
  /** Whether the canvas should fill the viewport. Defaults to false. */
  fullscreen?: boolean;
  /** Explicit override for the user's motion preference. When undefined, respects prefers-reduced-motion. */
  reduceMotion?: boolean;
  /** CSS class applied to the canvas wrapper. */
  className?: string;
  /** Additional styles applied to the canvas. */
  style?: React.CSSProperties;
}
