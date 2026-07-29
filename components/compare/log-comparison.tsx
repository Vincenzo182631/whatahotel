"use client";

import { useEffect, useRef } from "react";

/**
 * Fire-and-forget beacon: when someone opens a comparison on /compare, tell the
 * server so — if they're a signed-in lead — it's recorded on their CRM record.
 * The API resolves the user from the session cookie and no-ops for guests and
 * for the advisor, so this never sends anything sensitive from the client.
 */
export function LogComparison({
  a,
  b,
  c,
  checkIn,
  checkOut,
  city,
}: {
  a: string;
  b: string;
  c?: string;
  checkIn?: string;
  checkOut?: string;
  city?: string;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch("/api/leads/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a, b, c, checkIn, checkOut, city }),
      keepalive: true,
    }).catch(() => {});
  }, [a, b, c, checkIn, checkOut, city]);
  return null;
}
