# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of ambient-effects.
- `AmbientSurface` component with canvas-based ambient effects rendering.
- 10 built-in effects: fireflies, snow, bubbles, confetti, constellation, stardust, embers, leaves, rain, flow.
- Effect switching via inline `<select>` overlay.
- Fullscreen mode (`fullscreen` prop).
- Automatic `prefers-reduced-motion` respect with explicit `reduceMotion` override.
- TypeScript types for all public API surface.
- Next.js 16 + React 19 + TypeScript project setup.
- ESLint + TypeScript strict mode quality gates.
- Demo page at `/` with fireflies as default effect.

### Known issues

- The inline effect selector is rendered by default; hide via CSS if you don't want it.
- Particles persist across effect switches within the same canvas session; a full reset on switch is not yet implemented.
- No test suite yet — contributions adding Playwright or unit tests are welcome.
