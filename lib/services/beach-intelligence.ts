/**
 * Beach Intelligence client — gives the advisor current sargassum (seaweed)
 * conditions for a destination, sourced from the WhataHotel Beach Intelligence
 * service (USF/NOAA satellite data).
 *
 * This is a thin, defensive HTTP client over that service's public endpoint:
 *   GET {BEACH_INTELLIGENCE_URL}/api/chatbot/beach-condition?destination=<city>
 *
 * It is fully env-gated: with BEACH_INTELLIGENCE_URL unset, every call returns
 * null and the advisor behaves exactly as before. Failures, timeouts and
 * unknown (inland) destinations all resolve to null — never throw.
 */

export type BeachRiskLevel = "LOW" | "MODERATE" | "HIGH";

export interface BeachAlternative {
  name: string;
  score: number;
  level: BeachRiskLevel;
}

export interface BeachReport {
  headline: string;
  source: string;
  publishedAt: string;
  severity: BeachRiskLevel | null;
  summary: string | null;
}

export interface BeachCondition {
  /** The matched monitoring zone, e.g. "Cancun Hotel Zone". */
  zone: string;
  /** 0-100, higher = clearer beach (less sargassum). */
  score: number;
  level: BeachRiskLevel;
  /** One-line, traveller-facing summary from the service. */
  summary: string;
  /** Nearby zones with clearer conditions (present when this zone is not LOW). */
  alternatives: BeachAlternative[];
  /** 7-day wind-driven outlook: "improving" | "steady" | "worsening" | null. */
  forecastTrend: string | null;
  /** Early-warning flag: recent news indicates worse conditions than satellite. */
  newsFlag: boolean;
  /** One-line reason for the flag (headline + source), when flagged. */
  newsSummary: string | null;
  /** Most recent relevant news item, if any. */
  latestReport: BeachReport | null;
}

/**
 * A traveller-facing beach warning: shown with a red icon when a mentioned
 * destination has meaningfully risky sargassum conditions.
 */
export interface BeachAlert {
  zone: string;
  score: number;
  level: BeachRiskLevel;
  /** Score at/below this threshold is considered a warning-worthy beach. */
  worsening: boolean;
  /** Short bullet reasons ("Beach score 42/100 — high sargassum risk", …). */
  reasons: string[];
  /** News early-warning line, when present. */
  newsSummary: string | null;
  /** Clearer nearby zones to suggest instead. */
  alternatives: BeachAlternative[];
}

/** Score at/below which a beach is flagged as risky (per product rule). */
export const BEACH_ALERT_SCORE = 60;

/**
 * Decide whether a beach condition warrants a visible warning, and build it.
 * Fires when the beach score is at/below the threshold OR conditions are
 * forecast to worsen. Returns null when the beach is fine.
 */
export function beachAlertFrom(b: BeachCondition): BeachAlert | null {
  const lowScore = b.score <= BEACH_ALERT_SCORE;
  const worsening = b.forecastTrend === "worsening";
  if (!lowScore && !worsening) return null;

  const levelWord =
    b.level === "HIGH" ? "high" : b.level === "MODERATE" ? "moderate" : "low";
  const reasons: string[] = [];
  if (lowScore) {
    reasons.push(`Beach score ${b.score}/100 — ${levelWord} sargassum risk`);
  }
  if (worsening) {
    reasons.push("Sargassum forecast to worsen over the next 7 days");
  }
  if (b.newsFlag && b.newsSummary) {
    reasons.push(b.newsSummary);
  }

  return {
    zone: b.zone,
    score: b.score,
    level: b.level,
    worsening,
    reasons,
    newsSummary: b.newsFlag ? b.newsSummary : null,
    alternatives: b.alternatives,
  };
}

// Destinations worth checking — the service only covers coastal zones, so we
// avoid a network round-trip for inland cities (Paris, Tokyo, …) unless the
// traveller explicitly asks about beach/seaweed conditions.
const COASTAL_HINTS =
  /\b(canc[uú]n|riviera\s*maya|tulum|playa\s*del\s*carmen|costa\s*mujeres|isla\s*mujeres|punta\s*cana|montego|jamaica|nassau|bahamas|miami|florida\s*keys|key\s*west|islamorada|cozumel|caribbean|cabo|puerto\s*morelos|akumal)\b/i;

// Phrases that mean the traveller is asking about beach/water conditions.
// Plural-tolerant: "are the beaches clean?" must trigger just like the singular.
const BEACH_QUERY =
  /\b(sargass?um|seaweed|sea\s?weed|algae|beach(es)?\s*(condition(s)?|quality|clean|clear|look(s|ing)?)|water\s*(clarity|quality)|(is|are)\s+the\s+beach(es)?|clean\s+beach(es)?|clear\s+water)\b/i;

