import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — WhataHotel",
  description: "Sign in to your WhataHotel account to see your saved hotels, trips and offers.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
