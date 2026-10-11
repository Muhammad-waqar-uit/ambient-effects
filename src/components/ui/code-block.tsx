"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  className,
  label,
}: {
  code: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative overflow-x-auto rounded-xl border border-border bg-card",
        className,
      )}
    >
      {label && (
        <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">{label}</div>
      )}
      <pre className="flex-1 overflow-x-auto p-4 text-sm text-foreground/90">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="absolute top-2 right-2 rounded-md border border-border bg-background/70 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:bg-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