/** Should we bother fetching beach data for this destination + message? */
export function beachRelevant(destination: string | undefined, message: string): boolean {
  if (BEACH_QUERY.test(message)) return true;
  if (!destination) return false;
  return COASTAL_HINTS.test(destination);
}

interface CacheEntry {
  value: BeachCondition | null;
  expires: number;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours — conditions move slowly
const NEGATIVE_TTL_MS = 1000 * 60 * 5; // definitive "not a coastal zone" (404)
const ERROR_TTL_MS = 1000 * 60; // transient failure — retry soon, don't hide recoveries
const CACHE_MAX = 500; // bound memory: destinations are attacker-controllable input
const TIMEOUT_MS = 3000;

function setCache(key: string, value: BeachCondition | null, ttl: number): void {
  if (CACHE.size >= CACHE_MAX) {
    const now = Date.now();
    for (const [k, e] of CACHE) if (e.expires <= now) CACHE.delete(k);
    // Still full after dropping expired entries → evict oldest-inserted.
    while (CACHE.size >= CACHE_MAX) {
      const oldest = CACHE.keys().next().value;
      if (oldest === undefined) break;
      CACHE.delete(oldest);
    }
  }
  CACHE.set(key, { value, expires: Date.now() + ttl });
}

/**
 * Fetch the current beach condition for a destination, or null when the feature
 * is unconfigured, the destination isn't a monitored coastal zone, or the call
 * fails. Real conditions cache for 6h; a definitive "not monitored" caches
 * briefly; a transient error caches for only a minute so a service blip can't
 * hide warnings for hours.
 */
export async function getBeachCondition(
  destination: string,
): Promise<BeachCondition | null> {
  const base = process.env.BEACH_INTELLIGENCE_URL;
  if (!base) return null;

  const dest = destination.trim();
  if (!dest) return null;
  const key = dest.toLowerCase();

  const cached = CACHE.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const value = await fetchCondition(base, dest);
    setCache(key, value, value ? CACHE_TTL_MS : NEGATIVE_TTL_MS);
    return value;
  } catch {
    setCache(key, null, ERROR_TTL_MS);
    return null;
  }
}

async function fetchCondition(
  base: string,
  destination: string,
): Promise<BeachCondition | null> {
  const url = `${base.replace(/\/$/, "")}/api/chatbot/beach-condition?destination=${encodeURIComponent(
    destination,
  )}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 404) return null; // definitive: not a monitored coastal zone
    if (!res.ok) throw new Error(`beach-intelligence ${res.status}`); // transient (5xx etc.)

    const data = (await res.json()) as {
      condition?: {
        matchedZone?: string;
        riskScore?: number;
        riskLevel?: BeachRiskLevel;
        summary?: string;
        alternatives?: { destination: string; riskScore: number; riskLevel: BeachRiskLevel }[];
        forecastTrend?: string | null;
        newsFlag?: boolean;
        newsSummary?: string | null;
        latestReport?: BeachReport | null;
      };
    };
    const c = data.condition;
    if (!c || typeof c.riskScore !== "number" || !c.riskLevel) return null;

    return {
      zone: c.matchedZone ?? destination,
      score: c.riskScore,
      level: c.riskLevel,
      summary: c.summary ?? "",
      alternatives: (c.alternatives ?? []).map((a) => ({
        name: a.destination,
        score: a.riskScore,
        level: a.riskLevel,
      })),
      forecastTrend: c.forecastTrend ?? null,
      newsFlag: Boolean(c.newsFlag),
      newsSummary: c.newsSummary ?? null,
      latestReport: c.latestReport ?? null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Render a beach condition as grounded facts for the advisor's SITUATION. */
export function formatBeachFacts(b: BeachCondition): string {
  const levelWord =
    b.level === "LOW" ? "low" : b.level === "MODERATE" ? "moderate" : "high";
  const lines = [
    `Zone: ${b.zone} — ${levelWord} sargassum risk, beach score ${b.score}/100 (higher = clearer water).`,
  ];
  if (b.summary) lines.push(b.summary);
  if (b.level !== "LOW" && b.alternatives.length) {
    const alts = b.alternatives
      .map((a) => `${a.name} (${a.score}/100)`)
      .join(", ");
    lines.push(`Nearby zones with clearer conditions: ${alts}.`);
  }
  // News / announcements (context — the satellite score above is the number).
  if (b.newsFlag && b.newsSummary) {
    lines.push(`Early-warning from recent news: ${b.newsSummary}.`);
  } else if (b.latestReport?.summary) {
    const when = relativeDay(b.latestReport.publishedAt);
    lines.push(
      `Recent report (${b.latestReport.source}${when ? `, ${when}` : ""}): ${b.latestReport.summary}.`,
    );
  }
  return lines.join(" ");
}

function relativeDay(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.round((Date.now() - then) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return `${Math.round(days / 7)} weeks ago`;
}
