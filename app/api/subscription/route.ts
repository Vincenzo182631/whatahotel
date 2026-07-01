import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { store } from "@/lib/data/store";
import { toPublicUser, type MembershipTier, type Subscription } from "@/lib/data/types";
import { getPlan } from "@/lib/subscription/plans";
import { paymentService, crmService } from "@/lib/integrations";

export const runtime = "nodejs";

/** Change plan. Simulated billing — swap `paymentService` for Stripe later. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const plan = body.plan as MembershipTier;
  if (plan !== "free" && plan !== "premium")
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  const planDef = getPlan(plan);
  const now = new Date();
  const sub: Subscription = { ...user.subscription };

  if (plan === "free") {
    // Downgrade / cancel.
    await paymentService.cancelSubscription(user.id);
    sub.plan = "free";
    sub.status = "none";
    sub.renewsAt = null;
  } else {
    // Upgrade — mock charge + billing record.
    await paymentService.createCheckout({ userId: user.id, plan, amount: planDef.price });
    const renews = new Date(now);
    renews.setMonth(renews.getMonth() + 1);
    sub.plan = "premium";
    sub.status = "active";
    sub.since = now.toISOString();
    sub.renewsAt = renews.toISOString();
    sub.billing = [
      {
        id: randomUUID(),
        date: now.toISOString(),
        description: `${planDef.name} membership — ${planDef.interval}ly`,
        amount: planDef.price,
        status: "paid",
      },
      ...sub.billing,
    ];
  }

  const updated = await store.updateUser(user.id, { membership: plan, subscription: sub });
  await crmService.upsertContact({ email: user.email, name: user.name, tier: plan });

  return NextResponse.json({ user: updated ? toPublicUser(updated) : null });
}
