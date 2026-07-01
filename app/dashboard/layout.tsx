import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentPublicUser } from "@/lib/auth/session";
import { DashboardChrome } from "@/components/dashboard/dashboard-chrome";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login?next=/dashboard");
  return <DashboardChrome user={user}>{children}</DashboardChrome>;
}
