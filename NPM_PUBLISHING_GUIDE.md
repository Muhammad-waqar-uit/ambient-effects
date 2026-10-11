# How to Publish a Package on npm (From Scratch to Updates)

This guide is designed for beginners. Follow these steps to create, structure, and publish your own npm package without needing AI help next time.

## 1. Prerequisites

Before you start, make sure you have:

- [Node.js & npm](https://nodejs.org/) installed (`node -v` and `npm -v`)
- [Git](https://git-scm.com/) installed (`git --version`)
- A [npm account](https://www.npmjs.com/signup)
- A code editor (VS Code, etc.)
- A Git repository host (GitHub/GitLab) — optional but recommended

## 2. Set Up Your npm Account Locally

1. Open your terminal and login:
   ```bash
   npm login
   ```

2. Enter your npm username, password, and email.
3. If you have 2FA (Two-Factor Authentication) enabled, you'll be asked for an OTP code from your authenticator app.

To verify you're logged in:
```bash
npm whoami
```

## 3. Create Your Project Structure

A well-structured package is easier to maintain and publish. Here's a common structure for a TypeScript package:

```text
my-package/
├── src/                # Source code
│   ├── index.ts        # Main entry point
│   └── ...             # Other modules
├── dist/               # Compiled output (for built packages)
├── package.json        # Package metadata
├── README.md           # Documentation
├── CHANGELOG.md        # Version history
├── LICENSE             # License file
├── .gitignore          # Files to ignore in git
├── .npmignore          # Files to ignore in npm (optional)
└── tsconfig.json       # TypeScript config (if using TS)
```

### For a simple JS package
You can skip `tsconfig.json` and write `.js` files in `src/` or root.

### For a TypeScript package (like this project)
You compile TS to JS in `dist/` and publish that, OR publish source (this project publishes `src/` directly with `"type": "module"`).

## 4. Initialize Git & npm

### Initialize Git
```bash
cd my-package
git init
git branch -M main
```

Create `.gitignore` with common entries:
```text
node_modules
dist
out
.next
.DS_Store
*.log
```

### Initialize npm
```bash
npm init
```

This will walk you through creating `package.json`. You can also do `npm init -y` and edit it later.

## 5. Write package.json Correctly

This is the most important file for publishing. Here’s a complete, realistic example for a TypeScript ESM package:

```json
{
  "name": "your-package-name",
  "version": "0.1.0",
  "private": false,
  "license": "MIT",
  "description": "Short description of what this package does",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "keywords": [
    "npm",
    "package",
    "typescript"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/your-package-name.git"
  },
  "homepage": "https://github.com/your-username/your-package-name#readme",
  "bugs": {
    "url": "https://github.com/your-username/your-package-name/issues"
  },
  "author": "Your Name <your.email@example.com>",
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --watch",
    "lint": "eslint src/",
    "check": "tsc --noEmit && npm run lint",
    "prepublishOnly": "npm run build"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Key fields explained

| Field | What it means |
|---|---|
| `name` | Unique name on npm (lowercase, no spaces). Use `@your-scope/name` for scoped packages. |
| `version` | Follow [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH` |
| `private` | Must be `false` to publish to npm |
| `main` | Entry point for CommonJS (older) |
| `module`/`exports` | Entry for ESM. `exports` is modern and recommended |
| `types` | TypeScript declaration file path |
| `files` | Which files/folders actually go to npm (prevents publishing node_modules, src, etc.) |
| `prepublishOnly` | Runs automatically before `npm publish` (ensures build is fresh) |
| `publishConfig.access` | Use `public` for unscoped packages |

> **Note:** This project publishes `src/` directly (no `dist/`). That's fine if you want source-only. For most packages, building to `dist/` is cleaner and safer.

## 6. Create Essential Files

### README.md
Explain what your package does, how to install, and how to use it. Include examples.

```markdown
# my-package

Short description.

## Installation
```bash
npm install my-package
```

## Usage
```js
import { something } from 'my-package'
something()
```
```

### CHANGELOG.md
Track version history. Use [Keep a Changelog](https://keepachangelog.com/) format.

```markdown
# Changelog

## [0.1.0] - 2026-10-12
### Added
- Initial release
```

### LICENSE
Pick a license (MIT is most common). For MIT:

```text
MIT License

Copyright (c) 2026 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

## 7. Write Your Code

Create `src/index.ts` (or `index.js`):

```ts
// src/index.ts
export function greet(name: string) {
  return `Hello, ${name}!`
}

export default greet
```

If using TypeScript, also create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

## 8. Test Locally Before Publishing

### Option A: `npm link` (symlink for local testing)
In your package directory:
```bash
npm link
```

In the test project:
```bash
npm link your-package-name
```

Now you can import and test it as if installed from npm.

### Option B: `npm pack` (create a tarball)
```bash
npm pack
```

This creates `your-package-name-0.1.0.tgz`. Install it in another project:
```bash
npm install /path/to/your-package-name-0.1.0.tgz
```

This is the closest thing to actually publishing.

## 9. Build (If Needed)

If you compile to `dist/`, build first:
```bash
npm run build
```

Check `dist/` contains `.js` and `.d.ts` files. Also verify with:
```bash
npx tsc --noEmit  # type check
```

## 10. Publish to npm

### First publish
```bash
npm publish
```

If your package is scoped (`@scope/name`) and you want it public:
```bash
npm publish --access public
```

With 2FA enabled, enter the OTP from your authenticator app when prompted.

If successful, you'll see:
```text
+ your-package-name@0.1.0
```

You can now view it at `https://www.npmjs.com/package/your-package-name`.

### Verify
Try installing it in a fresh project:
```bash
npm install your-package-name
```

## 11. Update & Publish New Versions

Every time you make changes and want to release them:

1. **Make your code changes**
2. **Update `CHANGELOG.md`** — document what changed under a new version
3. **Bump the version** (SemVer):

   ```bash
   # For bug fixes (backward compatible)
   npm version patch  # 0.1.0 -> 0.1.1

   # For new features (backward compatible)
   npm version minor  # 0.1.0 -> 0.2.0

   # For breaking changes
   npm version major  # 0.1.0 -> 1.0.0
   ```

   `npm version` automatically updates `package.json`, commits, and creates a git tag.

4. **Push to Git**:
   ```bash
   git push origin main --tags
   ```

5. **Publish**:
   ```bash
   npm publish
   ```

## 12. Common Issues & Fixes

| Issue | Cause | Fix |
|---|---|---|
| `You cannot publish over the previously published versions` | Version not bumped | Run `npm version patch/minor/major` |
| `403 Forbidden` | Package name taken (unscoped) | Use a unique name or scoped `@yourname/package` |
| `EOTP` / Needs OTP | 2FA is enabled | Enter OTP from authenticator app |
| `This package is private` | `private: true` in package.json | Set `private: false` |
| Files missing on npm | `files` array too strict or `.npmignore` blocking | Check `npm pack --dry-run` to see what will be published |
| Wrong entry point | `main`/`exports` wrong | Fix paths and republish with new version |

To preview what gets published:
```bash
npm pack --dry-run
```

## 13. Pro Tips

- **Use scoped packages** if you want to avoid name conflicts: `@waqar/ambient-effects`
- **Add `prepublishOnly`** to always build before publishing
- **Keep `CHANGELOG.md` updated** — users appreciate it
- **Tag releases on Git** (`npm version` does this automatically)
- **Test with `npm pack`** before your first real publish
- **Don't publish secrets** — check `.gitignore` and `.npmignore`

## Quick Checklist for Publishing

- [ ] `package.json` has correct `name`, `version`, `main`/`exports`, `files`
- [ ] `README.md`, `LICENSE`, `CHANGELOG.md` exist
- [ ] Code builds without errors (`npm run build` or `tsc`)
- [ ] Tested locally (`npm link` or `npm pack`)
- [ ] Committed to Git (`git add . && git commit -m "..."`)
- [ ] Logged into npm (`npm whoami`)
- [ ] Bumped version (`npm version minor/patch`)
- [ ] Pushed (`git push origin main --tags`)
- [ ] Published (`npm publish`)

**That's it. Follow this once and you'll be able to do it solo next time.**