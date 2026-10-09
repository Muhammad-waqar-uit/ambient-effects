# ambient-effects

A lightweight, zero-dependency (except React/Next) library of ambient canvas effects for Next.js pages. Drop it in and pick an effect — fireflies, snow, bubbles, confetti, constellation, stardust, embers, leaves, rain, or flow.

Built for **Next.js 16** + **React 19** + **TypeScript**. Zero runtime dependencies beyond React and Next.js.

[![npm version](https://img.shields.io/npm/v/ambient-effects)](https://www.npmjs.com/package/ambient-effects)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub pages](https://img.shields.io/github/deployments/Muhammad-waqar-uit/ambient-effects/github-pages?label=github%20pages)](https://muhammad-waqar-uit.github.io/ambient-effects/)

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

Open `http://localhost:3000` — the homepage renders the fireflies effect with a live effect switcher in the top-right corner.

## Usage

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultEffect` | `EffectId` | `"fireflies"` | Initial effect to display. |
| `fullscreen` | `boolean` | `false` | When `true`, the canvas fills the viewport (`fixed inset-0`) instead of the parent container. |
| `reduceMotion` | `boolean` | `undefined` | Explicit override for the user's motion preference. When `undefined`, respects `prefers-reduced-motion`. When `true`, effects render static frames. |
| `className` | `string` | — | CSS class applied to the canvas wrapper. |
| `style` | `React.CSSProperties` | — | Inline styles applied to the canvas wrapper. |

### Effects

The built-in effects are:

| Effect | Description |
|--------|-------------|
| `fireflies` | Soft glowing particles drifting with sine-wave motion. |
| `snow` | Gentle snowfall with wobble and highlight dots. |
| `bubbles` | Rising translucent bubbles with outer glow and specular highlight. |
| `confetti` | Falling colored rectangles with rotation, gravity, and fade. |
| `constellation` | Stars with lines connecting nearby points and twinkle. |
| `stardust` | Small fading stars with radial glow, wrapping around edges. |
| `embers` | Rising embers with glow, sine drift, and lifetime fade. |
| `leaves` | Drifting leaves falling with rotation and wind sway. |
| `rain` | Diagonal rain streaks. |
| `flow` | Horizontal flowing particles with trailing glow. |

### Effect switching

The component includes an inline `<select>` that lets users switch effects live. It is rendered by default (positioned top-right with `z-10`). You can hide it via CSS:

```css
.ambient-surface select {
  display: none;
}
```

Or remove it from the component — see [Contributing](#contributing) for how to customize the overlay.

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

When reduced motion is active, each effect draws a single static frame (no animation loop updates).

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
