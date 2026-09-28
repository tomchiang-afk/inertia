/**
 * Native home-screen widget snapshot.
 *
 * Builds a small, *already privacy-formatted* JSON payload that the Android
 * AppWidget renders verbatim. All finance math and privacy decisions live here
 * (reusing widgetPrivacy.js) so native code never sees raw amounts it should
 * not show. The only numbers passed through are for optional "live" quiet
 * growth extrapolation, and only in exact / rounded modes where the absolute
 * value is already visible.
 *
 * Month rhythm only (v0.3.1): no market P&L anywhere. `live.base` / `live.at` are the
 * smooth-rhythm anchor (net worth as entered + when it was entered, see pace.js), so the
 * widget's extrapolation and the app's Home number are the same formula and never jump
 * when the app re-pushes a snapshot.
 */
import { derive } from "./math.js";
import { withPace } from "./pace.js";
import {
  normalizeWidgetPrivacy,
  privacyFieldOn,
  formatWidgetMoney,
  formatWidgetPace,
  formatGoalProgressLabel,
  showGoalBarFill,
  showRhythmWithoutPace,
  monthProgressPct,
} from "./widgetPrivacy.js";
import { primaryGoal, goalProgress } from "./goals.js";
import { t, getLocale } from "./i18n/index.js";
import { normalizeFx, currencySymbol } from "./currency.js";
import { normalizeWidgetStyle } from "./widgetStyle.js";

/** v3: three styles (rhythm / editorial / sediment) + a monotone 12-point trend. */
export const WIDGET_SNAPSHOT_VERSION = 3;

/** Style → native bitmap beat. */
const BEAT_STYLE = {
  rhythm: "month-dots",
  editorial: "beat-4",
  sediment: "grain-4",
};

function styleOf(state) {
  return normalizeWidgetStyle(state?.settings?.widgetStyle, state?.settings?.widgetTemplate);
}

/** Pace-implied smooth climb. Not a market history — the widget never shows a dip. */
function smoothTrend() {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    pts.push(Math.round((0.7 + 0.3 * t) * 1000) / 1000);
  }
  return pts;
}

/**
 * @param {{ assets: object, settings?: object, goals?: unknown[] }} state
 * @param {{ now?: Date }} [opts]
 */
export function buildWidgetSnapshot(state, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const priv = normalizeWidgetPrivacy(state?.settings?.widgetPrivacy);
  const mode = priv.displayMode;
  const style = styleOf(state);
  const fx = normalizeFx(state?.settings?.fx, "TWD");
  const ccy = fx.base;
  const symbol = currencySymbol(ccy);
  const d = withPace(derive(state.assets, fx), state?.paceAnchorAt ?? now.getTime(), now);
  const base = d.netWorth; // accrued by the smooth rhythm up to `now`
  const money = { currency: ccy };
  const pace30 = Math.round(d.periodQuiet(30));
  const noNumbers = mode === "rhythm";

  /* Net worth ------------------------------------------------------------ */
  const nwOn = privacyFieldOn(priv, "netWorth");
  let nwText = "";
  let nwShort = "";
  let monthProgressTemplate = null;
  if (!noNumbers) {
    if (mode === "relative") {
      nwText = formatWidgetMoney(base, priv, { ...money, kind: "absolute", asMonthProgress: true });
      nwShort = nwText;
      monthProgressTemplate = t("privacy.monthProgress", { pct: "{pct}" });
    } else {
      nwText = formatWidgetMoney(base, priv, { ...money, kind: "absolute" });
      nwShort = formatWidgetMoney(base, priv, { ...money, kind: "absolute", compact: true });
    }
  }
  const netWorth = {
    show: nwOn && !noNumbers && !!nwText,
    label: t("netWorth"),
    text: nwOn ? nwText : "",
    short: nwOn ? nwShort : "",
    monthProgressTemplate: nwOn ? monthProgressTemplate : null,
  };

  /* Live quiet-growth extrapolation (exact / rounded only) --------------- */
  let live = null;
  if (netWorth.show && (mode === "exact" || mode === "rounded")) {
    // exact → full amount; rounded → 萬 for TWD, k/M ("round") for every other base.
    live = {
      format: mode === "exact" ? "exact" : ccy === "TWD" ? "wan" : "round",
      unit: t("privacy.unitWan"),
      prefix: symbol,
      currency: ccy,
      // Anchor, not "now": native computes base + perDay × days since `at` (45-day cap),
      // exactly like pace.js withPace(), so the number keeps growing smoothly between opens.
      base: Math.round(d.netWorthEntered),
      perDay: Math.round(d.quietDay * 100) / 100,
      at: d.paceAnchorAt ?? now.getTime(),
    };
  }

  /* Month pace (quiet growth over 30 days) ------------------------------- */
  const paceOn = privacyFieldOn(priv, "monthPace");
  const paceText = paceOn && !noNumbers
    ? formatWidgetPace(pace30, priv, { ...money, base, compact: true })
    : "";
  const pace = {
    show: !!paceText,
    label: t("privacy.field.monthPace"),
    text: paceText,
  };

  /* Rhythm (month progress beat bar; native recomputes day-of-month) ----- */
  const rhythm = {
    show: paceOn || showRhythmWithoutPace(priv),
    label: t("widget.rhythm"),
    style: BEAT_STYLE[style],
    rows: style === "rhythm" ? 3 : 4,
    pct: monthProgressPct(now),
  };

  /* Goal ----------------------------------------------------------------- */
  let goal = { show: false, name: "", text: "", barPct: null };
  const g = privacyFieldOn(priv, "goalProgress") ? primaryGoal(state.goals) : null;
  if (g) {
    const prog = goalProgress(g, state.assets, d);
    goal = {
      show: true,
      name: g.name,
      text: formatGoalProgressLabel(prog, priv, money),
      barPct: showGoalBarFill(priv) ? Math.round(prog.barPct * 10) / 10 : null,
    };
  }

  /* Buckets (medium size, dense right column) ---------------------------- */
  const buckets = [];
  if (!noNumbers) {
    const amt = (n) => formatWidgetMoney(n, priv, { ...money, kind: "absolute", compact: true, base });
    const add = (field, key, label, text) => {
      if (privacyFieldOn(priv, field) && text) buckets.push({ key, label, text });
    };
    add("bucketHousing", "housing", t("widget.housing"), amt(d.netEquity));
    add("bucketTwse", "stocks", t("widget.stocks"), amt(d.stocks));
    add("bucketCash", "cash", t("widget.cash"), amt(d.cashTotal));
    const passive = d.passiveMonthly;
    const passiveText =
      mode === "relative"
        ? "" // share of net worth is meaningless for a monthly flow
        : mode === "masked"
          ? amt(passive)
          : amt(passive) + t("perMo");
    add("bucketPassive", "passive", t("widget.passive"), passiveText);
  }

  return {
    v: WIDGET_SNAPSHOT_VERSION,
    updatedAt: now.getTime(),
    locale: getLocale(),
    style,
    theme: "light",
    trend: smoothTrend(),
    mode,
    brand: "Inertia",
    currency: { code: ccy, symbol },
    labels: {
      updated: t("widget.updated"),
    },
    netWorth,
    live,
    pace,
    rhythm,
    goal,
    buckets,
  };
}
