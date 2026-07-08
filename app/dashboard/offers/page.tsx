import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { OffersView } from "@/components/dashboard/offers-view";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

export default async function OffersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/dashboard/offers");
  if (me.email.toLowerCase() !== ADMIN_EMAIL) redirect("/dashboard");
  return <OffersView />;
}
