import type { BookingDraft } from "@/lib/chat/types";
import type { Recommendation, SearchCriteria } from "./types";

/**
 * User Session Storage service.
 *
 * Server-side memory of each conversation: the live criteria and the most
 * recently surfaced recommendations (so "compare the first and third" and
 * "book the second" resolve without re-sending state). This in-memory map is a
 * drop-in for Redis / a database — replace the Map with your store of choice.
 */

export interface SessionState {
  id: string;
  criteria: SearchCriteria;
  lastRecommendations: Recommendation[];
  booking?: BookingDraft;
  updatedAt: number;
}

// Persist across hot-reloads in dev.
const globalForSessions = globalThis as unknown as {
  __whataHotelSessions?: Map<string, SessionState>;
};

const sessions =
  globalForSessions.__whataHotelSessions ??
  (globalForSessions.__whataHotelSessions = new Map<string, SessionState>());

export const sessionStorageService = {
  get(id: string): SessionState {
    let s = sessions.get(id);
    if (!s) {
      s = { id, criteria: {}, lastRecommendations: [], updatedAt: Date.now() };
      sessions.set(id, s);
    }
    return s;
  },
  save(id: string, patch: Partial<Omit<SessionState, "id">>): SessionState {
    const current = this.get(id);
    const next: SessionState = { ...current, ...patch, id, updatedAt: Date.now() };
    sessions.set(id, next);
    return next;
  },
  reset(id: string) {
    sessions.delete(id);
  },
};
