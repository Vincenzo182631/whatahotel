import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account — WhataHotel",
  description: "Join WhataHotel to save hotels, track trips and unlock advisor-exclusive perks.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
