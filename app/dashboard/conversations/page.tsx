import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ConversationsView } from "@/components/dashboard/conversations-view";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

export default async function ConversationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/dashboard/conversations");
  if (me.email.toLowerCase() !== ADMIN_EMAIL) redirect("/dashboard");
  return <ConversationsView />;
}
