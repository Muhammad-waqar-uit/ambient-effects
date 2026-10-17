# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-10-12

### Added

- 4 new effects (14 total): `spooky` (Halloween lantern with cursor-carved darkness, drifting ghosts, blinking red eye-pairs, and sudden lightning flashes with apparitions, ported from the Morgan Hollow reference), `neon` (flickering neon circuit strokes that glow brighter near the cursor), `wind` (gusting wind streaks that swirl around the pointer), and `sunlight` (warm god-rays with floating dust motes and scroll-slanted haze).

## [Unreleased]

### Added
- `stars` (Stars): falling purple stars with cursor repulsion and sparkle effect, mimicking water droplet motion at bottom.
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
