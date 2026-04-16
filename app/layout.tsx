import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/TopBar";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";

export const metadata: Metadata = {
  title: "FootyArcade",
  description: "A clean AFL game hub inspired by retro daily guessing sites.",
  icons: {
    icon: "/favicon.ico",
  },
  other: {
    "google-adsense-account": "ca-pub-2276050414767400",
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
        <Script
          id="adsense-script"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2276050414767400"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <TopBar />
        {children}
        <Analytics />
      </body>
    </html>
  );
}