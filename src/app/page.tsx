import { AmbientSurface } from "@/lib/ambient/ambient-surface";

export const metadata = {
  title: "Ambient Effects — Demo",
  description: "Live demo of ambient canvas effects. Switch between fireflies, snow, bubbles, confetti, and more.",
};

export default function Home() {
  return (
    <div style={{ height: "100vh", overflow: "hidden", position: "relative" }}>
      <AmbientSurface defaultEffect="fireflies" />
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          zIndex: 20,
          background: "rgba(255,255,255,0.9)",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          pointerEvents: "none",
        }}
      >
        <a
          href="https://muhammad-waqar-uit.github.io/ambient-effects/about"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
        >
          About this project →
        </a>
      </div>
    </div>
  );
}
