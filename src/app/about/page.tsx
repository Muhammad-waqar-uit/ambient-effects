import Link from "next/link";
import { SiteHeader } from "@/components/ui/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata = {
  title: "About — ambient-effects",
  description:
    "Docs and install for ambient-effects: ten interactive ambient canvas effects for Next.js pages.",
};

const install = "npm install ambient-effects";

const usage = `import { AmbientSurface } from "ambient-effects";

export default function Page() {
  return (
    <main style={{ height: "100vh", overflow: "hidden" }}>
      <AmbientSurface defaultEffect="fireflies" fullscreen />
    </main>
  );
}`;

const effectsList = [
  ["Fireflies", "Soft glowing particles that drift toward your cursor and dim with your scroll."],
  ["Snow", "Layered snowfall with cursor repulsion, wind drift and scroll gusts."],
  ["Bubbles", "Rising translucent bubbles — click near one and it pops into a burst."],
  ["Confetti", "Falling rotating confetti that scatters away from the pointer."],
  ["Constellation", "Stars linked by lines, with extra lines reaching to your cursor."],
  ["Stardust", "Sparkling dust whose trails trail behind fast pointer movement."],
  ["Embers", "Rising glowing embers with intensity that ramps near the bottom of the canvas."],
  ["Leaves", "Drifting falling leaves with rotation, sway and mid-air tumbling."],
  ["Rain", "Heavy rain that pools into ripple puddles at varying landing heights."],
  ["Flow", "A flowing particle field drawing silky trails that swirl around your cursor."],
] as const;

const propsList = [
  ["defaultEffect", '"fireflies"', "Initial effect for the uncontrolled component."],
  ["effect", "EffectId", "Controlled effect id; makes the component fully controlled."],
  ["onEffectChange", "(id: EffectId) => void", "Called whenever the effect changes (buttons, select, arrow keys)."],
  ["showControls", "true", "Renders the built-in <select> picker in the top-right corner."],
  ["fullscreen", "false", "Canvas is sized to the viewport instead of its container."],
  ["dark", "true", "Dark-first theme like the reference; toggling re-inits the effect."],
  ["reduceMotion", "undefined", "Respects prefers-reduced-motion when unset; true halves particle density."],
  ["className", "—", "Extra classes for the wrapper div."],
  ["style", "—", "Inline styles for the wrapper div."],
] as const;

const interactionsList = [
  ["Move", "Particles react to cursor position and velocity; the hint fades the first time you move."],
  ["Click", "A burst of sparks fires at the pointer; nearby particles get shoved away; bubbles pop and rain splashes."],
  ["Scroll", "Scroll velocity slants particles; wind follows a sine of scroll progress, and the theme dims in light mode."],
  ["Arrow keys", "ArrowRight / ArrowLeft cycle through the ten effects."],
] as const;

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 pb-24">
        {/* Hero */}
        <section className="px-2 py-16 md:py-24">
          <Badge className="mb-4">Next.js 16 · React 19 · TypeScript</Badge>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Ten ambient canvas effects for Next.js pages
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground text-pretty">
            Drop <code className="rounded bg-chip px-1.5 py-0.5 text-sm">AmbientSurface</code> into any
            client page and get fireflies, snow, bubbles, rain — every effect reacts to the pointer,
            fires on click, and bends with scroll, matching the reference demo exactly.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" passHref>
              <Button size="lg">Open the live demo</Button>
            </Link>
            <a href="#install" className="inline-flex">
              <Button variant="outline" size="lg">
                Install
              </Button>
            </a>
            <a
              href="https://github.com/Muhammad-waqar-uit/ambient-effects"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button variant="ghost" size="lg">
                GitHub ↗
              </Button>
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interactive by default</CardTitle>
              <CardDescription>
                Pointer position and velocity, click bursts, scroll wind — no props to wire up.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verified rendering</CardTitle>
              <CardDescription>
                Colors dim in light mode, embers glow with additive blending, trails tint the canvas
                in Flow exactly like the reference page.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lightweight</CardTitle>
              <CardDescription>
                Zero runtime deps beyond React — a single client component you drop behind any UI.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* Effects grid */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">The effects</h2>
          <p className="mt-2 text-muted-foreground">
            Each renders on a single fixed canvas; switch from the dock, the select, or arrow keys.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {effectsList.map(([name, blurb]) => (
              <Card key={name}>
                <CardHeader>
                  <CardTitle className="text-base">{name}</CardTitle>
                  <CardDescription>{blurb}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Install */}
        <section id="install" className="mt-16 scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight">Install</h2>
          <CodeBlock className="mt-4" label="shell" code={install} />
          <CodeBlock className="mt-4" label="page.tsx" code={usage} />
        </section>

        {/* Props */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">Props</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Prop</th>
                  <th className="px-4 py-3 font-medium">Default</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {propsList.map(([prop, def, desc]) => (
                  <tr key={prop} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{prop}</td>
                    <td className="px-4 py-3 text-muted-foreground">{def}</td>
                    <td className="px-4 py-3 text-muted-foreground">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Interactions */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">Interactions</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {interactionsList.map(([n, blurb]) => (
              <Card key={n}>
                <CardHeader>
                  <CardTitle className="text-base">{n}</CardTitle>
                  <CardDescription>{blurb}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
