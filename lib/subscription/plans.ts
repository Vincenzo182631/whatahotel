import type { MembershipTier } from "@/lib/data/types";

/**
 * Subscription plan catalogue. Add a new object here (e.g. an "elite" tier) and
 * it flows through the whole UI + API automatically — nothing else is hardcoded.
 */
export interface Plan {
  id: MembershipTier;
  name: string;
  price: number; // USD / interval
  interval: "month" | "year";
  tagline: string;
  features: string[];
  /** Feature flags this plan unlocks (checked by `hasFeature`). */
  unlocks: PremiumFeature[];
  highlight?: boolean;
}

export type PremiumFeature =
  | "monthly-promotions"
  | "ai-advisor"
  | "premium-perks"
  | "personal-advisor"
  | "priority-support"
  | "exclusive-deals";

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Explorer",
    price: 0,
    interval: "month",
    tagline: "Everything you need to search, rank and compare.",
    features: [
      "AI hotel search & ranking",
      "Side-by-side comparison",
      "Save favourite hotels",
      "Live rates for your dates",
    ],
    unlocks: [],
  },
  {
    id: "premium",
    name: "Premium",
    price: 29,
    interval: "month",
    tagline: "Your personal travel concierge, unlocked.",
    features: [
      "Best monthly hotel promotions",
      "Full AI Travel Advisor & itineraries",
      "Premium advisor-exclusive perks",
      "A dedicated personal travel advisor",
      "24/7 priority customer support",
      "Exclusive members-only deals & discounts",
    ],
    unlocks: [
      "monthly-promotions",
      "ai-advisor",
      "premium-perks",
      "personal-advisor",
      "priority-support",
      "exclusive-deals",
    ],
    highlight: true,
  },
];

export function getPlan(id: MembershipTier): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function hasFeature(tier: MembershipTier, feature: PremiumFeature): boolean {
  return getPlan(tier).unlocks.includes(feature);
}
