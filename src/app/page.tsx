import { AmbientSurface } from "@/lib/ambient/ambient-surface";

export default function Home() {
  return (
    <main
      style={{
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <AmbientSurface defaultEffect="fireflies" />
    </main>
  );
}
