"use client";

import { MapPin, CalendarDays, Wallet, Sparkles, Users } from "lucide-react";
import type { SearchCriteria } from "@/lib/services/types";

export function CriteriaBar({ criteria }: { criteria: SearchCriteria }) {
  const chips: { icon: typeof MapPin; label: string }[] = [];

  if (criteria.destinationLabel)
    chips.push({ icon: MapPin, label: criteria.destinationLabel.split(",")[0] });
  if (criteria.travelMonth || criteria.nights) {
    const parts = [
      criteria.travelMonth,
      criteria.nights ? `${criteria.nights} nights` : null,
    ].filter(Boolean);
    chips.push({ icon: CalendarDays, label: parts.join(" · ") });
  }
  if (criteria.budgetMax)
    chips.push({ icon: Wallet, label: `Up to $${criteria.budgetMax.toLocaleString()}/night` });
  if (criteria.occasion)
    chips.push({ icon: Sparkles, label: criteria.occasion });
  if (criteria.adults) {
    const g = [
      `${criteria.adults} adult${criteria.adults > 1 ? "s" : ""}`,
      criteria.children ? `${criteria.children} child${criteria.children > 1 ? "ren" : ""}` : null,
    ].filter(Boolean);
    chips.push({ icon: Users, label: g.join(", ") });
  }

  if (chips.length === 0) return null;

  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
      <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[#9a9a9a]">
        Trip
      </span>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1 text-xs capitalize text-[#555]"
        >
          <chip.icon className="size-3 text-[#9a9a9a]" />
          {chip.label}
        </span>
      ))}
    </div>
  );
}
