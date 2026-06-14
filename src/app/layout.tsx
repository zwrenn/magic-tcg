import type { Metadata } from "next";
import { Nunito, Fredoka, IBM_Plex_Mono, VT323 } from "next/font/google";
import { SiteChrome } from "@/components/site-chrome";
import { Footer } from "@/components/footer";
import { CardZoomProvider } from "@/components/card-zoom";
import { CursorSparkles } from "@/components/cursor-sparkles";
import "./globals.css";

// Nunito body · Fredoka bubbly headings · VT323 pixel counters.
const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});
const fredoka = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const vt323 = VT323({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Pod",
  description: "Ye olde shared commander collection — what does the pod already own?",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fredoka.variable} ${plexMono.variable} ${vt323.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/mana-font@1.17.0/css/mana.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/keyrune@latest/css/keyrune.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <CursorSparkles />
        <CardZoomProvider>
          <SiteChrome />
          {children}
          <Footer />
        </CardZoomProvider>
      </body>
    </html>
  );
}
