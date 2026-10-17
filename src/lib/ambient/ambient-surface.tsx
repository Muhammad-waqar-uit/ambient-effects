"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AmbientSurfaceProps, EffectId, EffectProps } from "./types";
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
} from "./effects";

export { effects } from "./effects";

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
      // Canvas-local coordinates: the surface can live anywhere on the page.
      const rect = canvas.getBoundingClientRect();
      mouse.current.mx = e.clientX - rect.left;
      mouse.current.my = e.clientY - rect.top;
    };
    const onPointerLeave = () => {
      mouse.current.mx = OFF;
      mouse.current.my = OFF;
    };
    const onPointerDown = (e: PointerEvent) => {
      // The dock handles its own events; clicks there are inert.
      const t = e.target as HTMLElement | null;
      if (t && typeof t.closest === "function" && t.closest("[data-dock]")) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
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
    window.addEventListener("resize", onResize);

    // Container-driven sizing: the surface may mount before its parent has laid
    // out (or change size later, e.g. a responsive hero), and window resize
    // alone never catches that.
    const observer = new ResizeObserver(() => size());
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      stopLoop();
      ctxRef.current = null;
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [baseProps, size, startLoop, stopLoop, switchEffect]);

  const handleEffectSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      switchEffect(e.target.value as EffectId);
    },
    [switchEffect],
  );

  const wrapperStyle: React.CSSProperties = {
    ...(fullscreen ? { position: "fixed", inset: 0 } : { position: "relative" }),
    ...style,
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={wrapperStyle}
      data-ambient="true"
      data-effect={currentEffect}
      data-theme={dark ? "dark" : "light"}
      data-fullscreen={fullscreen ? "true" : "false"}
    >
      <canvas
        ref={canvasRef}
        aria-label="Ambient background effect"
        role="img"
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          width: "100%",
          height: "100%",
          pointerEvents: fullscreen ? "none" : "auto",
          // Consumer-tunable without touching the component.
          opacity: "var(--ambient-opacity, 1)",
          filter: "var(--ambient-filter, none)",
        }}
      />

      {showControls && (
        <select
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            lineHeight: 1.2,
            fontFamily: "inherit",
            color: "var(--ambient-control-fg, inherit)",
            background: dark
              ? "var(--ambient-control-bg, rgba(12, 12, 18, 0.78))"
              : "var(--ambient-control-bg, rgba(255, 255, 255, 0.85))",
            border: "1px solid var(--ambient-control-border, rgba(127, 127, 127, 0.35))",
            borderRadius: "var(--ambient-control-radius, 0.5rem)",
            boxShadow: "0 2px 10px rgb(0 0 0 / 0.18)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            cursor: "pointer",
            colorScheme: dark ? "dark" : "light",
          }}
          value={currentEffect}
          onChange={handleEffectSelect}
          aria-label="Select ambient effect"
        >
          {Array.from(new Set(effects.map((e) => e.group ?? "Presets"))).map((group) => (
            <optgroup key={group} label={group}>
              {effects
                .filter((e) => (e.group ?? "Presets") === group)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  );
}
