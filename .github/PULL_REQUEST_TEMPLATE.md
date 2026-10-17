## What does this change?

<!-- One or two sentences. Link the issue if there is one: Closes #123 -->

## Type

- [ ] New effect
- [ ] Fix to an existing effect
- [ ] Public API change
- [ ] Documentation
- [ ] Performance
- [ ] Tooling / CI

## Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes with no new warnings
- [ ] `npm run build` passes
- [ ] Verified in a real browser (dark **and** light mode) — say which browser
- [ ] New props or effects are documented in `README.md` and listed on `/about`
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] No `@ts-ignore`, `// eslint-disable`, or loosened TS settings
- [ ] No new runtime dependencies

## For new effects

- [ ] Registered as `{ id, name, group, draw }` in the `effects` array
- [ ] Particle state uses the shared `withParticles` helper — no per-effect storage inside `draw`
- [ ] Palette adapts to `dark` / `light`
- [ ] Density honours `reducedMotion`
- [ ] Doesn't allocate per frame (no arrays, closures, or gradients created inside the draw loop)
- [ ] Added to the `EffectId` union and the `EffectGroup` it belongs to

## Screenshots / recordings

<!-- A short clip is the fastest way to review a visual change. -->
