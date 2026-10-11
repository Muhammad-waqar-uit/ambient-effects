import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "10 Ambient Effects — ambient-effects",
  description:
    "A single verbatim replica page: fireflies, snow, bubbles, confetti, constellation, stardust, embers, leaves, rain and flow. Move, click and scroll.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
