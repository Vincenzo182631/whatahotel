import { Sparkles, type LucideIcon } from "lucide-react";
import { splitPerks } from "@/lib/perks";
import { cn } from "@/lib/utils";

/**
 * The "Exclusive Complimentary Perks" section, shared across the stay + hotel
 * pages so it's always consistent: one caption, a single stacked column of
 * headline perks, and any fine-print conditions demoted to a smaller note.
 */
export function PerksList({
  perks,
  subtitle,
  icon: Icon,
  headingClassName = "text-lg font-semibold",
  className,
}: {
  perks: (string | { label?: string })[];
  subtitle?: string;
  icon?: LucideIcon;
  headingClassName?: string;
  className?: string;
}) {
  const { perks: items, conditions } = splitPerks(perks);
  if (!items.length && !conditions.length) return null;

  return (
    <section className={className}>
      <h2 className={cn("flex items-center gap-2", headingClassName)}>
        {Icon && <Icon className="size-5 text-[#FF385C]" />}
        Exclusive Complimentary Perks
      </h2>
      {subtitle && <p className="mt-1 text-sm text-[#9a9a9a]">{subtitle}</p>}

      {/* Headline perks — one column, stacked. */}
      <ul className="mt-3 space-y-1.5">
        {items.map((p) => (
          <li key={p} className="flex gap-2 text-sm text-[#333]">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-[#FF385C]" strokeWidth={1.5} />
            <span className="leading-snug">{p}</span>
          </li>
        ))}
      </ul>

      {/* Conditions / fine-print — smaller, so they read as terms, not perks. */}
      {conditions.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-black/[0.06] pt-2.5">
          {conditions.map((c) => (
            <li key={c} className="text-[11px] leading-snug text-[#9a9a9a]">
              {c}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
