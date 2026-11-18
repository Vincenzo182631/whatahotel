import { Check } from "lucide-react";

// Online bookings carry a $10.95 transaction fee (confirmed by Greg, Nov 2026), so
// never claim "no booking fees" here.
const FEATURES = [
  "Advisor perks included",
  "Direct hotel rates",
  "Real luxury inventory",
];

export function FeatureCallout() {
  return (
    <section className="container pb-8">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-3xl border border-primary/15 bg-primary/[0.04] px-6 py-5 text-center">
        {FEATURES.map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-2 text-sm text-foreground/75"
          >
            <Check className="size-4 text-primary" strokeWidth={1.5} />
            {f}
          </span>
        ))}
      </div>
    </section>
  );
}
