import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WhataHotel — Your AI Luxury Travel Advisor",
  description:
    "Tell us how you want to feel. WhataHotel's AI advisor curates the world's finest hotels, explains every choice, and books it all — with advisor-exclusive perks.",
  keywords: [
    "luxury hotels",
    "AI travel advisor",
    "WhataHotel",
    "luxury travel",
    "hotel booking",
  ],
  openGraph: {
    title: "WhataHotel — Your AI Luxury Travel Advisor",
    description:
      "An expert luxury travel advisor, powered by AI. From inspiration to booking, in conversation.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#B74F54",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <div className="aurora" aria-hidden />
        <div className="grain" aria-hidden />
        <Providers>
          <div className="relative z-10">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
