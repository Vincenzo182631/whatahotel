"use client";

import { Check, Crown } from "lucide-react";
import { useAuth, useChangePlan } from "@/hooks/use-auth";
import { Card, PageHeader, PremiumBadge } from "@/components/dashboard/ui";
import { PLANS, getPlan } from "@/lib/subscription/plans";
import { formatCurrency, cn } from "@/lib/utils";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const changePlan = useChangePlan();
  if (!user) return null;

  const current = user.membership;
  const plan = getPlan(current);

  return (
    <>
      <PageHeader
        title="Subscription"
        subtitle="Manage your membership, billing and plan."
        action={<PremiumBadge tier={current} />}
      />

      {/* Current plan summary */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#717171]">Current plan</p>
            <p className="mt-1 text-lg font-semibold">{plan.name}</p>
            <p className="text-sm text-[#717171]">
              {current === "premium"
                ? `Renews ${user.subscription.renewsAt ? new Date(user.subscription.renewsAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—"}`
                : "You're on the free plan."}
            </p>
          </div>
          <p className="text-right">
            <span className="text-2xl font-semibold">{plan.price ? formatCurrency(plan.price) : "Free"}</span>
            {plan.price > 0 && <span className="text-sm text-[#717171]">/{plan.interval}</span>}
          </p>
        </div>
      </Card>

      {/* Plans */}
      <div className="grid gap-5 lg:grid-cols-2">
        {PLANS.map((p) => {
          const isCurrent = p.id === current;
          return (
            <Card
              key={p.id}
              className={cn(
                "flex flex-col",
                p.highlight && "border-[#FF385C]/40 ring-1 ring-[#FF385C]/20",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  {p.highlight && <Crown className="size-5 text-[#FF385C]" />}
                  {p.name}
                </h3>
                {isCurrent && <PremiumBadge tier={p.id} />}
              </div>
              <p className="mt-1 text-sm text-[#717171]">{p.tagline}</p>
              <p className="mt-3">
                <span className="text-3xl font-semibold">{p.price ? formatCurrency(p.price) : "Free"}</span>
                {p.price > 0 && <span className="text-sm text-[#717171]">/{p.interval}</span>}
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-[#222]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#FF385C]" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-xl border border-[#EBEBEB] px-4 py-2.5 text-sm font-semibold text-[#717171]"
                  >
                    Current plan
                  </button>
                ) : p.id === "premium" ? (
                  <button
                    onClick={() => changePlan.mutate("premium")}
                    disabled={changePlan.isPending}
                    className="w-full rounded-xl bg-[#FF385C] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {changePlan.isPending ? "Processing…" : "Upgrade to Premium"}
                  </button>
                ) : (
                  <button
                    onClick={() => changePlan.mutate("free")}
                    disabled={changePlan.isPending}
                    className="w-full rounded-xl border border-[#DDDDDD] px-4 py-2.5 text-sm font-semibold text-[#222] hover:bg-[#f7f7f7] disabled:opacity-60"
                  >
                    Downgrade to Free
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Billing history */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-[#717171]">
        Billing history
      </h2>
      <Card className="p-0">
        {user.subscription.billing.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EBEBEB] text-left text-xs uppercase tracking-wide text-[#717171]">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {user.subscription.billing.map((b) => (
                <tr key={b.id} className="border-b border-[#f2f2f2] last:border-0">
                  <td className="px-5 py-3">{new Date(b.date).toLocaleDateString()}</td>
                  <td className="px-5 py-3">{b.description}</td>
                  <td className="px-5 py-3 font-medium">{formatCurrency(b.amount)}</td>
                  <td className="px-5 py-3 capitalize text-[#008a05]">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-6 text-sm text-[#717171]">No billing history yet.</p>
        )}
      </Card>
    </>
  );
}
