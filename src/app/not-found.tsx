"use client";
import Link from "next/link";
import { AmbientSurface } from "@/lib/ambient/ambient-surface";
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05060a] text-white">
      <AmbientSurface defaultEffect="glitch" showControls={false} fullscreen dark />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(closest-side,rgba(5,6,10,0.92),rgba(5,6,10,0.55)_60%,rgba(5,6,10,0))]"
      />

      <div
        data-dock
        className="relative z-10 mx-auto w-full max-w-2xl px-6 py-24 text-center"
      >
        <p className="text-[11px] uppercase tracking-[0.45em] text-white/40">
          Error 404
        </p>

        <h1
          className="mt-4 bg-gradient-to-b from-white via-white to-[#8b7dff] bg-clip-text text-[clamp(6rem,22vw,12rem)] font-semibold leading-[0.85] tracking-[-0.06em] text-transparent"
          style={{ filter: "drop-shadow(0 0 45px rgba(139,125,255,0.35))" }}
        >
          404
        </h1>

        <p className="mt-6 text-xl text-white/80">This page drifted out of orbit.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/45">
          The route doesn&apos;t exist — or it got lost somewhere between the nebula and
          the matrix rain.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Back to the effects
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Docs &amp; install
          </Link>
        </div>

      </div>
    </main>
  );
}
