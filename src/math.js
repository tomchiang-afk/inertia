/** Quiet-day / net-worth math — same as prototype */
import { t } from "./i18n/index.js";

export const DAYS_IN_MONTH = 30;

export function derive(assets) {
  const housing = assets.housing;
  const equities = assets.equities;
  const cash = assets.cash;
  const passive = assets.passive;

  const netEquity = housing.marketValue - housing.mortgage;
  const cashTotal = cash.checking + cash.timeDeposit;

  const dailyPrincipal = housing.monthlyPrincipal / DAYS_IN_MONTH;
  const dailyTdInterest =
    (cash.timeDeposit * (cash.tdAnnualRate / 100)) / 365;
  const dailyPassivePace = passive.monthly / DAYS_IN_MONTH;
  const quietDay = dailyPrincipal + dailyTdInterest + dailyPassivePace;

  return {
    netEquity,
    cashTotal,
    dailyPrincipal,
    dailyTdInterest,
    dailyPassivePace,
    quietDay,
    netWorth: netEquity + equities.marketValue + cashTotal,
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

export function fmtNT(n, compact = false) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (compact) {
    if (abs >= 1_000_000) {
      const m = abs / 1_000_000;
      const s = m >= 10 ? Math.round(m).toString() : (Math.round(m * 10) / 10).toFixed(1).replace(/\.0$/, "");
      return sign + "NT$" + s + "M";
    }
    if (abs >= 10_000) {
      const k = abs / 1_000;
      const s = k >= 100 ? Math.round(k).toString() : (Math.round(k * 10) / 10).toFixed(1).replace(/\.0$/, "");
      return sign + "NT$" + s + "k";
    }
    return sign + "NT$" + abs.toLocaleString("en-US");
  }
  return sign + "NT$" + Math.round(abs).toLocaleString("en-US");
}

export function fmtDelta(n, compact = false) {
  if (n > 0) return "+" + fmtNT(n, compact);
  if (n < 0) return fmtNT(n, compact);
  return fmtNT(0, compact);
}
