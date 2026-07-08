/**
 * Lightweight FX for showing an approximate USD figure next to a foreign-currency
 * rate (e.g. "MAD 20,000 ≈ $2,000"). Live rates from a free, key-less endpoint
 * (open.er-api.com), cached 12h, with a static fallback so it always works.
 * Values are APPROXIMATE and always labelled "≈".
 */

// 1 USD = X <currency>. Approximate fallback if the live fetch fails.
const FALLBACK: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CHF: 0.89, CAD: 1.37, AUD: 1.52, JPY: 157,
  CNY: 7.2, HKD: 7.8, SGD: 1.35, THB: 36, IDR: 16200, INR: 84, AED: 3.67,
  SAR: 3.75, QAR: 3.64, JOD: 0.71, TRY: 33, MAD: 10, EGP: 49, ZAR: 18.5,
  NAD: 18.5, BWP: 13.5, KES: 130, TZS: 2600, RWF: 1300, MUR: 46, SCR: 13.5,
  MXN: 17, BRL: 5.6,
};

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12h
const globalForFx = globalThis as unknown as { __wahFxRates?: { ts: number; rates: Record<string, number> } };

async function getRates(): Promise<Record<string, number>> {
  const cached = globalForFx.__wahFxRates;
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.rates;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3500);
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { signal: ctrl.signal });
    const j = (await r.json()) as { result?: string; rates?: Record<string, number> };
    if (j?.result === "success" && j.rates && j.rates.USD === 1) {
      globalForFx.__wahFxRates = { ts: Date.now(), rates: j.rates };
      return j.rates;
    }
  } catch {
    /* fall back */
  } finally {
    clearTimeout(t);
  }
  return FALLBACK;
}

/** USD value of ONE unit of `currency` (e.g. usdPerUnit("MAD") ≈ 0.1). */
export async function usdPerUnit(currency: string): Promise<number | null> {
  const ccy = (currency || "USD").toUpperCase();
  if (ccy === "USD") return 1;
  const rates = await getRates();
  const perUsd = rates[ccy];
  return perUsd && perUsd > 0 ? 1 / perUsd : null;
}
