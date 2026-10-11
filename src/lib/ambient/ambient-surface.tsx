"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AmbientSurfaceProps, EffectId, EffectProps } from "@/lib/ambient/types";
import {
  bursts,
  clearBursts,
  drawBursts,
  effects,
  getEffect,
  pushParticles,
  resetEffect,
  setAmbientGlobals,
  spawnBurst,
} from "@/lib/ambient/effects";
import { cn } from "@/lib/utils";

export { effects } from "@/lib/ambient/effects";

const OFF = -999;

function prefersReduced(explicit: boolean | undefined): boolean {
  if (explicit !== undefined) return explicit;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AmbientSurface({
  defaultEffect = "fireflies",
  effect: controlledEffect,
  onEffectChange,
  showControls = true,
  fullscreen = false,
  dark = true,
  reduceMotion,
  className,
  style,
}: AmbientSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Shared interaction state — mirrors the reference IIFE.
  const mouse = useRef({ mx: OFF, my: OFF, pmx: OFF, pmy: OFF, mvx: 0, mvy: 0 });
  const scroll = useRef({ sv: 0, lastY: 0, sp: 0, wind: 0 });
  const time = useRef(0);
  const darkRef = useRef(dark);
  const reduceRef = useRef(false);

  const isControlled = controlledEffect !== undefined;
  const [internalEffect, setInternalEffect] = useState<EffectId>(defaultEffect);
  const currentEffect = isControlled ? controlledEffect : internalEffect;
  const currentEffectRef = useRef(currentEffect);
  useEffect(() => {
    currentEffectRef.current = currentEffect;
  }, [currentEffect]);

  useEffect(() => {
    darkRef.current = dark;
  }, [dark]);

  useEffect(() => {
    reduceRef.current = prefersReduced(reduceMotion);
  }, [reduceMotion]);

  const cssSize = useCallback(
    (canvas: HTMLCanvasElement): { w: number; h: number; dpr: number } => {
      let w: number;
      let h: number;
      if (fullscreen) {
        w = window.innerWidth;
        h = window.innerHeight;
      } else {
        const rect = (containerRef.current ?? canvas).getBoundingClientRect();
        w = Math.max(1, Math.floor(rect.width));
        h = Math.max(1, Math.floor(rect.height));
      }
      return { w, h, dpr: Math.min(window.devicePixelRatio || 1, 2) };
    },
    [fullscreen],
  );

  const baseProps = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): EffectProps => {
      const { w, h, dpr } = cssSize(canvas);
      const { mx, my, mvx, mvy } = mouse.current;
      const { sv, sp, wind } = scroll.current;
      return {
        canvas,
        ctx,
        width: w,
        height: h,
        time: time.current,
        reducedMotion: reduceRef.current,
        mx,
        my,
        mvx,
        mvy,
        sv,
        sp,
        wind,
        dark: darkRef.current,
        bursts: bursts.current,
      };
    },
    [cssSize],
  );

  /** Size the canvas and re-initialize the current effect (mirrors the reference size()). */
  const size = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const { w, h, dpr } = cssSize(canvas);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    resetEffect(currentEffectRef.current);
    clearBursts();
    const effect = getEffect(currentEffectRef.current);
    effect.reset?.(baseProps(canvas, ctx));
  }, [baseProps, cssSize]);

  /** Start the fixed-step render loop. */
  const startLoop = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      if (rafRef.current !== null) return;
      const loop = () => {
        // Fixed step, as the reference's tick() uses a constant increment.
        time.current += 0.016;

        const m = mouse.current;
        if (m.pmx < -900) {
          m.pmx = m.mx;
          m.pmy = m.my;
        }
        // Smoothed cursor velocity (lerp .3, reference parity).
        m.mvx += (m.mx - m.pmx - m.mvx) * 0.3;
        m.mvy += (m.my - m.pmy - m.mvy) * 0.3;
        m.pmx = m.mx;
        m.pmy = m.my;

        // Scroll velocity (.2), progress (.08), wind — reference parity.
        const s = scroll.current;
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        s.sv += (y - s.lastY - s.sv) * 0.2;
        s.lastY = y;
        s.sp += (p - s.sp) * 0.08;
        s.wind = Math.sin(s.sp * 6.2832 * 2) * 0.5;

        setAmbientGlobals(
          canvas.width / Math.min(window.devicePixelRatio || 1, 2),
          canvas.height / Math.min(window.devicePixelRatio || 1, 2),
          darkRef.current,
          reduceRef.current,
        );

        const effect = getEffect(currentEffectRef.current);
        const { w, h } = cssSize(canvas);
        if (effect.tint) {
          const bg = darkRef.current ? "0,0,0" : "250,250,250";
          ctx.fillStyle = `rgba(${bg},0.1)`;
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.clearRect(0, 0, w, h);
        }
        ctx.globalCompositeOperation = "source-over";

        effect.draw(baseProps(canvas, ctx));
        drawBursts(ctx, darkRef.current);

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    },
    [baseProps, cssSize],
  );

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /** Switch effect: clear trails, re-init particles, update label (mirror of pick()). */
  const switchEffect = useCallback(
    (id: EffectId) => {
      resetEffect(currentEffectRef.current);
      clearBursts();
      currentEffectRef.current = id;
      if (!isControlled) setInternalEffect(id);
      onEffectChange?.(id);
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (canvas && ctx) {
        const { w, h } = cssSize(canvas);
        const bg = darkRef.current ? "0,0,0" : "250,250,250";
        ctx.clearRect(0, 0, w, h);
        const effect = getEffect(id);
        if (effect.tint) {
          ctx.fillStyle = `rgb(${bg})`;
          ctx.fillRect(0, 0, w, h);
        }
        effect.reset?.(baseProps(canvas, ctx));
      }
    },
    [baseProps, cssSize, isControlled, onEffectChange],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctxRef.current = ctx;
    scroll.current.lastY = window.scrollY;
    size();
    startLoop(canvas, ctx);

    const onResize = () => size();
    const onPointerMove = (e: PointerEvent) => {
      mouse.current.mx = e.clientX;
      mouse.current.my = e.clientY;
      const hint = document.getElementById("hint");
      if (hint) hint.style.opacity = "0";
    };
    const onPointerLeave = () => {
      mouse.current.mx = OFF;
      mouse.current.my = OFF;
    };
    const onPointerDown = (e: PointerEvent) => {
      // The dock handles its own events; clicks there are inert.
      const t = e.target as HTMLElement | null;
      if (t && typeof t.closest === "function" && t.closest("[data-dock]")) return;
      const x = e.clientX;
      const y = e.clientY;
      const effect = getEffect(currentEffectRef.current);
      pushParticles(effect.id, x, y);
      spawnBurst(x, y, effect.tint ? 24 : 12, effect.hue);
      effect.click?.(baseProps(canvas, ctx), x, y);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const i = effects.findIndex((f) => f.id === currentEffectRef.current);
      if (e.key === "ArrowRight") {
        const next = effects[(i + 1) % effects.length];
        if (next) switchEffect(next.id);
      } else if (e.key === "ArrowLeft") {
        const prev = effects[(i - 1 + effects.length) % effects.length];
        if (prev) switchEffect(prev.id);
      }
    };
    const onScroll = () => {
      if (window.scrollY > 20) {
        const hint = document.getElementById("hint");
        if (hint) hint.style.opacity = "0";
      }
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      stopLoop();
      ctxRef.current = null;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [baseProps, size, startLoop, stopLoop, switchEffect]);

  const handleEffectSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      switchEffect(e.target.value as EffectId);
    },
    [switchEffect],
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative", fullscreen && "fixed inset-0 -z-10", className)}
      style={style}
      data-ambient="true"
      data-fullscreen={fullscreen ? "true" : "false"}
    >
      <canvas
        ref={canvasRef}
        data-effect={currentEffect}
        aria-label="Ambient background effect"
        role="img"
        className={fullscreen ? "pointer-events-none" : undefined}
      />

      {showControls && (
        <select
          className="absolute top-4 right-4 z-10 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm shadow-sm backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={currentEffect}
          onChange={handleEffectSelect}
          aria-label="Select ambient effect"
        >
          {effects.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
