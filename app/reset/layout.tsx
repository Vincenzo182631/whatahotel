import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset your password — WhataHotel",
  description: "Reset the password for your WhataHotel account.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
