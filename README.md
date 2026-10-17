# ambient-effects

A lightweight library of **36 interactive ambient canvas effects** for Next.js pages. Drop it in and pick an effect — fireflies, snow, bubbles, confetti, ambient, big circles, confetti cannon, explosions, falling and parade, fire, fireworks, fountain, hyperspace, links, matrix, sea anemone, squares, stars, triangles, aurora, nebula, petals, glitch, ripple, starfall, and the original set (constellation, stardust, embers, leaves, rain, flow, spooky, neon, wind, sunlight). Every effect reacts to the pointer, fires on click, and bends with scroll.

Built for **Next.js 16** + **React 19** + **TypeScript**. Runtime dependencies beyond React: [`clsx`](https://github.com/lukeed/clsx) and [`tailwind-merge`](https://github.com/dcastil/tailwind-merge) only (used by the `cn()` class helper).

[![npm version](https://img.shields.io/npm/v/ambient-effects)](https://www.npmjs.com/package/ambient-effects)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Current release: v0.4.0** — 22 new effects (36 total), including full parity with the tsParticles preset catalogue (ambient, big circles, confetti cannon/explosions/falling/parade, fire, fireworks, fountain, hyperspace, links, matrix, sea anemone, squares, triangles) plus originals (aurora, nebula, petals, glitch, ripple) and the signature **Starfall** effect — a drifting, twinkling sky where purple stars fall and splash into water rings. See [CHANGELOG.md](CHANGELOG.md) for the complete list.

## Quick start

```bash
npm install ambient-effects
```

Then use the component in any client-rendered page:

```tsx
import { AmbientSurface } from "ambient-effects";

export default function Page() {
  return (
    <main style={{ height: "100vh", overflow: "hidden" }}>
      <AmbientSurface defaultEffect="fireflies" />
    </main>
  );
}
```

## Install

```bash
npm install ambient-effects
```

Or install from source:

```bash
git clone https://github.com/Muhammad-waqar-uit/ambient-effects
cd ambient-effects
npm install
npm run dev
```

Open `http://localhost:3000` — `/` is the replica demo page (fixed canvas, glass dock with all 36 effects, name label, hint, theme toggle), and `/about` is the docs landing page.

## Usage

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultEffect` | `EffectId` | `"fireflies"` | Initial effect to display (uncontrolled). |
| `effect` | `EffectId` | — | Controlled effect. If provided, component is controlled. |
| `onEffectChange` | `(effect: EffectId) => void` | — | Callback when effect changes. |
| `showControls` | `boolean` | `true` | Whether to show the built-in effect selector. |
| `fullscreen` | `boolean` | `false` | When `true`, the canvas fills the viewport (`fixed inset-0`) instead of the parent container. |
| `dark` | `boolean` | `true` | Dark-first theme like the reference; toggling re-inits the current effect. |
| `reduceMotion` | `boolean` | `undefined` | Explicit override for the user's motion preference. When `undefined`, respects `prefers-reduced-motion`. When active, particle density is halved (animation continues, matching the reference). |
| `className` | `string` | — | CSS class applied to the canvas wrapper. |
| `style` | `React.CSSProperties` | — | Inline styles applied to the canvas wrapper. |

### Effects

All 36 built-in effects, grouped. Every id is a member of the `EffectId` union, so `defaultEffect` is type-checked.

#### Preset set — parity with the tsParticles preset catalogue

| Effect | Description |
|--------|-------------|
| `ambient` | Huge, slow soft light blobs that breathe and drift; the pointer nudges them aside. |
| `big-circles` | A few enormous outlined rings with dashed inner circles and rotating arcs. |
| `bubbles` | Rising translucent bubbles; click near one to pop it into a burst. |
| `confetti` | Falling colored rectangles with rotation; scatters away from the pointer. |
| `confetti-cannon` | A cannon at the bottom that fires confetti arcs every couple of seconds; click to fire one from your pointer. |
| `confetti-explosions` | Radial confetti bursts that erupt at random spots; click for an instant blast. |
| `confetti-falling` | Steady, dense confetti rain with sway, spin and pointer repulsion. |
| `confetti-parade` | Braided ribbons of confetti streaming sideways across the screen. |
| `fire` | A rising wall of flames with hot cores, cooling tips and a glowing floor. |
| `fireflies` | Drifting glowing particles that seek the pointer; additive glow in dark mode. |
| `fireworks` | Rockets launch from the bottom, trail upward, then burst into 100+ spark streaks with gravity; click to detonate at the pointer. |
| `fountain` | A water jet that arcs up from the center and lands in expanding splash rings. |
| `hyperspace` | Star streaks rushing outward from a vanishing point that follows your pointer. |
| `links` | A drifting node network joined by lines, with extra links reaching to the cursor. |
| `matrix` | Digital rain: falling glyph columns with bright heads, slowly mutating characters, and magenta glyphs near the pointer. |
| `sea-anemone` | Glowing tendrils anchored to the sea floor that sway, bend away from the pointer, and end in light. |
| `snow` | Layered snowfall with cursor repulsion, wind drift and scroll gusts. |
| `squares` | A grid of rotating neon squares that pulse, spin and dodge the pointer. |
| `stars` | A twinkling starfield with parallax depth; click to send a shooting star across the sky. |
| `triangles` | Drifting, rotating triangles with soft fills and pointer repulsion. |

#### Original effects

| Effect | Description |
|--------|-------------|
| `constellation` | Stars linked by lines, with extra connections reaching to the cursor. |
| `stardust` | Sparkling dust whose emitters track fast pointer movement. |
| `embers` | Rising glowing embers with additive blending and bottom-fade intensity. |
| `leaves` | Falling leaves with rotation, sway and wind-driven drift. |
| `rain` | Slanted rain streaks that pool into expanding ripple puddles; click for a large splash. |
| `flow` | A tint-trail flow field that swirls around the cursor. |
| `spooky` | Halloween lantern: cursor-carved low light, drifting ghosts, blinking red eye-pairs, sudden lightning flashes with apparitions. Click to strike. |
| `neon` | Glowing neon circuit strokes with realistic on/off flicker that intensify near the cursor. |
| `wind` | Gusts of wind streaks that swirl around the pointer and bend with scroll wind. |
| `sunlight` | Warm god-rays from a sun origin, floating dust motes, and a scroll-slanted haze. |
| `aurora` | Shimmering polar curtains with vertical ray structure; the pointer warps the curtain locally. |
| `nebula` | Volumetric space clouds with embedded twinkling stars; the pointer pushes the clouds. |
| `petals` | Blossom petals fluttering down, tumbling and flipping as they fall. |
| `glitch` | A signal trace with RGB-split fringes, data bars and scan bands that tear into displaced slices. Click to force a burst. |
| `ripple` | Calm water: expanding elliptical rings that spawn on their own, on fast pointer movement, and on click. |
| `starfall` | Signature effect — a slow drifting, twinkling sky with purple stars that fall, streak, and splash into expanding water rings where they land. Click to drop a pair from the top. |

### Interactions

| Gesture | Behavior |
|---------|---------|
| Move | Cursor position and velocity are smoothed into particle physics; the hint fades after the first move. |
| Click | Sparks burst at the pointer and nearby particles get shoved away (within 340px); bubbles pop, rain splits puddles, fireworks detonate, cannons fire, glitch tears. |
| Scroll | Scroll velocity slants particles; wind follows a sine of scroll progress. |
| Arrow keys | ArrowRight/ArrowLeft cycle through all 36 effects. |

> The demo page is 600vh tall so scroll interactions have room; give your page similar height when you use scroll-reactive behavior.

### Theme

`dark` defaults to `true`. Set `dark={false}` to start light; toggling the attribute re-initializes the current effect so lightness dimming applies immediately. Trail effects (`flow`, `aurora`) tint-fill instead of clearing each frame, so their persistence adapts to the theme too.

### Fullscreen mode

```tsx
<AmbientSurface defaultEffect="constellation" fullscreen />
```

In fullscreen mode the wrapper gets `fixed inset-0 z-50` and the canvas tracks `window.innerWidth/innerHeight`. Use this for a background layer behind your page content.

### Respecting motion preferences

The component automatically reads `prefers-reduced-motion` when `reduceMotion` is left undefined. You can force a behavior:

```tsx
<AmbientSurface reduceMotion={true} />
```

When reduced motion is active, particle density is halved and animation speed drops for the effects that key off time — matching the reference's `cnt()` scaling rather than freezing to a static frame.

## Developer experience

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run check` | Type check + lint + build in one go. |

### Quality checks

This project enforces the following gates before any change lands:

- TypeScript strict mode (`npx tsc --noEmit`)
- ESLint with `eslint-config-next` (TypeScript + core web vitals rules)
- Next.js production build (`npm run build`)

Run all three locally before pushing:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

### Path alias

Source imports use the `@/*` alias mapped to `./src/*`. For example:

```ts
import { AmbientSurface } from "@/lib/ambient/ambient-surface";
```

This is configured in `tsconfig.json` and works in both the dev server and production build.

## Package structure

```
ambient-effects/
├── src/
│   ├── index.ts              # Public barrel export
│   ├── lib/
│   │   ├── utils.ts          # cn() helper (clsx + tailwind-merge)
│   │   └── ambient/
│   │       ├── types.ts      # EffectId, EffectProps, EffectDefinition, AmbientSurfaceProps
│   │       ├── ambient-surface.tsx   # Main "use client" component
│   │       └── effects.ts     # All 36 effect implementations
│   └── app/                  # Next.js app (demo + entrypoint)
│       ├── page.tsx
│       ├── layout.tsx
│       └── globals.css
├── public/                   # Static assets (favicon, SVGs)
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── package.json
└── README.md
```

### Public API surface

The package exports from `src/index.ts`:

```ts
export { AmbientSurface, effects, getEffect } from "./ambient/ambient-surface";
export type {
  EffectId,
  EffectProps,
  EffectFn,
  EffectDefinition,
  AmbientSurfaceProps,
} from "./ambient/types";
```

- `AmbientSurface` — the React component.
- `effects` — the array of all 36 `EffectDefinition` entries (useful for custom UI).
- `getEffect(id)` — look up an effect by id, with a safe fallback to fireflies.

## Browser support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge — latest two versions).
- Requires `CanvasRenderingContext2D` and `requestAnimationFrame`.
- Respects `prefers-reduced-motion` automatically.
- One effect (`glitch`) uses self-`drawImage` on the canvas for slice displacement; all others are pure shape/line drawing.

## Accessibility

- The canvas has `role="img"` and an `aria-label`.
- The effect selector is a real `<select>` with `aria-label`.
- The demo dock uses `role="toolbar"` with `aria-pressed` state per effect.
- Reduced-motion users get lighter densities and slower motion automatically.

## License

MIT — see [LICENSE](LICENSE). Free to use, modify, and distribute, including in commercial projects.

## Contributing

Contributions are welcome. Please read the guidelines below before opening a PR.

### Adding a new effect

1. Add the effect id to the `EffectId` union in `src/lib/ambient/types.ts`.
2. Implement the effect in `src/lib/ambient/effects.ts`. Follow the file's pattern:
   - Declare a particle interface (`interface Firefly { x, y, vx, vy, ... }`).
   - Write an `initX()` that resets the particle store for the effect id.
   - Write a `drawX(props: EffectProps)` that reads the store, steps physics, and draws.
   - Register it in the `effects` array: `{ id, name, hue, draw, click?, reset?, tint? }`.
3. Particle state lives in the shared store keyed by effect id (`storeFor<T>("my-effect")`); auxiliary state (timers, queues) uses `stateFor<T>("my-effect", ...)` — both are cleared automatically by `resetEffect`.
4. Add a row to the README effects table and a line under `[Unreleased]` in `CHANGELOG.md`.
5. Test it in the dev server — switch to it from the dock and verify it runs smoothly, reacts to the pointer, and looks right in both themes.

### Reporting a bug

Open an issue at https://github.com/Muhammad-waqar-uit/ambient-effects/issues with:
- The effect name.
- Browser + OS.
- A minimal repro or a description of the visual glitch.
- Whether it happens in dev or production build.

### Pull requests

- Keep PRs focused — one effect, one fix, one feature per PR.
- Run the quality checks (TypeScript + ESLint + build) before submitting.
- Update the README if you add or change public API surface.
- Add a changelog entry in `CHANGELOG.md` under `[Unreleased]`.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Acknowledgments

- Built on [Next.js](https://nextjs.org/) and [React](https://react.dev/).
- Styling via [Tailwind CSS v4](https://tailwindcss.com/).
- Class merging via [`clsx`](https://github.com/lukeed/clsx) and [`tailwind-merge`](https://github.com/dcastil/tailwind-merge).
- Preset coverage modelled on the [tsParticles presets](https://github.com/tsparticles/presets) catalogue.
