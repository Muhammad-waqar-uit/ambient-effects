"use client";

import { AmbientSurface, effects } from "@/lib/ambient/ambient-surface";
import type { EffectId } from "@/lib/ambient/types";
import { useState } from "react";

export default function Home() {
  const [currentEffect, setCurrentEffect] = useState<EffectId>("fireflies");
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };

  const name = effects.find((e) => e.id === currentEffect)?.name ?? "";

  return (
    <>
      <AmbientSurface
        effect={currentEffect}
        onEffectChange={setCurrentEffect}
        showControls={false}
        fullscreen
        dark={isDark}
      />

      <div id="name" aria-live="polite">
        {name}
      </div>
      <div id="hint">MOVE, CLICK AND SCROLL</div>

      <div className="dock" data-dock role="toolbar" aria-label="Effects">
        {effects.map((effect) => (
          <button
            key={effect.id}
            onClick={() => setCurrentEffect(effect.id)}
            aria-pressed={currentEffect === effect.id}
          >
            {effect.name}
          </button>
        ))}
        <div className="sep" />
        <button onClick={toggleTheme}>{isDark ? "Light" : "Dark"}</button>
      </div>

      <footer className="replica-footer">
        <span>ambient-effects v0.4.0</span>
        <span className="replica-footer-sep">·</span>
        <a href="/about/">Docs &amp; install</a>
        <span className="replica-footer-sep">·</span>
        <a
          href="https://github.com/Muhammad-waqar-uit/ambient-effects"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <span className="replica-footer-sep">·</span>
        <a
          href="https://www.npmjs.com/package/ambient-effects"
          target="_blank"
          rel="noopener noreferrer"
        >
          npm
        </a>
      </footer>
    </>
  );
}
