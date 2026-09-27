/** Quiet-day / net-worth math on top of the v2 multi-currency asset lists. */
import { t } from "./i18n/index.js";
import { aggregate, DAYS_IN_MONTH } from "./portfolio.js";
import { defaultFx } from "./currency.js";
import { fmtMoney, fmtCompact, fmtMoneyDelta } from "./format.js";

export { DAYS_IN_MONTH };

/**
 * @param {object} assets v2 lists (v1 bucket objects are migrated on the fly)
 * @param {object} [fx] settings.fx; defaults to the TWD reference table
 */
export function derive(assets, fx) {
  const table = fx || defaultFx();
  const agg = aggregate(assets, table);
  const dailyPrincipal = agg.monthlyPrincipal / DAYS_IN_MONTH;
  const dailyTdInterest = agg.annualTdInterest / 365;
  const dailyPassivePace = agg.passiveMonthly / DAYS_IN_MONTH;
  const quietDay = dailyPrincipal + dailyTdInterest + dailyPassivePace;
  return {
    ...agg,
    dailyPrincipal,
    dailyTdInterest,
    dailyPassivePace,
    quietDay,
    periodQuiet: (days) => quietDay * days,
  };
}

export function periodDays(period) {
  if (period === "7d") return 7;
  if (period === "month") return DAYS_IN_MONTH;
  return 30;
}

/** Localized short period label (uses current i18n locale) */
export function periodLabel(period) {
  if (period === "7d") return t("period.7d");
  if (period === "month") return t("period.month");
  return t("period.30d");
}

/** Base-currency amount (name kept from v1; follows setDisplayCurrency). */
export function fmtNT(n, compact = false) {
  return compact ? fmtCompact(n) : fmtMoney(n);
}

export function fmtDelta(n, compact = false) {
  return fmtMoneyDelta(n, undefined, compact);
}
