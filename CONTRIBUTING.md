# Contributing to ambient-effects

Thanks for your interest in contributing. This doc covers how to set up the project, the process for contributing, and the standards we expect.

## Getting started

```bash
git clone https://github.com/ambient-effects/ambient-effects
cd ambient-effects
npm install
npm run dev
```

Open `http://localhost:3000`. The page renders the fireflies effect with a live effect switcher.

## Prerequisites

- **Node.js** — a recent LTS version supported by Next.js 16.
- **npm** — the project uses npm. The lockfile is committed; keep it updated.
- **Git** — for cloning and pushing.

## Quality gates

Before any change lands, the following must pass locally:

```bash
npx tsc --noEmit        # TypeScript strict mode
npm run lint            # ESLint (eslint-config-next)
npm run build           # Next.js production build
```

Run all three in sequence. A change that breaks any one of them is not ready.

## Project conventions

### Code style

- TypeScript in strict mode. No `any` unless absolutely necessary and documented.
- ESLint with `eslint-config-next` (TypeScript + core web vitals). The config lives in `eslint.config.mjs`.
- No `@ts-ignore`, no `// eslint-disable` unless you document why in the same commit and the team approves.
- React components use the `"use client"` directive when they consume browser APIs (canvas, animation frame, matchMedia). AmbientSurface is a client component; effects logic is plain functions that receive a canvas context.

### File organization

- Public API exports from `src/index.ts` only. Internal modules are not part of the package contract.
- Effect implementations live in `src/lib/ambient/effects.ts`. Each effect follows the same shape: a particle interface, a factory function, and a draw function that receives `EffectProps & { particles: T[] }`.
- Shared types live in `src/lib/ambient/types.ts`.

### Naming

- Files: `kebab-case` for config files, `camelCase` for TypeScript source files matching their primary export.
- Effects: named with a noun (fireflies, snow, bubbles, etc.) matching the `EffectId` union.

### Commits

- Use clear, imperative commit messages: "Add snow effect", "Fix reduced-motion static frame", not "fixed stuff".
- One logical change per commit.

## Adding a new effect

1. Add the new id to the `EffectId` union in `src/lib/ambient/types.ts`.
2. In `src/lib/ambient/effects.ts`:
   - Define a particle interface for the effect.
   - Add a `createX()` factory that returns initial particle state given width/height.
   - Implement `drawX(props: EffectProps & { particles: X[] })`.
   - Register it: `{ id: "newEffect", name: "New Effect", draw: withParticles("newEffect", drawX) }` in the `effects` array.
3. Add the effect to the README effects table.
4. Add a changelog entry under `[Unreleased]`.
5. Test it in the dev server.

## Reporting bugs

Open an issue with:
- Effect name.
- Browser + OS version.
- Dev or production build.
- Steps to reproduce or a description of the visual issue.
- Screenshot or screen recording if relevant.

## Suggesting features

Open an issue describing:
- The use case.
- Why it belongs in the core library vs a custom wrapper.
- Any constraints (performance, bundle size, browser support).

## License

By contributing, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE).

## Getting help

Open an issue for questions, bug reports, or feature suggestions. For usage questions, include your code snippet and the effect you're trying to use.
