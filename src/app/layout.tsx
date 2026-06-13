import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Cinzel, Cinzel_Decorative } from "next/font/google";
import { Header } from "@/components/header";
import { CardZoomProvider } from "@/components/card-zoom";
import "./globals.css";

// Inter body · IBM Plex Mono chrome/labels · Cinzel fantasy serif for titles.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const cinzel = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});
const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-ornate",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Pod",
  description: "What does the pod already own? Card sharing for our MTG playgroup.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plexMono.variable} ${cinzel.variable} ${cinzelDecorative.variable} h-full antialiased`}
    >
      <head>
        {/* Authentic MTG mana symbols (mana-font) + set symbols (keyrune) */}
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
        <CardZoomProvider>
          <Header />
          {children}
        </CardZoomProvider>
      </body>
    </html>
  );
}
