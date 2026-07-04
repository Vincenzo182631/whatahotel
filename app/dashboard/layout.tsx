import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentPublicUser } from "@/lib/auth/session";
import { DashboardChrome } from "@/components/dashboard/dashboard-chrome";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login?next=/dashboard");
  const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL;
  return (
    <DashboardChrome user={user} isAdmin={isAdmin}>
      {children}
    </DashboardChrome>
  );
}
