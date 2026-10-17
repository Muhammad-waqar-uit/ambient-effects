# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.5.x | ✅ |
| 0.4.x | ⚠️ security fixes only |
| < 0.4 | ❌ |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub's [Report a vulnerability](https://github.com/Muhammad-waqar-uit/ambient-effects/security/advisories/new) form. That opens a private advisory visible only to the maintainers.

Please include:

- the affected version (`npm ls ambient-effects`),
- a minimal reproduction (framework, bundler, browser, props used),
- the impact you believe it has,
- any suggested fix.

## What to expect

| Stage | Target |
| --- | --- |
| Acknowledgement | within 3 business days |
| Initial assessment | within 7 days |
| Fix or mitigation plan | within 30 days for confirmed issues |
| Public advisory | after a patched release, coordinated with you |

We'll credit you in the advisory unless you ask us not to.

## Scope

`ambient-effects` is a client-side canvas library. It does not make network requests, read cookies or storage, or evaluate user-supplied strings. The realistic attack surface is therefore small, but these are in scope:

- code execution or prototype pollution through exported helpers,
- denial of service caused by crafted props (for example a particle count that locks the main thread),
- supply-chain issues in the published tarball or its install scripts.

Out of scope:

- performance characteristics of a given effect on a given device,
- visual differences between browsers,
- vulnerabilities in your own application code that consumes the library,
- issues that require the attacker to already control your bundle.

## Dependency policy

The package has **zero runtime dependencies**. React is a peer dependency and Next.js plus the demo tooling are dev dependencies, so installing `ambient-effects` adds no transitive packages. We keep it that way on purpose: smaller supply-chain surface.
