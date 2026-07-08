import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, TrendingUp } from "lucide-react";
import { getOffer, markOfferViewed, advisorLabel } from "@/lib/services/offers";
import { getCurrentUser } from "@/lib/auth/session";
import { ComparisonView } from "@/components/compare/comparison-view";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const offer = await getOffer(id);
  return {
    title: offer ? `Your ${offer.city} options — WhataHotel` : "Offer — WhataHotel",
    robots: { index: false }, // private, per-guest link
  };
}

export default async function OfferPage({ params }: Params) {
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) notFound();

  // Record the guest's view — but not the agent's own previews.
  const me = await getCurrentUser();
  const isAgent = me && me.email.toLowerCase() === ADMIN_EMAIL;
  if (!isAgent) await markOfferViewed(id);

  const advisor = advisorLabel(offer.agentName);
  const initials = (offer.agentName?.trim()?.[0] || "W").toUpperCase();

  return (
    <div className="min-h-dvh bg-white text-[#222]">
      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto" />
          </Link>
          <span className="text-xs font-medium text-[#717171]">Prepared just for you</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-8">
        {/* Agent intro */}
        <div className="rounded-3xl border border-[#EBEBEB] bg-gradient-to-br from-[#FF385C]/[0.06] to-transparent p-6 sm:p-8">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#FF385C]">
            <Sparkles className="size-3.5" /> A personal selection
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {offer.guestName ? `${offer.guestName}, your ${offer.city} shortlist` : `Your ${offer.city} shortlist`}
          </h1>
          <div className="mt-4 flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#FF385C] text-sm font-bold text-white">
              {initials || "W"}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1a1a1a]">{advisor}</p>
              {offer.note ? (
                <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-[#444]">{offer.note}</p>
              ) : (
                <p className="mt-1 text-[15px] leading-relaxed text-[#444]">
                  I&apos;ve put together these options for your dates — compare them below, and ask the advisor anything.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Live-rate honesty + gentle nudge */}
        <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-[#FF385C]/[0.06] px-3.5 py-2.5 text-[13px] text-[#8a3a4c]">
          <TrendingUp className="size-4 shrink-0 text-[#FF385C]" />
          Rates are live for your dates and can rise as your trip nears — reserve to lock in today&apos;s rate.
        </p>

        <div className="mt-6">
          <ComparisonView hotelIds={offer.hotelIds} checkIn={offer.checkIn} checkOut={offer.checkOut} />
        </div>

        <p className="mt-10 text-center text-xs text-[#9a9a9a]">
          Questions? Reply to the email from {advisor}, or ask the advisor above. Powered by WhataHotel.
        </p>
      </main>
    </div>
  );
}
