"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AmbientSurface } from "@/lib/ambient/ambient-surface";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05060a] text-white">
      <AmbientSurface defaultEffect="matrix" showControls={false} fullscreen dark />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(closest-side,rgba(5,6,10,0.92),rgba(5,6,10,0.55)_60%,rgba(5,6,10,0))]"
      />

      <div
        data-dock
        className="relative z-10 mx-auto w-full max-w-2xl px-6 py-24 text-center"
      >
        <p className="text-[11px] uppercase tracking-[0.45em] text-[#7ef0a8]/60">
          Signal lost
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
          Something glitched.
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm text-white/55">
          The effect hit an error it couldn&apos;t recover from on its own. Try again —
          if it keeps happening,{" "}
          <a
            href="https://github.com/Muhammad-waqar-uit/ambient-effects/issues/new?template=bug_report.yml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white underline underline-offset-4 hover:text-white/80"
          >
            open an issue
          </a>
          .
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-white/30">digest: {error.digest}</p>
        )}

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Back to the effects
          </Link>
        </div>
      </div>
    </main>
  );
}
