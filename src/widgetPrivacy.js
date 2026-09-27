/**
 * Widget privacy — display modes + field visibility for lock/home widgets
 * (and App Home summary cards where fields apply).
 */
import {
  fmtMoney,
  fmtCompact,
  fmtMoneyDelta,
  fmtRounded,
  fmtMasked,
  getDisplayCurrency,
} from "./format.js";
import { t } from "./i18n/index.js";

export const DISPLAY_MODES = ["exact", "rounded", "relative", "rhythm", "masked"];

export const PRIVACY_FIELDS = [
  "netWorth",
  "monthPace",
  "bucketHousing",
  "bucketTwse",
  "bucketCash",
  "bucketPassive",
  "goalProgress",
];

export const DEFAULT_WIDGET_PRIVACY = {
  displayMode: "exact",
  fields: {
    netWorth: true,
    monthPace: true,
    bucketHousing: true,
    bucketTwse: true,
    bucketCash: true,
    bucketPassive: true,
    goalProgress: true,
  },
};

export function normalizeWidgetPrivacy(raw) {
  const mode = DISPLAY_MODES.includes(raw?.displayMode)
    ? raw.displayMode
    : "exact";
  const fields = { ...DEFAULT_WIDGET_PRIVACY.fields };
  if (raw?.fields && typeof raw.fields === "object") {
    for (const k of PRIVACY_FIELDS) {
      if (typeof raw.fields[k] === "boolean") fields[k] = raw.fields[k];
    }
  }
  return { displayMode: mode, fields };
}

/** @param {{ fields?: Record<string, boolean> }} privacy */
export function privacyFieldOn(privacy, key) {
  return privacy?.fields?.[key] !== false;
}

export function monthProgressPct(date = new Date()) {
  const day = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Math.round((day / Math.max(daysInMonth, 1)) * 100);
}

function formatPct(n, { signed = false, digits = 2 } = {}) {
  const abs = Math.abs(n);
  const body = abs.toFixed(digits).replace(/\.?0+$/, "") || "0";
  if (signed) {
    if (n > 0) return "+" + body + "%";
    if (n < 0) return "−" + body + "%";
    return body + "%";
  }
  return body + "%";
}

/**
 * Privacy "rounded" amount. TWD → 萬 (NT$1,647 萬); other base currencies → k/M (US$540k).
 * @param {number} n
 * @param {{ delta?: boolean, currency?: string }} [opts]
 */
export function formatRoundedWan(n, opts = {}) {
  return fmtRounded(n, opts.currency || getDisplayCurrency(), {
    delta: !!opts.delta,
    unitWan: t("privacy.unitWan"),
  });
}

/**
 * Central formatter for widget (and privacy-aware) money display.
 *
 * @param {number} amount
 * @param {{ displayMode?: string, fields?: object }} privacy
 * @param {{
 *   kind?: "absolute"|"delta",
 *   compact?: boolean,
 *   base?: number,
 *   asMonthProgress?: boolean,
 *   hideMaskedDelta?: boolean,
 *   currency?: string,   // defaults to the app display (base) currency
 * }} [opts]
 * @returns {string}
 */
export function formatWidgetMoney(amount, privacy, opts = {}) {
  const mode = privacy?.displayMode || "exact";
  const kind = opts.kind || "absolute";
  const compact = !!opts.compact;
  const n = Number(amount) || 0;
  const ccy = opts.currency || getDisplayCurrency();

  if (mode === "rhythm") return "";

  if (mode === "masked") {
    if (kind === "delta") {
      if (opts.hideMaskedDelta) return "";
      return n < 0 ? "−••••" : "+••••";
    }
    return fmtMasked(ccy);
  }

  if (mode === "relative") {
    if (opts.asMonthProgress) {
      return t("privacy.monthProgress", { pct: monthProgressPct() });
    }
    if (kind === "delta") {
      const base = opts.base;
      if (base == null || base === 0) return "—";
      return formatPct((n / base) * 100, { signed: true, digits: 2 });
    }
    // Share of portfolio / base
    if (opts.base != null && opts.base !== 0) {
      return formatPct((n / opts.base) * 100, { signed: false, digits: 0 });
    }
    return "—";
  }

  if (mode === "rounded") {
    return formatRoundedWan(n, { delta: kind === "delta", currency: ccy });
  }

  // exact
  if (kind === "delta") return fmtMoneyDelta(n, ccy, compact);
  return compact ? fmtCompact(n, ccy) : fmtMoney(n, ccy);
}

/**
 * Pace / delta line for widgets respecting displayMode.
 * relative → signed % of base; rhythm → ""; masked → +••••
 */
export function formatWidgetPace(amount, privacy, opts = {}) {
  return formatWidgetMoney(amount, privacy, {
    kind: "delta",
    base: opts.base,
    compact: opts.compact,
    hideMaskedDelta: opts.hideMaskedDelta,
    currency: opts.currency,
  });
}

/**
 * Goal progress label for widget previews (privacy-aware).
 * exact → "82% · NT$16.5M"; rounded → "82% · 約…萬"; relative → "82%";
 * rhythm → "" (bar only); masked → "••••" (no amount, no ratio).
 * @param {{ pct: number, current: number }} prog
 */
export function formatGoalProgressLabel(prog, privacy, opts = {}) {
  const mode = privacy?.displayMode || "exact";
  const pct = Math.round(Number(prog?.pct) || 0) + "%";
  if (mode === "rhythm") return "";
  if (mode === "masked") return "••••";
  if (mode === "relative") return pct;
  const amt = formatWidgetMoney(prog?.current, privacy, { kind: "absolute", compact: true, currency: opts.currency });
  return amt ? pct + " · " + amt : pct;
}

/** Whether the goal bar fill may be shown (masked hides the ratio too). */
export function showGoalBarFill(privacy) {
  return (privacy?.displayMode || "exact") !== "masked";
}

/** Whether rhythm visualization should show when monthPace field is off */
export function showRhythmWithoutPace(privacy) {
  return privacy?.displayMode === "rhythm";
}
