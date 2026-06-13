import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { Header } from "@/components/header";
import { CardZoomProvider } from "@/components/card-zoom";
import "./globals.css";

// Tamber pairing: Inter for body, IBM Plex Mono for chrome / headings / labels.
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
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CardZoomProvider>
          <Header />
          {children}
        </CardZoomProvider>
      </body>
    </html>
  );
}
