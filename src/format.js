/**
 * Money formatting shared by the app UI, the widget previews and the native widget snapshot.
 * The native side (WidgetFormat.java) mirrors fmtMoney / fmtCompact / fmtRounded for live
 * extrapolation, so keep the rules in sync (WidgetFormatTest checks parity).
 */
import { currencySymbol, normalizeCurrency, DEFAULT_BASE } from "./currency.js";

export const MINUS = "−";

let displayCurrency = DEFAULT_BASE;

/** App-wide default currency for helpers called without one (the user's base currency). */
export function setDisplayCurrency(code) {
  displayCurrency = normalizeCurrency(code);
}
export function getDisplayCurrency() {
  return displayCurrency;
}

function trim1(v) {
  return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
}

function group(n, decimals = 0) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Exact amount, e.g. NT$16,470,000 / US$41,520 / −JP¥3,200.
 * @param {number} n
 * @param {string} [ccy]
 * @param {{ decimals?: number }} [opts] decimals default 0 (aggregates are whole units)
 */
export function fmtMoney(n, ccy = displayCurrency, opts = {}) {
  const v = Number(n) || 0;
  const d = opts.decimals ?? 0;
  const abs = d > 0 ? Math.abs(v) : Math.round(Math.abs(v));
  const shown = d > 0 ? group(abs, d) : group(abs, 0);
  const sign = v < 0 && shown.replace(/[0.,]/g, "") !== "" ? MINUS : "";
  return sign + currencySymbol(ccy) + shown;
}

/** Compact: NT$16M, NT$2.5M, NT$28.5k, NT$9,999; ≥1B uses B. Same thresholds as the v1 fmtNT. */
export function fmtCompact(n, ccy = displayCurrency) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? MINUS : "";
  const sym = currencySymbol(ccy);
  if (abs >= 1_000_000_000) {
    const b = abs / 1_000_000_000;
    return sign + sym + (b >= 10 ? Math.round(b).toString() : trim1(b)) + "B";
  }
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return sign + sym + (m >= 10 ? Math.round(m).toString() : trim1(m)) + "M";
  }
  if (abs >= 10_000) {
    const k = abs / 1_000;
    return sign + sym + (k >= 100 ? Math.round(k).toString() : trim1(k)) + "k";
  }
  return sign + sym + group(Math.round(abs));
}

/**
 * Privacy "rounded" mode.
 * TWD → 萬 (NT$1,647 萬). Other currencies → k / M / B (US$1.2M, JP¥350k, US$840).
 * @param {number} n
 * @param {string} [ccy]
 * @param {{ delta?: boolean, unitWan?: string }} [opts]
 */
export function fmtRounded(n, ccy = displayCurrency, opts = {}) {
  const v = Number(n) || 0;
  const c = normalizeCurrency(ccy);
  const sym = currencySymbol(c);
  const abs = Math.abs(Math.round(v));
  let body;
  if (c === "TWD") {
    const wan = Math.round(abs / 10_000);
    body = sym + group(wan) + " " + (opts.unitWan || "萬");
  } else if (abs >= 1_000_000_000) {
    const b = abs / 1_000_000_000;
    body = sym + (b >= 100 ? Math.round(b).toString() : trim1(b)) + "B";
  } else if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    body = sym + (m >= 100 ? Math.round(m).toString() : trim1(m)) + "M";
  } else if (abs >= 1_000) {
    body = sym + Math.round(abs / 1_000) + "k";
  } else {
    body = sym + Math.round(abs / 10) * 10;
  }
  if (opts.delta) {
    if (v > 0) return "+" + body;
    if (v < 0) return MINUS + body;
    return body;
  }
  return (v < 0 ? MINUS : "") + body;
}

export function fmtMoneyDelta(n, ccy = displayCurrency, compact = false) {
  const v = Number(n) || 0;
  const s = compact ? fmtCompact(v, ccy) : fmtMoney(v, ccy);
  return v > 0 ? "+" + s : s;
}

/** Masked amount for privacy mode: NT$•••••• / US$•••••• */
export function fmtMasked(ccy = displayCurrency) {
  return currencySymbol(ccy) + "••••••";
}

/** Plain number (shares, rates) without currency. */
export function fmtNumber(n, maxDecimals = 4) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}
