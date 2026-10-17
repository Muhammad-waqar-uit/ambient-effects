<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions

This is the **ambient-effects** package — a Next.js 16 + React 19 + TypeScript library of ambient canvas effects.

### Before you edit anything

1. Read the relevant source file first. The public API lives in [`src/index.ts`](src/index.ts). Effect implementations live in [`src/lib/ambient/effects.ts`](src/lib/ambient/effects.ts). Shared types live in [`src/lib/ambient/types.ts`](src/lib/ambient/types.ts).
2. Run the quality checks before finishing: `npx tsc --noEmit && npm run lint && npm run build`.
3. The package uses path alias `@/*` → `./src/*`. Imports in source use this alias.
4. `"use client"` directive is required for any component that touches browser APIs (canvas, `requestAnimationFrame`, `matchMedia`). AmbientSurface is a client component. Effect draw functions are plain functions that receive a `CanvasRenderingContext2D` — they are not React components.

### Effect implementation pattern

Each effect follows the same shape:

- A particle interface (e.g. `interface Firefly { x, y, vx, vy, ... }`).
- A `createX(w, h)` factory that returns initial particle state.
- A `drawX(props: EffectProps & { particles: X[] })` function.
- Registration: `{ id: "effectId", name: "Display Name", draw: withParticles("effectId", drawX) }` in the `effects` array.

The `withParticles` helper manages a persistent particle array per effect ID and resets it when the canvas resizes. Do not add per-effect particle storage inside the draw function itself.

### Documentation updates

Any change to public API surface (new props, new effects, removed props) must update:
- [`README.md`](README.md) — props table, effects table, examples.
- [`CHANGELOG.md`](CHANGELOG.md) — entry under `[Unreleased]`.

### Do not

- Do not add `@ts-ignore` or `// eslint-disable` without documenting why in the same commit.
- Do not loosen TypeScript strict mode.
- Do not add runtime dependencies without a clear reason (the package is intentionally lightweight).
- Do not commit `.next/`, `node_modules/`, or `*.tsbuildinfo`.

### Repo layout quick reference

```
src/
├── index.ts              # Public barrel export
├── lib/
│   ├── utils.ts          # cn() helper
│   └── ambient/
│       ├── types.ts      # EffectId, EffectProps, EffectDefinition, AmbientSurfaceProps
│       ├── ambient-surface.tsx   # Main "use client" component
│       └── effects.ts     # All 10 effect implementations
└── app/                  # Next.js demo app
```
