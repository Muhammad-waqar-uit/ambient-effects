export const metadata = {
  title: "About — Ambient Effects",
  description:
    "About the ambient-effects library: ambient canvas effects for Next.js pages. Built with Next.js 16, React 19, and TypeScript.",
};

export default function AboutPage() {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "64px 24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#171717",
        lineHeight: 1.7,
      }}
    >
      <header style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          About Ambient Effects
        </h1>
        <p style={{ fontSize: 18, color: "#525252", margin: 0 }}>
          A lightweight library of ambient canvas effects for Next.js pages.
        </p>
      </header>

      <section
        style={{
          background: "#f5f5f5",
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          Live demo
        </h2>
        <p style={{ margin: 0, marginBottom: 16 }}>
          Experience the effects in your browser:
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href="https://muhammad-waqar-uit.github.io/ambient-effects/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#2563eb",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            🌟 View live demo
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <a
            href="https://github.com/Muhammad-waqar-uit/ambient-effects"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#1f2937",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ flexShrink: 0 }}
            >
              <path d="M12 .5C6.5.5 2 4.5 2 10.5c0 6.5 6.5 12 10.5 12 2.5 0 4.8-.8 6.5-2.2c.5.2 1 .2 1.5-.1.5.3 1.2.3 1.7 0C19.2 20.3 21.5 19.5 24 19.5c0-6.5-6.5-12-10.5-12z" />
            </svg>
            View source on GitHub
          </a>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          What is it?
        </h2>
        <p style={{ margin: 0 }}>
          Ambient Effects is a small library of atmospheric canvas animations
          designed to sit behind page content and add a subtle, calming visual
          layer. It provides ten built-in effects — fireflies, snow, bubbles,
          confetti, constellation, stardust, embers, leaves, rain, and flow —
          each implemented as a lightweight particle system that renders to a{" "}
          <code>canvas</code> element via the Canvas 2D API.
        </p>
        <p style={{ margin: "16px 0 0" }}>
          The library is built for{" "}
          <a
            href="https://nextjs.org/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2563eb" }}
          >
            Next.js 16
          </a>{" "}
          and{" "}
          <a
            href="https://react.dev/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2563eb" }}
          >
            React 19
          </a>{" "}
          with TypeScript. It uses no runtime dependencies beyond React and
          Next.js itself.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          Features
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: 20,
            lineHeight: 1.8,
          }}
        >
          <li>10 built-in ambient effects with distinct visual styles.</li>
          <li>
            Fits inside any container — or use{" "}
            <code style={{ fontFamily: "monospace" }}>fullscreen</code> mode to
            fill the viewport.
          </li>
          <li>
            Respects the user&apos;s{" "}
            <code style={{ fontFamily: "monospace" }}>prefers-reduced-motion</code>{" "}
            preference automatically.
          </li>
          <li>Built-in effect switcher overlay (can be hidden via CSS).</li>
          <li>TypeScript types for all props and effect definitions.</li>
          <li>Zero runtime dependencies beyond React and Next.js.</li>
          <li>
            Accessible: canvas has <code>role=&quot;img&quot;</code> and an{" "}
            <code>aria-label</code>, and the selector is a real{" "}
            <code>&lt;select&gt;</code>.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          Installation
        </h2>
        <p style={{ margin: 0, marginBottom: 12 }}>
          The package is not yet published to npm. Until it is, the quickest way
          to try it is to clone the repo:
        </p>
        <pre
          style={{
            background: "#1f2937",
            color: "#e5e7eb",
            padding: 16,
            borderRadius: 8,
            overflow: "auto",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {`git clone https://github.com/Muhammad-waqar-uit/ambient-effects
cd ambient-effects
npm install
npm run dev`}
        </pre>
        <p style={{ margin: 0 }}>
          Once published, installation will be as simple as{" "}
          <code>npm install ambient-effects</code>.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          How to use
        </h2>
        <p style={{ margin: 0, marginBottom: 12 }}>
          Import <code>AmbientSurface</code> and drop it into a container:
        </p>
        <pre
          style={{
            background: "#1f2937",
            color: "#e5e7eb",
            padding: 16,
            borderRadius: 8,
            overflow: "auto",
            fontSize: 13,
          }}
        >
          {`import { AmbientSurface } from "ambient-effects";

export default function Page() {
  return (
    <main style={{ height: "100vh", overflow: "hidden" }}>
      <AmbientSurface defaultEffect="fireflies" />
    </main>
  );
}`}
        </pre>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          Built with
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: 20,
            lineHeight: 1.8,
          }}
        >
          <li>
            <a
              href="https://nextjs.org/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2563eb" }}
            >
              Next.js 16
            </a>{" "}
            — App Router, static export, TypeScript support
          </li>
          <li>
            <a
              href="https://react.dev/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2563eb" }}
            >
              React 19
            </a>{" "}
            — Client component with <code>requestAnimationFrame</code> loop
          </li>
          <li>
            <a
              href="https://tailwindcss.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2563eb" }}
            >
              Tailwind CSS v4
            </a>{" "}
            — Utility classes for the demo UI
          </li>
          <li>
            <a
              href="https://github.com/lukeed/clsx"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2563eb" }}
            >
              clsx
            </a>{" "}
            and{" "}
            <a
              href="https://github.com/dcastil/tailwind-merge"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2563eb" }}
            >
              tailwind-merge
            </a>{" "}
            — Class merging utility
          </li>
        </ul>
      </section>

      <footer
        style={{
          borderTop: "1px solid #e5e5e5",
          paddingTop: 24,
          marginTop: 16,
          color: "#737373",
          fontSize: 14,
        }}
      >
        <p style={{ margin: 0 }}>
          MIT Licensed — free to use, modify, and distribute, including in
          commercial projects.
        </p>
        <p style={{ margin: "8px 0 0" }}>
          Built by Muhammad-waqar-uit. Hosted on GitHub Pages.
        </p>
      </footer>
    </div>
  );
}
