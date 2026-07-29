import Link from "next/link";
import {
  Users,
  Tag,
  MessagesSquare,
  Eye,
  ArrowRight,
  Plus,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { store } from "@/lib/data/store";
import { listOffers, type Offer } from "@/lib/services/offers";
import { listConversations } from "@/lib/services/conversation-log";
import { Card, PageHeader, StatCard } from "@/components/dashboard/ui";
import type { PublicUser } from "@/lib/data/types";

const DAY = 86_400_000;

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const OFFER_BADGE: Record<Offer["status"], { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-black/[0.06] text-[#717171]" },
  sent: { label: "Sent", cls: "bg-[#2F6FED]/10 text-[#2F6FED]" },
  viewed: { label: "Viewed", cls: "bg-[#1CA672]/12 text-[#0E8F5E]" },
};

function StatusBadge({ status }: { status: Offer["status"] }) {
  const b = OFFER_BADGE[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.cls}`}>
      {b.label}
    </span>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Admin landing page — a business snapshot for the advisor: leads, offers and
 * live conversations at a glance, the items that need attention, and quick
 * actions. Replaces the traveller-style "Welcome back" home for the admin.
 */
export async function AdminOverview({ user }: { user: PublicUser }) {
  const [leads, offers, conversations] = await Promise.all([
    store.listLeads(),
    listOffers(200),
    listConversations(200),
  ]);

  const weekAgo = Date.now() - 7 * DAY;
  const leadsThisWeek = leads.filter((l) => new Date(l.createdAt).getTime() >= weekAgo).length;
  const sentOffers = offers.filter((o) => o.status === "sent" || o.status === "viewed");
  const viewedOffers = offers.filter((o) => o.status === "viewed");
  const totalViews = offers.reduce((n, o) => n + (o.viewCount || 0), 0);
  const needReply = conversations.filter((c) => c.needsAgent);

  const recentLeads = leads.slice(0, 5);
  const recentOffers = offers.slice(0, 5);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        subtitle="Your advisor desk — leads, offers and live chats at a glance."
        action={
          <Link
            href="/dashboard/offers"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FF385C] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="size-4" /> New offer
          </Link>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Leads" value={leads.length} hint={`${leadsThisWeek} new this week`} />
        <StatCard label="Offers sent" value={sentOffers.length} hint={`${viewedOffers.length} opened by guests`} />
        <StatCard label="Offer views" value={totalViews} hint="across all shared links" />
        <StatCard
          label="Conversations"
          value={conversations.length}
          hint={needReply.length ? `${needReply.length} awaiting a reply` : "all handled"}
        />
      </div>

      {/* Needs attention */}
      {needReply.length > 0 && (
        <Card className="mt-5 border-[#FF385C]/25 bg-[#FF385C]/[0.04]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#FF385C]" />
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">
                  {needReply.length} conversation{needReply.length > 1 ? "s" : ""} asked for a human
                </p>
                <p className="mt-0.5 text-sm text-[#717171]">
                  {needReply
                    .slice(0, 3)
                    .map((c) => c.name || c.email || c.city || "a guest")
                    .join(", ")}
                  {needReply.length > 3 ? ` +${needReply.length - 3} more` : ""}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/conversations"
              className="shrink-0 rounded-full border border-[#FF385C]/40 bg-white px-3.5 py-1.5 text-sm font-semibold text-[#FF385C] hover:bg-[#FF385C]/[0.06]"
            >
              Reply
            </Link>
          </div>
        </Card>
      )}

      {/* Recent leads + recent offers */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a]">
              <Users className="size-4 text-[#FF385C]" /> Recent leads
            </h2>
            <Link href="/dashboard/leads" className="inline-flex items-center gap-1 text-xs font-medium text-[#FF385C] hover:underline">
              All leads <ArrowRight className="size-3" />
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#9a9a9a]">No leads yet — they appear as visitors sign up at the chat.</p>
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {recentLeads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#222]">
                      {[l.firstName, l.lastName].filter(Boolean).join(" ") || l.email}
                    </p>
                    <p className="truncate text-xs text-[#717171]">
                      {l.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" /> {l.city}
                        </span>
                      ) : (
                        l.email
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[#9a9a9a]">{timeAgo(new Date(l.createdAt).getTime())}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a]">
              <Tag className="size-4 text-[#FF385C]" /> Recent offers
            </h2>
            <Link href="/dashboard/offers" className="inline-flex items-center gap-1 text-xs font-medium text-[#FF385C] hover:underline">
              All offers <ArrowRight className="size-3" />
            </Link>
          </div>
          {recentOffers.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#9a9a9a]">No offers yet — build one from a hotel comparison.</p>
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {recentOffers.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#222]">
                      {o.guestName ? `For ${o.guestName}` : o.city || "Comparison"}
                    </p>
                    <p className="truncate text-xs text-[#717171]">
                      {o.hotelIds.length} hotels{o.city ? ` · ${o.city}` : ""}
                      {o.viewCount ? ` · ${o.viewCount} view${o.viewCount > 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {o.status === "viewed" && <Eye className="size-3.5 text-[#0E8F5E]" />}
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/", label: "Open advisor", icon: MessagesSquare },
          { href: "/dashboard/offers", label: "Offers", icon: Tag },
          { href: "/dashboard/leads", label: "Leads (CRM)", icon: Users },
          { href: "/dashboard/conversations", label: "Conversations", icon: MessagesSquare },
        ].map((a) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className="flex items-center gap-2 rounded-2xl border border-[#EBEBEB] bg-white px-4 py-3 text-sm font-medium text-[#222] transition-colors hover:border-[#FF385C]/40 hover:bg-[#FF385C]/[0.03]"
          >
            <a.icon className="size-4 text-[#FF385C]" /> {a.label}
          </Link>
        ))}
      </div>
    </>
  );
}
