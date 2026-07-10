"use client";

import { useEffect, useState } from "react";
import type { BeachAlert } from "@/lib/services/beach-intelligence";
import { BeachAlertBanner } from "./beach-alert";

/**
 * Self-contained sargassum warning for a destination. Fetches the current beach
 * alert for `destination` and renders the red banner only when there's one —
 * otherwise renders nothing. Used on surfaces whose advisor streams plain text
 * (hotel page, comparison) and so can't carry the alert in a payload.
 */
export function BeachAlertFor({
  destination,
  className,
}: {
  destination?: string;
  className?: string;
}) {
  const [alert, setAlert] = useState<BeachAlert | null>(null);

  useEffect(() => {
    const dest = destination?.trim();
    if (!dest) return;
    let active = true;
    fetch(`/api/beach-alert?destination=${encodeURIComponent(dest)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.alert) setAlert(d.alert as BeachAlert);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [destination]);

  if (!alert) return null;
  return (
    <div className={className}>
      <BeachAlertBanner alert={alert} />
    </div>
  );
}
