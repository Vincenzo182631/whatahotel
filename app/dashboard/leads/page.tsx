import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { store } from "@/lib/data/store";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

export default async function LeadsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/dashboard/leads");
  if (me.email.toLowerCase() !== ADMIN_EMAIL) redirect("/dashboard");

  const leads = await store.listLeads();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
      <p className="mt-1 text-sm text-[#717171]">
        {leads.length} {leads.length === 1 ? "person has" : "people have"} signed up from the chat.
      </p>

      {leads.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-[#EBEBEB] bg-white p-8 text-center text-sm text-[#717171]">
          No leads yet. They'll appear here as visitors sign up at the chat gate.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-[#EBEBEB] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#EBEBEB] text-left text-xs uppercase tracking-wide text-[#717171]">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Trip</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-[#F2F2F2] last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-[#1a1a1a]">
                    {[l.firstName, l.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${l.email}`} className="text-[#FF385C] hover:underline">{l.email}</a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#555]">
                    {l.city || "—"}
                    {l.checkIn && l.checkOut ? (
                      <span className="block text-xs text-[#9a9a9a]">
                        {fmt(l.checkIn)} → {fmt(l.checkOut)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-xs capitalize text-[#555]">
                      {l.source.replace("-", " ")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#717171]">{fmt(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
