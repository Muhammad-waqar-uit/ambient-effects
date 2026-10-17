# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-10-18

### Added

- **9 new effects (45 total):**
  - `hacker` — falling green katakana and hex columns, glowing heads, scanlines.
  - `music-bars` — equalizer bars with mirrored reflections and peak caps; click to pulse the beat.
  - `radio-glitch` — oscilloscope waveform with static bursts and frequency jumps; click to retune.
  - `star-drops` — the purple droplets from `starfall` on their own: fall, streak, splash, ripple.
  - `night-sky` — the moving background sky on its own: parallax stars that drift and twinkle.
  - `space-rocks` — asteroids tumbling in from depth with craters, dust trails and parallax.
  - `saturn-ring` — a ringed planet rotating with ring particles orbiting in perspective.
  - `cosmic-planets` — planets on elliptical orbits with moons and a central star.
  - `emoji` — floating emoji confetti that spins, drifts and reacts to the pointer; click to spawn more.
- `EffectGroup` (`Presets | Classic | Cosmic | Digital | Playful`) exported, and every `EffectDefinition` now carries a `group`, so custom pickers can be sectioned without hardcoding ids.
- `docs/banner.svg` and a badge row for the README.
- `SECURITY.md`, `CODE_OF_CONDUCT.md`, bug/feature issue forms, and a pull-request template.

### Changed

- `starfall` is now composed of the two standalone effects `star-drops` and `night-sky`; it keeps both layers, so existing usage is unchanged.
- Demo rewritten around a searchable, grouped sidebar with a live effect name, theme toggle and mobile drawer, replacing the horizontally scrolling dock.
- README restructured: banner, badges, grouped effect tables, quick start, controlled and grouped-selector examples, interactions, API, accessibility and performance notes.
- `/about` documents all 45 effects by group.

### Fixed

- The published package now resolves outside this repo: internal imports in `ambient-surface.tsx` were still using the `@/*` path alias, so consumers' bundlers could not load the entry point.
- The component no longer depends on the host app's Tailwind build: wrapper, canvas and the built-in `<select>` are styled with inline CSS behind `--ambient-*` variables, so the surface works in any React app and is themeable from plain CSS.
- Pointer and click coordinates are converted to canvas-local space, so effects react in the right place when the surface is embedded mid-page instead of pinned at the viewport origin.
- `cn` is no longer exported from the package entry; the library no longer needs `clsx`/`tailwind-merge`, bringing runtime dependencies back to zero.
- `package.json` `homepage` now points at the live demo and `bugs` at the real repository (it previously pointed at a non-existent org).
- `react` moved from `dependencies` to `peerDependencies`, and `next` / `react-dom` moved to `devDependencies`, so installing the package no longer pulls a second React or an entire Next.js install.
- `files` now ships `docs/banner.svg`, `SECURITY.md` and `CODE_OF_CONDUCT.md`; added `engines` and `sideEffects: false`; expanded npm keywords.

## [0.4.0] - 2026-10-17

### Added

- **36 effects total** (22 new). Full parity with the [tsParticles preset catalogue](https://github.com/tsparticles/presets):
  - `ambient` — huge, slow soft light blobs.
  - `big-circles` — enormous drifting outlined rings.
  - `confetti-cannon` — bottom cannon firing confetti arcs; click to fire.
  - `confetti-explosions` — radial confetti bursts; click to detonate.
  - `confetti-falling` — dense, steady confetti rain.
  - `confetti-parade` — braided ribbons streaming sideways.
  - `fire` — rising flame wall with hot cores and a glowing floor.
  - `fireworks` — rockets, trailing sparks and 100+ spark shells; click to detonate.
  - `fountain` — arcing water jet with splash rings.
  - `hyperspace` — star streaks rushing from a pointer-tracking vanishing point.
  - `links` — drifting linked-node network with pointer links.
  - `matrix` — digital rain with mutating glyphs and pointer highlighting.
  - `sea-anemone` — glowing swaying tendrils that bend away from the pointer.
  - `squares` — rotating neon square grid.
  - `triangles` — drifting rotating triangles.
- New original effects:
  - `aurora` — shimmering polar curtains with vertical ray structure; the pointer warps the curtain locally.
  - `nebula` — volumetric space clouds with embedded twinkling stars.
  - `petals` — tumbling blossom petals.
  - `glitch` — RGB-split signal with real slice displacement; click to force a burst.
  - `ripple` — expanding water rings spawned over time, on fast pointer movement, and on click.
- `starfall` — signature effect: a slow drifting, twinkling sky with purple stars that fall, streak and splash into expanding water rings on landing. Click drops a pair from the top.

### Changed

- `stars` rewritten as a twinkling parallax starfield with click-triggered shooting stars (previously a sparse falling-star sketch).
- `resetEffect` now clears every auxiliary store namespaced `<id>::*`, so effect timers and queues are released on switch/resize.
- Demo dock lists all 36 effects and scrolls horizontally.
- Docs updated: README effects table, `/about` effect list, package metadata and footer version.

### Removed

- Unreleased `aurora-2`, `twinkle-2`, `drift-2`, `prism-2` and `spark-2` drafts — replaced by the production effects above.

## [0.3.0] - 2026-10-12

### Added

- 4 new effects (14 total): `spooky` (Halloween lantern with cursor-carved darkness, drifting ghosts, blinking red eye-pairs, and sudden lightning flashes with apparitions, ported from the Morgan Hollow reference), `neon` (flickering neon circuit strokes that glow brighter near the cursor), `wind` (gusting wind streaks that swirl around the pointer), and `sunlight` (warm god-rays with floating dust motes and scroll-slanted haze).

## [0.2.0]

### Added

- Full interaction layer on `AmbientSurface`: pointermove/pointerleave tracking with smoothed velocity, pointerdown bursts + 340px particle push, ArrowRight/ArrowLeft effect cycling, and scroll-driven velocity/progress/wind.

- `dark` prop (default `true`) matching the reference's dark-first theme; toggling re-inits the active effect.

- Faithful port of all 10 effects from the reference "10 Ambient Page Effects" page, including the previously missing **Rain** (puddle arrays with expanding ellipses, click splash) and **Flow** (tint-trail field with cursor vortex).

- Shared burst system (`spawnBurst`, `drawBursts`, `clearBursts`, `pushParticles`) exported for custom UIs.

- `components.json` + hand-written shadcn-idiom UI components (`button`, `badge`, `card`, `code-block`, `site-header`) using the existing `cn()` helper — zero new runtime dependencies.

- `postcss.config.mjs` wiring Tailwind CSS v4 into the build, per Next.js 16's bundled docs.

### Changed

- Demo split: `/` is now the verbatim replica page (600vh scroll canvas, dock, name, hint, theme toggle); `/about` is a shadcn-style docs/landing page.

- Reduced-motion now halves particle density instead of freezing to a static frame, matching the reference.

- Device pixel ratio is capped at 2 (reference parity).

- Fixed-step animation loop (`time += 0.016`) for reference parity at any refresh rate.

### Fixed

- `src/index.ts` missing while `package.json` pointed `main`/`types`/`exports` at it; the published package was broken and is now a working source-only barrel.

- `effects.ts` no longer exports were missing (`effects`, `getEffect`), which broke `tsc` completely.

- Removed dead `src/app/page.module.css`.

- `@tailwindcss/postcss` moved to `devDependencies` (build tool, not a runtime dep).

### Known issues

- No test suite yet — Playwright/unit contributions welcome.
