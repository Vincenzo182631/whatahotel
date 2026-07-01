import Link from "next/link";
import { ArrowRight, Crown, Luggage, Sparkles, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { store } from "@/lib/data/store";
import { getPlan } from "@/lib/subscription/plans";
import { Card, PageHeader, StatCard, PremiumBadge } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/dashboard/profile", label: "My Profile", desc: "Personal & contact details", icon: User },
  { href: "/dashboard/trips", label: "My Trips", desc: "Upcoming & past stays", icon: Luggage },
  { href: "/dashboard/assistant", label: "AI Assistant", desc: "Plan a full itinerary", icon: Sparkles },
  { href: "/dashboard/subscription", label: "Subscription", desc: "Plan & billing", icon: Crown },
];

export default async function DashboardOverview() {
  const user = await getCurrentUser();
  if (!user) return null;
  const trips = await store.listTrips(user.id);
  const now = Date.now();
  const upcoming = trips.filter((t) => new Date(t.checkOut).getTime() >= now);
  const past = trips.filter((t) => new Date(t.checkOut).getTime() < now);
  const plan = getPlan(user.membership);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        subtitle="Here's everything about your travel, all in one place."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Membership"
          value={<PremiumBadge tier={user.membership} />}
          hint={plan.name}
        />
        <StatCard label="Upcoming trips" value={upcoming.length} hint="Reservations ahead" />
        <StatCard label="Past trips" value={past.length} hint="Travel history" />
        <StatCard
          label="Renewal"
          value={user.subscription.renewsAt ? new Date(user.subscription.renewsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
          hint={user.membership === "premium" ? "Next billing" : "No active plan"}
        />
      </div>

      {user.membership === "free" && (
        <Card className="mt-5 flex flex-wrap items-center justify-between gap-4 border-[#FF385C]/30 bg-[#FF385C]/[0.04]">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <Crown className="size-4 text-[#FF385C]" /> Upgrade to Premium
            </p>
            <p className="mt-1 text-sm text-[#717171]">
              Unlock the AI Travel Advisor, monthly promotions, a personal advisor and 24/7 support.
            </p>
          </div>
          <Link
            href="/dashboard/subscription"
            className="rounded-full bg-[#FF385C] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            See plans
          </Link>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-[#717171]">
        Quick access
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="flex items-center gap-4 transition-shadow hover:shadow-[0_6px_20px_-10px_rgba(0,0,0,0.15)]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FF385C]/10 text-[#FF385C]">
                <l.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.label}</p>
                <p className="text-sm text-[#717171]">{l.desc}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-[#717171]" />
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
