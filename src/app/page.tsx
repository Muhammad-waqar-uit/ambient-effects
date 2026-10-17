"use client";

import pkg from "../../package.json";
import { AmbientSurface, effects } from "@/lib/ambient/ambient-surface";
import type { EffectGroup, EffectId } from "@/lib/ambient/types";
import { useMemo, useState } from "react";

const GROUP_ORDER: EffectGroup[] = ["Presets", "Classic", "Cosmic", "Digital", "Playful"];

export default function Home() {
  const [currentEffect, setCurrentEffect] = useState<EffectId>("fireflies");
  const [isDark, setIsDark] = useState(true);
  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };

  const name = effects.find((e) => e.id === currentEffect)?.name ?? "";

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUP_ORDER.map((group) => ({
      group,
      items: effects.filter(
        (e) => (e.group ?? "Presets") === group && (q === "" || e.name.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const pick = (id: EffectId) => {
    setCurrentEffect(id);
    setPanelOpen(false);
  };

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
      <div id="hint">MOVE, CLICK AND EXPLORE</div>

      <button
        type="button"
        className="panel-toggle"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="effects-panel"
        data-dock
      >
        {panelOpen ? "Close" : "Effects"}
        <span className="panel-toggle-count">{effects.length}</span>
      </button>

      <aside
        id="effects-panel"
        className={`effects-panel${panelOpen ? " is-open" : ""}`}
        data-dock
        aria-label="Effects"
      >
        <div className="effects-panel-head">
          <div>
            <p className="effects-panel-kicker">ambient-effects</p>
            <h1 className="effects-panel-title">{name}</h1>
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
          >
            {isDark ? "Light" : "Dark"}
          </button>
        </div>

        <input
          type="search"
          className="effects-search"
          placeholder="Search effects…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search effects"
        />

        <div className="effects-scroll">
          {groups.map(({ group, items }) => (
            <section key={group} className="effects-group">
              <h2 className="effects-group-title">
                {group}
                <span>{items.length}</span>
              </h2>
              <div className="effects-list">
                {items.map((effect) => (
                  <button
                    key={effect.id}
                    type="button"
                    className="effect-item"
                    aria-pressed={currentEffect === effect.id}
                    onClick={() => pick(effect.id)}
                  >
                    <span
                      className="effect-dot"
                      style={{ backgroundColor: `hsl(${effect.hue} 90% 62%)` }}
                      aria-hidden="true"
                    />
                    <span>{effect.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {groups.length === 0 && <p className="effects-empty">No effects match “{query}”.</p>}
        </div>

        <p className="effects-panel-foot">
          Click the canvas to interact · <a href="/about/">Docs</a>
        </p>
      </aside>

      <footer className="replica-footer">
        <span>ambient-effects v{pkg.version}</span>
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
