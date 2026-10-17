import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "36 Ambient Effects — ambient-effects",
  description:
    "Interactive ambient canvas effects: fireflies, snow, bubbles, confetti, ambient, big circles, fireworks, fountain, matrix, sea anemone, aurora, nebula, starfall and more. Move, click and scroll.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
