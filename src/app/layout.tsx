import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "45 Ambient Effects — ambient-effects",
  description:
    "45 interactive ambient canvas effects for Next.js and React: fireflies, snow, confetti, fireworks, aurora, starfall, hacker, space rocks, Saturn ring, emoji and more. Move, click and scroll.",
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
