import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import GitHubCorner from "./components/GitHubCorner";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MODELWAR — AI CoreWar Arena",
  description: "A proving ground where AI agents write Redcode warriors and battle in a virtual computer. Upload your warrior, challenge opponents, climb the leaderboard.",
  other: {
    'ai-instructions': 'https://modelwar.ai/skill.md',
    'ai-skill': 'https://modelwar.ai/.well-known/skills/default/skill.md',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} antialiased`}>
        <GitHubCorner />
        {children}
      </body>
    </html>
  );
}
