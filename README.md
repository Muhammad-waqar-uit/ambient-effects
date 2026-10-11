# ambient-effects

A lightweight library of ambient canvas effects for Next.js pages. Drop it in and pick an effect — fireflies, snow, bubbles, confetti, constellation, stardust, embers, leaves, rain, or flow. Every effect reacts to the pointer, fires on click, and bends with scroll, matching the reference demo exactly.

Built for **Next.js 16** + **React 19** + **TypeScript**. Runtime dependencies beyond React: [`clsx`](https://github.com/lukeed/clsx) and [`tailwind-merge`](https://github.com/dcastil/tailwind-merge) only (used by the `cn()` class helper).

[![npm version](https://img.shields.io/npm/v/ambient-effects)](https://www.npmjs.com/package/ambient-effects)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Current release: v0.2.0** — full interaction layer (pointer, click, scroll, arrow keys), faithful port of all 10 effects including Rain puddles and Flow trails, `src/index.ts` barrel exported correctly, shadcn-style docs at `/about`. See [CHANGELOG.md](CHANGELOG.md) for the complete list.

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

Open `http://localhost:3000` — `/` is a verbatim replica of the reference "10 Ambient Page Effects" page (fixed canvas, glass dock, name label, hint), and `/about` is the docs landing page.

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

The built-in effects are:

| Effect | Description |
|--------|-------------|
| `fireflies` | Drifting glowing particles that seek the pointer; additive glow in dark mode. |
| `snow` | Layered snowfall with cursor repulsion, wind drift and scroll gusts. |
| `bubbles` | Rising translucent bubbles; click near one to pop it into a burst. |
| `confetti` | Falling colored rectangles with rotation; scatters away from the pointer. |
| `constellation` | Stars linked by lines, with extra connections reaching to the cursor. |
| `stardust` | Sparkling dust whose emitters track fast pointer movement. |
| `embers` | Rising glowing embers with additive blending and bottom-fade intensity. |
| `leaves` | Falling leaves with rotation, sway and wind-driven drift. |
| `rain` | Slanted rain streaks that pool into expanding ripple puddles; click for a large splash. |
| `flow` | A tint-trail flow field that swirls around the cursor. |

### Interactions
| Gesture | Behavior |
|---------|
| Move | Cursor position and velocity are smoothed into particle physics; the hint fades after the first move. |
| Click | Sparks burst at the pointer, nearby particles get shoved away (within 340px); bubbles pop and rain splits large puddles. |
| Scroll | Scroll velocity slants particles; wind follows a sine of scroll progress. |
| Arrow keys | ArrowRight/ArrowLeft cycle the ten effects. |

> The reference page is 600vh tall so scroll interactions have room; give your page similar height when you use scroll-reactive behavior.

### Theme

`dark` defaults to `true` (the reference starts dark and never reads `prefers-color-scheme`). Set `dark={false}` to start light; toggling the attribute re-initializes the current effect so lightness dimming applies immediately.

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

When reduced motion is active, particle density is halved and animation continues — matching the reference's `cnt()` scaling rather than freezing to a static frame.

## Developer experience

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Start the production server. |
| `npm run lint` | Run ESLint. |

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
│   │       └── effects.ts     # All 10 effect implementations
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
- `effects` — the array of all `EffectDefinition` entries (useful for custom UI).
- `getEffect(id)` — look up an effect by id, with a safe fallback to fireflies.

## Browser support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge — latest two versions).
- Requires `CanvasRenderingContext2D` and `requestAnimationFrame`.
- Respects `prefers-reduced-motion` automatically.

## Accessibility

- The canvas has `role="img"` and an `aria-label`.
- The effect selector is a real `<select>` with `aria-label`.
- Reduced-motion users get static frames automatically.

## License

MIT — see [LICENSE](LICENSE). Free to use, modify, and distribute, including in commercial projects.

## Contributing

Contributions are welcome. Please read the guidelines below before opening a PR.

### Adding a new effect

1. Add the effect id to the `EffectId` union in `src/lib/ambient/types.ts`.
2. Implement the draw function in `src/lib/ambient/effects.ts`. Follow the existing pattern:
   - Define a particle interface.
   - Create a `createX()` factory that returns initial particle state.
   - Implement `drawX(props: EffectProps & { particles: X[] })`.
   - Register it with `withParticles("effectId", drawX)` in the `effects` array.
3. Add the effect to the `effects` export array.
4. Add it to the README effects table.
5. Test it in the dev server — switch to it via the dropdown and verify it runs smoothly.

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
