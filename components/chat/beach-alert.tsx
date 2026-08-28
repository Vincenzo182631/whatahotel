"use client";

import { motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import type { BeachAlert } from "@/lib/services/beach-intelligence";

/**
 * Tone per severity. A "warning" means the water is measurably affected and
 * reads red; a "watch" means only the forecast is turning, and reads amber so
 * it informs without overstating what the satellite actually sees.
 */
const TONE = {
  warning: {
    title: "Sargassum warning",
    box: "border-red-200 bg-red-50",
    badge: "bg-red-100",
    icon: "text-red-600",
    heading: "text-red-700",
    body: "text-red-900/80",
    dot: "bg-red-400",
    footnote: "text-red-900/70",
  },
  watch: {
    title: "Sargassum watch",
    box: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100",
    icon: "text-amber-600",
    heading: "text-amber-800",
    body: "text-amber-900/80",
    dot: "bg-amber-400",
    footnote: "text-amber-900/70",
  },
} as const;

/**
 * A sargassum notice shown when a mentioned destination has risky beach
 * conditions — red when the beach score is at/below the alert threshold, amber
 * when only the forecast is turning. The satellite score stays the source of
 * truth; this just makes the risk impossible to miss.
 */
export function BeachAlertBanner({ alert }: { alert: BeachAlert }) {
  const tone = TONE[alert.severity] ?? TONE.warning;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      // A warning interrupts the screen reader; a watch is announced politely,
      // for the same reason it isn't red.
      role={alert.severity === "watch" ? "status" : "alert"}
      className={`flex gap-3 rounded-2xl border px-4 py-3 ${tone.box}`}
    >
      <div className={`grid size-8 shrink-0 place-items-center rounded-full ${tone.badge}`}>
        <TriangleAlert className={`size-[18px] ${tone.icon}`} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-semibold ${tone.heading}`}>
          {tone.title} — {alert.zone}
        </p>
        <ul className={`mt-1 space-y-0.5 text-[13px] leading-snug ${tone.body}`}>
          {alert.reasons.map((r, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden className={`mt-[7px] size-1 shrink-0 rounded-full ${tone.dot}`} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        {alert.alternatives.length > 0 && (
          <p className={`mt-1.5 text-[12px] ${tone.footnote}`}>
            Clearer nearby:{" "}
            <span className="font-medium">
              {alert.alternatives
                .slice(0, 3)
                .map((a) => `${a.name} (${a.score}/100)`)
                .join(", ")}
            </span>
          </p>
        )}
      </div>
    </motion.div>
  );
}
