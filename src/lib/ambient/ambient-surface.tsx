"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AmbientSurfaceProps, EffectId } from "./types";
import { effects, getEffect } from "./effects";
import { cn } from "@/lib/utils";

export { effects, getEffect } from "./effects";

function motionReduced(
  explicit: boolean | undefined,
): boolean {
  if (explicit !== undefined) return explicit;
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  return mql.matches;
}

export function AmbientSurface({
  defaultEffect = "fireflies",
  fullscreen = false,
  reduceMotion,
  className,
  style,
}: AmbientSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const mountedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [currentEffect, setCurrentEffect] = useState<EffectId>(defaultEffect);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !ctxRef.current) return;

    let targetWidth: number;
    let targetHeight: number;

    if (fullscreen) {
      targetWidth = window.innerWidth;
      targetHeight = window.innerHeight;
    } else if (container) {
      const rect = container.getBoundingClientRect();
      targetWidth = Math.max(1, Math.floor(rect.width));
      targetHeight = Math.max(1, Math.floor(rect.height));
    } else {
      targetWidth = 800;
      targetHeight = 600;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = targetWidth * dpr;
    canvas.height = targetHeight * dpr;
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;
    ctxRef.current?.scale(dpr, dpr);
  }, [fullscreen]);

  // We read `currentEffect` inside the loop via a ref to avoid restarting the
  // animation when the user switches effects. The ref stays in sync via
  // useEffect below.
  const currentEffectRef = useRef(currentEffect);
  useEffect(() => {
    currentEffectRef.current = currentEffect;
  }, [currentEffect]);

  const startLoop = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      if (rafRef.current !== null) return;
      let start = performance.now();
      let lastReset = start;

      const loop = (now: number) => {
        const dt = now - start;
        start = now;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        ctx.clearRect(0, 0, w, h);

        const effect = getEffect(currentEffectRef.current);
        const reduced = motionReduced(reduceMotion);

        effect.draw({
          canvas,
          ctx,
          width: w,
          height: h,
          time: dt / 1000,
          reducedMotion: reduced,
        });

        // Reset particles occasionally so effects stay fresh on long runs.
        if (now - lastReset > 60_000) {
          lastReset = now;
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    },
    [reduceMotion],
  );

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const switchEffect = useCallback(
    (id: EffectId) => {
      setCurrentEffect(id);
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctxRef.current = ctx;
    mountedRef.current = true;
    resize();
    startLoop(canvas, ctx);
    setReady(true);

    return () => {
      stopLoop();
      ctxRef.current = null;
      mountedRef.current = false;
    };
  }, [resize, startLoop, stopLoop]);

  // Re-start loop when reducedMotion explicit value changes.
  useEffect(() => {
    if (!ctxRef.current || !canvasRef.current) return;
    stopLoop();
    startLoop(canvasRef.current, ctxRef.current);
  }, [reduceMotion, stopLoop, startLoop]);

  const handleEffectSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      switchEffect(e.target.value as EffectId);
    },
    [switchEffect],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        fullscreen && "fixed inset-0 z-50",
        className,
      )}
      style={style}
      data-ambient="true"
      data-fullscreen={fullscreen ? "true" : "false"}
    >
      <canvas
        ref={canvasRef}
        data-effect={currentEffect}
        aria-label="Ambient background effect"
        role="img"
      />

      {/* Debug/effect switcher overlay (opt-in via CSS) */}
      <select
        className="absolute top-4 right-4 z-10 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
        value={currentEffect}
        onChange={handleEffectSelect}
        disabled={!ready}
        aria-label="Select ambient effect"
      >
        {effects.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
    </div>
  );
}
