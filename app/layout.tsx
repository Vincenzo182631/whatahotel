import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const sans = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WhataHotel — Search, Rank & Compare the Best Luxury Hotels",
  description:
    "Tell WhataHotel a city and what matters to you. Our AI advisor searches the finest hotels, ranks them out of 10 for your needs, and helps you compare the top picks side by side — with advisor-exclusive perks.",
  keywords: [
    "luxury hotels",
    "AI travel advisor",
    "WhataHotel",
    "luxury travel",
    "hotel booking",
  ],
  openGraph: {
    title: "WhataHotel — Search, Rank & Compare the Best Luxury Hotels",
    description:
      "Search a city's finest hotels, ranked out of 10 for your needs, and compared side by side — powered by AI, in conversation.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF385C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={sans.variable}>
        <div className="aurora" aria-hidden />
        <div className="grain" aria-hidden />
        <Providers>
          <div className="relative z-10">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
