import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved hotels — WhataHotel",
  description: "The hotels you've saved on WhataHotel, ready to compare.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
