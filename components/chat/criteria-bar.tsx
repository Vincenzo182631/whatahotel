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
      <span className="shrink-0 text-[11px] uppercase tracking-wider text-foreground/40">
        Trip so far
      </span>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs capitalize text-foreground/80"
        >
          <chip.icon className="size-3 text-primary" />
          {chip.label}
        </span>
      ))}
    </div>
  );
}
