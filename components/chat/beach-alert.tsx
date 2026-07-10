"use client";

import { motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import type { BeachAlert } from "@/lib/services/beach-intelligence";

/**
 * A red sargassum warning shown when a mentioned destination has risky beach
 * conditions (beach score ≤ 60, or conditions forecast to worsen). The satellite
 * score stays the source of truth; this just makes the risk impossible to miss.
 */
export function BeachAlertBanner({ alert }: { alert: BeachAlert }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
    >
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-red-100">
        <TriangleAlert className="size-[18px] text-red-600" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-red-700">
          Sargassum warning — {alert.zone}
        </p>
        <ul className="mt-1 space-y-0.5 text-[13px] leading-snug text-red-900/80">
          {alert.reasons.map((r, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-red-400" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        {alert.alternatives.length > 0 && (
          <p className="mt-1.5 text-[12px] text-red-900/70">
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
