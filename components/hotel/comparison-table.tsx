"use client";

import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import type { HotelComparison } from "@/lib/services/recommendation-engine";

export function ComparisonTable({ comparison }: { comparison: HotelComparison }) {
  const { hotels, rows, recommendation } = comparison;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-3xl glass-strong shadow-card"
    >
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-36 p-4 text-left align-bottom text-xs uppercase tracking-wider text-foreground/50">
                Side by side
              </th>
              {hotels.map((h) => (
                <th key={h.id} className="p-4 align-bottom">
                  <div className="relative mb-2 h-20 w-full overflow-hidden rounded-xl">
                    <ImageWithFallback
                      src={h.image}
                      seed={h.id}
                      alt={h.name}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  </div>
                  <p className="font-display text-base font-medium leading-tight">
                    {h.name}
                  </p>
                  <p className="text-xs text-foreground/55">{h.city}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={i % 2 === 0 ? "bg-black/[0.025]" : undefined}
              >
                <td className="p-3 px-4 text-xs font-medium text-foreground/60">
                  {row.label}
                </td>
                {row.values.map((v, j) => (
                  <td key={j} className="p-3 px-4 text-foreground/85">
                    {v === "Yes" ? (
                      <Check className="size-4 text-primary" />
                    ) : (
                      v
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-3 border-t border-primary/15 bg-primary/5 p-4">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-foreground/85">
          <span className="font-medium text-primary">Advisor's take — </span>
          {recommendation}
        </p>
      </div>
    </motion.div>
  );
}
