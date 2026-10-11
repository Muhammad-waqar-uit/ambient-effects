import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          ambient-effects
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-chip hover:text-foreground"
          >
            Demo
          </Link>
          <a
            href="https://github.com/Muhammad-waqar-uit/ambient-effects"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-chip hover:text-foreground"
          >
            GitHub ↗
          </a>
          <a
            href="https://www.npmjs.com/package/ambient-effects"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-chip hover:text-foreground"
          >
            npm ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
