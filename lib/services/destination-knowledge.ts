import { DESTINATIONS, HOTELS } from "./mock-data";
import type { Vibe } from "./types";

/**
 * Destination Knowledge service — editorial intelligence about places: when to
 * go, the vibe, and which destinations suit a traveller's mood. Replace with a
 * CMS / vector store; signature is stable.
 */
export interface DestinationInfo {
  key: string;
  label: string;
  country: string;
  blurb: string;
  hotelCount: number;
}

export interface DestinationKnowledgeService {
  get(key: string): DestinationInfo | null;
  all(): DestinationInfo[];
  /** Suggest destinations for a set of vibes when the user is undecided. */
  suggestForVibes(vibes: Vibe[]): DestinationInfo[];
}

function toInfo(key: string): DestinationInfo {
  const meta = DESTINATIONS[key];
  return {
    key,
    label: meta.label,
    country: meta.country,
    blurb: meta.blurb,
    hotelCount: HOTELS.filter((h) => h.destinationKey === key).length,
  };
}

const VIBE_DESTINATIONS: Record<Vibe, string[]> = {
  romantic: ["paris", "maldives", "maui"],
  beach: ["maldives", "bali", "maui"],
  city: ["paris", "tokyo", "newyork", "london"],
  mountain: ["maui", "bali"],
  family: ["bali", "dubai", "maui"],
  business: ["tokyo", "newyork", "london"],
  wellness: ["bali", "tokyo", "maui"],
  adventure: ["bali", "dubai", "maui"],
  cruise: ["dubai", "maldives"],
};

export const destinationKnowledgeService: DestinationKnowledgeService = {
  get(key) {
    return DESTINATIONS[key] ? toInfo(key) : null;
  },
  all() {
    return Object.keys(DESTINATIONS).map(toInfo);
  },
  suggestForVibes(vibes) {
    const keys = new Set<string>();
    for (const v of vibes) (VIBE_DESTINATIONS[v] ?? []).forEach((k) => keys.add(k));
    if (keys.size === 0) ["paris", "maldives", "tokyo"].forEach((k) => keys.add(k));
    return [...keys].filter((k) => DESTINATIONS[k]).map(toInfo);
  },
};
