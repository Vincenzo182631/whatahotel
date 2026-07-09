"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Scale, X, AlertCircle } from "lucide-react";
import { useCompareSelection, MAX_COMPARE } from "@/store/compare-selection-store";
import { useTravelDates } from "@/store/travel-dates-store";

/**
 * Floating bar that appears once the traveller selects hotels to compare. Opens
 * the full side-by-side comparison page for 2–3 hotels (curated OR live) with
 * their dates, and shows the friendly limit notice.
 */
export function CompareBar() {
  const selected = useCompareSelection((s) => s.selected);
  const notice = useCompareSelection((s) => s.notice);
  const remove = useCompareSelection((s) => s.remove);
  const clear = useCompareSelection((s) => s.clear);
  const checkIn = useTravelDates((s) => s.checkIn);
  const checkOut = useTravelDates((s) => s.checkOut);
  const router = useRouter();

  if (selected.length === 0 && !notice) return null;

  const canCompare = selected.length >= 2;
  const compare = () => {
    if (!canCompare) return;
    const [a, b, c] = selected.map((s) => s.id);
    const params = new URLSearchParams({ a, b });
    if (c) params.set("c", c);
    if (checkIn && checkOut) {
      params.set("checkIn", checkIn);
      params.set("checkOut", checkOut);
    }
    router.push(`/compare?${params.toString()}`);
    clear();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        /* Center with auto-margins (inset-x-0 + mx-auto) — NOT -translate-x-1/2,
           which framer-motion's y-transform would override, pushing it off-screen. */
        className="fixed inset-x-0 bottom-5 z-50 mx-auto w-[min(92vw,44rem)] rounded-2xl border border-border/70 bg-background/95 p-3 shadow-[0_12px_40px_-12px_rgba(16,33,58,0.4)] backdrop-blur"
      >
        {notice && (
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
            <AlertCircle className="size-3.5" /> {notice}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
            Compare ({selected.length}/{MAX_COMPARE})
          </span>
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex max-w-[12rem] items-center gap-1 rounded-full bg-black/[0.05] py-1 pl-2.5 pr-1 text-xs text-foreground/80"
            >
              <span className="truncate">{s.name}</span>
              <button
                onClick={() => remove(s.id)}
                aria-label={`Remove ${s.name}`}
                className="grid size-4 shrink-0 place-items-center rounded-full hover:bg-black/10"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <button
              onClick={clear}
              className="shrink-0 rounded-full px-3 py-2 text-xs font-medium text-foreground/60 hover:text-foreground"
            >
              Clear
            </button>
            <button
              onClick={compare}
              disabled={!canCompare}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-gold-sheen px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:min-h-0 sm:flex-none sm:py-1.5"
            >
              <Scale className="size-4" />
              {selected.length >= 2 ? `Compare ${selected.length} hotels` : "Select 2+ to compare"}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
