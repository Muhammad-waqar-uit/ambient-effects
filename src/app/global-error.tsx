"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Replaces the root layout when an error escapes it, so this file ships its own
 * <html>/<body> and inline styles — no dependency on globals.css or Tailwind.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" data-theme="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(900px 500px at 50% -10%, #1a1330 0%, #05060a 55%, #000 100%)",
          color: "#f5f5f8",
          fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Helvetica, Arial, sans-serif',
        }}
      >
        <main style={{ maxWidth: 560, padding: "48px 24px", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              color: "rgba(245,245,248,0.45)",
            }}
          >
            Fatal error
          </p>
          <h1 style={{ margin: "16px 0 0", fontSize: 40, letterSpacing: "-0.03em" }}>
            The surface went dark.
          </h1>
          <p style={{ margin: "12px 0 0", color: "rgba(245,245,248,0.6)", lineHeight: 1.6 }}>
            Something failed before the page could render. Reloading usually fixes it;
            if not, there is a digest below for the bug report.
          </p>
          {error.digest && (
            <p
              style={{
                margin: "12px 0 0",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                color: "rgba(245,245,248,0.35)",
              }}
            >
              digest: {error.digest}
            </p>
          )}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => retry()}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: 0,
                background: "#fff",
                color: "#000",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Back to the effects
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
