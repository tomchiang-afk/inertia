/**
 * Currency + FX helpers shared by the app UI and the widget snapshot.
 *
 * FX model (settings.fx):
 *   { base: "TWD", rates: { USD: 30.5, JPY: 0.21, ... }, updatedAt: "2026-09-27", edited: false }
 *   rates[c] = how many units of `base` one unit of `c` is worth. The base itself is implicit (1).
 *   A rate of null means "unknown" (the user added a currency but no rate yet); amounts in that
 *   currency are left out of totals and flagged in the UI instead of being guessed.
 */

export const DEFAULT_BASE = "TWD";

/** Approximate reference rates to TWD. Clearly user-editable; never fetched. */
export const DEFAULT_FX_TWD = {
  USD: 30.5,
  JPY: 0.21,
  HKD: 3.92,
  CNY: 4.28,
  EUR: 35.6,
  GBP: 41.0,
  SGD: 23.6,
  AUD: 20.1,
};
export const DEFAULT_FX_DATE = "2026-09-27";

/** Common codes offered in pickers (any ISO-like 3-letter code may still be typed). */
export const COMMON_CURRENCIES = ["TWD", "USD", "JPY", "HKD", "CNY", "EUR", "GBP", "SGD", "AUD", "KRW", "CAD", "CHF"];

const SYMBOLS = {
  TWD: "NT$",
  USD: "US$",
  JPY: "JP¥",
  CNY: "CN¥",
  HKD: "HK$",
  EUR: "€",
  GBP: "£",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
  KRW: "₩",
  CHF: "CHF ",
};

/** Currencies normally shown without minor units. */
const ZERO_DECIMAL = new Set(["TWD", "JPY", "KRW"]);

export function normalizeCurrency(code, fallback = DEFAULT_BASE) {
  const c = String(code || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : fallback;
}

export function currencySymbol(code) {
  const c = normalizeCurrency(code);
  return SYMBOLS[c] || c + " ";
}

export function isZeroDecimal(code) {
  return ZERO_DECIMAL.has(normalizeCurrency(code));
}

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Default FX table expressed against `base` (rebased from the TWD reference table). */
export function defaultFx(base = DEFAULT_BASE) {
  const twd = { base: "TWD", rates: { ...DEFAULT_FX_TWD }, updatedAt: DEFAULT_FX_DATE, edited: false };
  return rebaseFx(twd, normalizeCurrency(base));
}

export function normalizeFx(raw, baseHint) {
  const base = normalizeCurrency(raw?.base || baseHint || DEFAULT_BASE);
  if (!raw || typeof raw !== "object" || !raw.rates || typeof raw.rates !== "object") {
    return defaultFx(base);
  }
  const rates = {};
  for (const [k, v] of Object.entries(raw.rates)) {
    const code = normalizeCurrency(k, "");
    if (!code || code === base) continue;
    const n = Number(v);
    rates[code] = v == null || v === "" || !Number.isFinite(n) || n <= 0 ? null : n;
  }
  return {
    base,
    rates,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt.slice(0, 10) : DEFAULT_FX_DATE,
    edited: !!raw.edited,
  };
}

/**
 * Re-express the table against a new base, keeping every cross rate.
 * Codes whose rate can't be derived (old base → new base unknown) stay null.
 */
export function rebaseFx(fx, newBase) {
  const nb = normalizeCurrency(newBase);
  const ob = normalizeCurrency(fx?.base);
  const src = fx?.rates || {};
  if (nb === ob) return { ...fx, base: nb, rates: { ...src } };
  const pivot = src[nb]; // 1 newBase = pivot oldBase
  const rates = {};
  const ok = Number.isFinite(pivot) && pivot > 0;
  rates[ob] = ok ? round6(1 / pivot) : null;
  for (const [code, r] of Object.entries(src)) {
    if (code === nb) continue;
    rates[code] = ok && Number.isFinite(r) && r > 0 ? round6(r / pivot) : null;
  }
  return { base: nb, rates, updatedAt: fx?.updatedAt || DEFAULT_FX_DATE, edited: !!fx?.edited };
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

/** Units of fx.base per 1 unit of `code`; 1 for the base; null if unknown. */
export function rateToBase(code, fx) {
  const c = normalizeCurrency(code);
  if (c === normalizeCurrency(fx?.base)) return 1;
  const r = fx?.rates?.[c];
  return Number.isFinite(r) && r > 0 ? r : null;
}

/** Convert `amount` in `from` to fx.base. Returns null when the rate is unknown. */
export function toBase(amount, from, fx) {
  const r = rateToBase(from, fx);
  if (r == null) return null;
  return (Number(amount) || 0) * r;
}

/** Convert between two arbitrary currencies via the base; null if either rate is unknown. */
export function convert(amount, from, to, fx) {
  const a = rateToBase(from, fx);
  const b = rateToBase(to, fx);
  if (a == null || b == null) return null;
  return ((Number(amount) || 0) * a) / b;
}

/** Set / add a rate (user edit). Marks the table edited with today's date. */
export function withRate(fx, code, rate, { date } = {}) {
  const c = normalizeCurrency(code, "");
  if (!c || c === fx.base) return fx;
  const n = Number(rate);
  return {
    ...fx,
    rates: { ...fx.rates, [c]: Number.isFinite(n) && n > 0 ? n : null },
    updatedAt: date || todayISO(),
    edited: true,
  };
}

export function withoutRate(fx, code, { date } = {}) {
  const c = normalizeCurrency(code, "");
  const rates = { ...fx.rates };
  delete rates[c];
  return { ...fx, rates, updatedAt: date || todayISO(), edited: true };
}

/** Make sure a currency used by an item has a row (rate null = needs input). */
export function ensureCurrency(fx, code) {
  const c = normalizeCurrency(code, "");
  if (!c || c === fx.base || c in fx.rates) return fx;
  return { ...fx, rates: { ...fx.rates, [c]: null } };
}
