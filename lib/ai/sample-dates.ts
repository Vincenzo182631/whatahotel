import type { SearchCriteria } from "@/lib/services/types";

export interface SampleDates {
  checkIn: string;
  checkOut: string;
  /** Human label, e.g. "Mar 15–20". */
  label: string;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * When the traveller gives a month ("5 nights in March") but no exact dates,
 * pick representative dates in that month so we can show real hotels with real
 * prices right away instead of stalling on a dates question. Check-in is the
 * 15th of the next occurrence of that month (at least 3 days out); the stay
 * length is their stated nights (1–21), else 3.
 *
 * Returns null when exact dates are already known or no month was given.
 */
export function sampleStayDates(
  criteria: Pick<SearchCriteria, "checkIn" | "checkOut" | "travelMonth" | "nights">,
  today: Date = new Date(),
): SampleDates | null {
  if (criteria.checkIn && criteria.checkOut) return null;
  const month = MONTHS.indexOf(String(criteria.travelMonth ?? "").trim().toLowerCase());
  if (month < 0) return null;

  const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let year = today.getUTCFullYear();
  let checkIn = new Date(Date.UTC(year, month, 15));
  if (checkIn.getTime() < base + 3 * 86_400_000) checkIn = new Date(Date.UTC(++year, month, 15));

  const n = Number(criteria.nights);
  const nights = Number.isInteger(n) && n >= 1 && n <= 21 ? n : 3;
  const checkOut = new Date(checkIn.getTime() + nights * 86_400_000);

  const label =
    checkOut.getUTCMonth() === checkIn.getUTCMonth()
      ? `${SHORT[checkIn.getUTCMonth()]} ${checkIn.getUTCDate()}–${checkOut.getUTCDate()}`
      : `${SHORT[checkIn.getUTCMonth()]} ${checkIn.getUTCDate()} – ${SHORT[checkOut.getUTCMonth()]} ${checkOut.getUTCDate()}`;

  return { checkIn: iso(checkIn), checkOut: iso(checkOut), label };
}
