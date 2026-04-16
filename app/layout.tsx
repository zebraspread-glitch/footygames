import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/TopBar";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "FootyArcade",
  description: "A clean AFL game hub inspired by retro daily guessing sites.",
  icons: {
    icon: "/favicon.ico", // or "/topbaricon.png"
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        {children}

        {/* THIS is what actually enables tracking */}
        <Analytics />
      </body>
    </html>
  );
}