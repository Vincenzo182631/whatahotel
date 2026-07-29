import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { store } from "@/lib/data/store";
import { LeadsCrm } from "@/components/dashboard/leads-crm";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

export default async function LeadsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/dashboard/leads");
  if (me.email.toLowerCase() !== ADMIN_EMAIL) redirect("/dashboard");

  const leads = await store.listLeads();
  return <LeadsCrm initialLeads={leads} />;
}
