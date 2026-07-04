"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTravelerMemory } from "@/store/traveler-memory-store";

/**
 * Keeps the shared traveller memory in sync with the signed-in account, so it
 * follows the guest across devices. On login it pulls the account's saved memory
 * and merges it locally; whenever local memory changes it pushes back (debounced).
 * A no-op when logged out — anonymous guests keep localStorage-only memory.
 */
export function MemorySync() {
  const { user } = useAuth();
  const notes = useTravelerMemory((s) => s.notes);
  const remember = useTravelerMemory((s) => s.remember);
  const pulledFor = useRef<string | null>(null);

  // Pull the account's memory once per login and merge into local.
  useEffect(() => {
    if (!user || pulledFor.current === user.id) return;
    pulledFor.current = user.id;
    fetch("/api/memory")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { notes?: string[] } | null) => {
        if (d?.notes?.length) d.notes.forEach((n) => remember(n));
      })
      .catch(() => {});
  }, [user, remember]);

  // Push local memory up to the account when it changes (debounced).
  useEffect(() => {
    if (!user || notes.length === 0) return;
    const t = setTimeout(() => {
      fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [user, notes]);

  return null;
}
