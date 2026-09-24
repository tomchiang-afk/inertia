/**
 * Widget privacy — display modes + field visibility for lock/home widgets
 * (and App Home summary cards where fields apply).
 */
import { fmtNT, fmtDelta } from "./math.js";
import { t } from "./i18n/index.js";

export const DISPLAY_MODES = ["exact", "rounded", "relative", "rhythm", "masked"];

export const PRIVACY_FIELDS = [
  "netWorth",
  "monthPace",
  "todayActual",
  "bucketHousing",
  "bucketTwse",
  "bucketCash",
  "bucketPassive",
];

export const DEFAULT_WIDGET_PRIVACY = {
  displayMode: "exact",
  fields: {
    netWorth: true,
    monthPace: true,
    todayActual: true,
    bucketHousing: true,
    bucketTwse: true,
    bucketCash: true,
    bucketPassive: true,
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
 * Round absolute TWD to 萬 (10,000) and format e.g. NT$1,647 萬
 * @param {number} n
 * @param {{ delta?: boolean }} [opts]
 */
export function formatRoundedWan(n, opts = {}) {
  const abs = Math.abs(Math.round(n));
  const wan = Math.round(abs / 10_000);
  const unit = t("privacy.unitWan");
  const body = "NT$" + wan.toLocaleString("en-US") + " " + unit;
  if (opts.delta) {
    if (n > 0) return "+" + body;
    if (n < 0) return "−" + body;
    return body;
  }
  return (n < 0 ? "−" : "") + body;
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
 * }} [opts]
 * @returns {string}
 */
export function formatWidgetMoney(amount, privacy, opts = {}) {
  const mode = privacy?.displayMode || "exact";
  const kind = opts.kind || "absolute";
  const compact = !!opts.compact;
  const n = Number(amount) || 0;

  if (mode === "rhythm") return "";

  if (mode === "masked") {
    if (kind === "delta") {
      if (opts.hideMaskedDelta) return "";
      return n < 0 ? "−••••" : "+••••";
    }
    return "NT$••••••";
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
    return formatRoundedWan(n, { delta: kind === "delta" });
  }

  // exact
  return kind === "delta" ? fmtDelta(n, compact) : fmtNT(n, compact);
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
  });
}

/** Whether rhythm visualization should show when monthPace field is off */
export function showRhythmWithoutPace(privacy) {
  return privacy?.displayMode === "rhythm";
}
