/**
 * Asset model v2: user-defined lists per category, each item in its own currency.
 *
 * assets = {
 *   properties:   [{ id, alias, marketValue, mortgageBalance, monthlyPrincipal, interestRate|null, currency }],
 *   brokerAccounts: [{ id, alias, market, currency,
 *                      holdings: [{ id, symbol, name, shares, price, costBasis|null }] }],
 *   cashAccounts: [{ id, alias, institution, country, currency, balance,
 *                    type: checking|savings|timeDeposit, rate|null, maturity|null }],
 *   passiveItems: [{ id, name, amount, frequency: monthly|quarterly|semiannual|yearly, currency, tag }],
 * }
 *
 * v1 (schemaVersion missing or 1) had four fixed buckets: housing / equities / cash / passive,
 * all TWD. migrateAssetsV1 turns them into one item per bucket-field, no data dropped.
 */
import { normalizeCurrency, toBase, DEFAULT_BASE } from "./currency.js";

export const SCHEMA_VERSION = 2;
export const DAYS_IN_MONTH = 30;

export const MARKETS = ["TW", "US", "JP", "HK", "CN", "UK", "EU", "Other"];
export const MARKET_CURRENCY = { TW: "TWD", US: "USD", JP: "JPY", HK: "HKD", CN: "CNY", UK: "GBP", EU: "EUR" };
export const CASH_TYPES = ["checking", "savings", "timeDeposit"];
export const FREQUENCIES = ["monthly", "quarterly", "semiannual", "yearly"];
const PER_YEAR = { monthly: 12, quarterly: 4, semiannual: 2, yearly: 1 };

export const CATEGORY_LISTS = {
  house: "properties",
  stock: "brokerAccounts",
  cash: "cashAccounts",
  passive: "passiveItems",
};

export function newId(prefix = "i") {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const optNum = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v, max = 60) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const idOr = (v, prefix) =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : newId(prefix);
const isoDate = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Monthly equivalent of a passive item's amount (in the item's own currency). */
export function monthlyAmount(item) {
  const per = PER_YEAR[item?.frequency] || 12;
  return (num(item?.amount) * per) / 12;
}

export function normalizeMarket(m) {
  const s = str(m, 16);
  if (!s) return "TW";
  const hit = MARKETS.find((x) => x.toLowerCase() === s.toLowerCase());
  return hit || s; // custom market label typed by the user
}

export function normalizeProperty(p, base = DEFAULT_BASE) {
  return {
    id: idOr(p?.id, "p"),
    alias: str(p?.alias) || "Home",
    marketValue: Math.max(0, num(p?.marketValue)),
    mortgageBalance: Math.max(0, num(p?.mortgageBalance)),
    monthlyPrincipal: Math.max(0, num(p?.monthlyPrincipal)),
    interestRate: optNum(p?.interestRate),
    currency: normalizeCurrency(p?.currency, base),
  };
}

export function normalizeHolding(h) {
  return {
    id: idOr(h?.id, "h"),
    symbol: str(h?.symbol, 16).toUpperCase(),
    name: str(h?.name),
    shares: Math.max(0, num(h?.shares)),
    price: Math.max(0, num(h?.price)),
    costBasis: optNum(h?.costBasis),
  };
}

export function normalizeBrokerAccount(a, base = DEFAULT_BASE) {
  const market = normalizeMarket(a?.market);
  return {
    id: idOr(a?.id, "b"),
    alias: str(a?.alias) || market,
    market,
    currency: normalizeCurrency(a?.currency, MARKET_CURRENCY[market] || base),
    holdings: Array.isArray(a?.holdings) ? a.holdings.filter(Boolean).map(normalizeHolding) : [],
  };
}

export function normalizeCashAccount(c, base = DEFAULT_BASE) {
  const type = CASH_TYPES.includes(c?.type) ? c.type : "checking";
  return {
    id: idOr(c?.id, "c"),
    alias: str(c?.alias) || "Cash",
    institution: str(c?.institution),
    country: str(c?.country, 24),
    currency: normalizeCurrency(c?.currency, base),
    balance: num(c?.balance),
    type,
    rate: type === "timeDeposit" ? optNum(c?.rate) : null,
    maturity: type === "timeDeposit" ? isoDate(c?.maturity) : null,
  };
}

export function normalizePassiveItem(i, base = DEFAULT_BASE) {
  return {
    id: idOr(i?.id, "r"),
    name: str(i?.name) || "Income",
    amount: Math.max(0, num(i?.amount)),
    frequency: FREQUENCIES.includes(i?.frequency) ? i.frequency : "monthly",
    currency: normalizeCurrency(i?.currency, base),
    tag: str(i?.tag, 24),
  };
}

export function isV2Assets(a) {
  return !!a && typeof a === "object" && Array.isArray(a.properties);
}

/** Localized default names used only when migrating a v1 save. */
const MIGRATION_NAMES = {
  "zh-TW": { home: "自住", tw: "台股", portfolio: "台股組合", checking: "活存", td: "定存", passive: "股利與租金" },
  en: { home: "Home", tw: "TW stocks", portfolio: "TWSE portfolio", checking: "Checking", td: "Time deposit", passive: "Dividends + rent" },
  es: { home: "Vivienda", tw: "Acciones TW", portfolio: "Cartera TWSE", checking: "Cuenta corriente", td: "Plazo fijo", passive: "Dividendos + alquiler" },
  ja: { home: "自宅", tw: "台湾株", portfolio: "台湾株ポートフォリオ", checking: "普通預金", td: "定期預金", passive: "配当・家賃" },
  ko: { home: "자가", tw: "대만 주식", portfolio: "대만 주식 포트폴리오", checking: "입출금", td: "정기예금", passive: "배당 + 임대료" },
};

export function migrationNames(locale) {
  if (locale && MIGRATION_NAMES[locale]) return MIGRATION_NAMES[locale];
  if (locale && String(locale).toLowerCase().startsWith("zh")) return MIGRATION_NAMES["zh-TW"];
  return MIGRATION_NAMES.en;
}

/**
 * v1 fixed buckets → v2 lists. Every v1 number lands somewhere:
 *  housing.{marketValue,mortgage,monthlyPrincipal} → one property
 *  equities.marketValue → one TW account with one holding (shares 1 × price = market value);
 *  equities.{dayPnL,periodPnL} are dropped (v0.3.1: Inertia shows no market P&L; the raw v1
 *  save is still kept in inertia.v1.backup-schema1)
 *  cash.checking → checking account; cash.{timeDeposit,tdAnnualRate} → time-deposit account
 *  passive.monthly → one monthly passive item
 */
export function migrateAssetsV1(v1, locale) {
  const n = migrationNames(locale);
  const h = v1?.housing || {};
  const e = v1?.equities || {};
  const c = v1?.cash || {};
  const p = v1?.passive || {};
  return {
    properties: [
      normalizeProperty({
        id: "p_home",
        alias: n.home,
        marketValue: h.marketValue,
        mortgageBalance: h.mortgage,
        monthlyPrincipal: h.monthlyPrincipal,
        currency: "TWD",
      }),
    ],
    brokerAccounts: [
      normalizeBrokerAccount({
        id: "b_tw",
        alias: n.tw,
        market: "TW",
        currency: "TWD",
        holdings: [{ id: "h_tw", symbol: "", name: n.portfolio, shares: 1, price: num(e.marketValue) }],
      }),
    ],
    cashAccounts: [
      normalizeCashAccount({ id: "c_chk", alias: n.checking, currency: "TWD", balance: c.checking, type: "checking" }),
      normalizeCashAccount({
        id: "c_td",
        alias: n.td,
        currency: "TWD",
        balance: c.timeDeposit,
        type: "timeDeposit",
        rate: c.tdAnnualRate,
      }),
    ],
    passiveItems: [
      normalizePassiveItem({ id: "r_passive", name: n.passive, amount: p.monthly, frequency: "monthly", currency: "TWD" }),
    ],
  };
}

export function normalizeAssets(raw, { base = DEFAULT_BASE, locale } = {}) {
  const a = isV2Assets(raw) ? raw : raw && typeof raw === "object" && (raw.housing || raw.equities || raw.cash || raw.passive)
    ? migrateAssetsV1(fillV1(raw), locale)
    : demoAssets(locale);
  const arr = (x) => (Array.isArray(x) ? x.filter(Boolean) : []);
  return {
    properties: arr(a.properties).map((p) => normalizeProperty(p, base)),
    brokerAccounts: arr(a.brokerAccounts).map((b) => normalizeBrokerAccount(b, base)),
    cashAccounts: arr(a.cashAccounts).map((c) => normalizeCashAccount(c, base)),
    passiveItems: arr(a.passiveItems).map((i) => normalizePassiveItem(i, base)),
  };
}

/** v1 partial saves were merged over defaults on load; keep that behavior during migration. */
const V1_DEFAULTS = {
  housing: { marketValue: 18_000_000, mortgage: 5_200_000, monthlyPrincipal: 22_000 },
  equities: { marketValue: 2_450_000, dayPnL: -3_200, periodPnL: 186_000 },
  cash: { checking: 420_000, timeDeposit: 800_000, tdAnnualRate: 1.7 },
  passive: { monthly: 28_500 },
};
function fillV1(raw) {
  return {
    housing: { ...V1_DEFAULTS.housing, ...(raw.housing || {}) },
    equities: { ...V1_DEFAULTS.equities, ...(raw.equities || {}) },
    cash: { ...V1_DEFAULTS.cash, ...(raw.cash || {}) },
    passive: { ...V1_DEFAULTS.passive, ...(raw.passive || {}) },
  };
}

/** Sample data for a fresh install: variety across markets and currencies (Taiwan household). */
export function demoAssets(locale) {
  const zh = !locale || String(locale).startsWith("zh");
  const L = (z, e) => (zh ? z : e);
  return {
    properties: [
      { id: "p_demo1", alias: L("自住 · 信義區", "Home · Xinyi"), marketValue: 18_000_000, mortgageBalance: 5_200_000, monthlyPrincipal: 22_000, interestRate: 2.06, currency: "TWD" },
      { id: "p_demo2", alias: L("出租套房 · 板橋", "Rental studio · Banqiao"), marketValue: 8_600_000, mortgageBalance: 3_100_000, monthlyPrincipal: 14_500, interestRate: 2.19, currency: "TWD" },
    ],
    brokerAccounts: [
      {
        id: "b_demo_tw", alias: L("國泰證券", "Cathay Securities"), market: "TW", currency: "TWD",
        holdings: [
          { id: "h_2330", symbol: "2330", name: L("台積電", "TSMC"), shares: 1_000, price: 980, costBasis: 610 },
          { id: "h_0050", symbol: "0050", name: L("元大台灣50", "Yuanta Taiwan 50"), shares: 3_000, price: 178.5, costBasis: 142 },
          { id: "h_00878", symbol: "00878", name: L("國泰永續高股息", "Cathay ESG High Div"), shares: 5_000, price: 22.1, costBasis: 20.4 },
        ],
      },
      {
        id: "b_demo_us", alias: "Firstrade", market: "US", currency: "USD",
        holdings: [
          { id: "h_voo", symbol: "VOO", name: "Vanguard S&P 500 ETF", shares: 60, price: 540, costBasis: 455 },
          { id: "h_aapl", symbol: "AAPL", name: "Apple", shares: 40, price: 228, costBasis: 172 },
        ],
      },
    ],
    cashAccounts: [
      { id: "c_demo1", alias: L("Richart 活存", "Richart checking"), institution: L("台新銀行", "Taishin Bank"), country: "TW", currency: "TWD", balance: 420_000, type: "checking" },
      { id: "c_demo2", alias: L("一年期定存", "1-year time deposit"), institution: L("玉山銀行", "E.SUN Bank"), country: "TW", currency: "TWD", balance: 800_000, type: "timeDeposit", rate: 1.7, maturity: "2027-03-15" },
      { id: "c_demo3", alias: L("美元外幣帳戶", "USD account"), institution: L("國泰世華", "Cathay United"), country: "TW", currency: "USD", balance: 12_000, type: "savings" },
      { id: "c_demo4", alias: L("日圓帳戶", "JPY account"), institution: "MUFG", country: "JP", currency: "JPY", balance: 350_000, type: "checking" },
    ],
    passiveItems: [
      { id: "r_demo1", name: L("台股股利", "TW dividends"), amount: 96_000, frequency: "yearly", currency: "TWD", tag: L("股利", "Dividend") },
      { id: "r_demo2", name: L("板橋套房租金", "Banqiao rent"), amount: 18_000, frequency: "monthly", currency: "TWD", tag: L("租金", "Rent") },
      { id: "r_demo3", name: L("美股股利 VOO", "VOO dividends"), amount: 105, frequency: "quarterly", currency: "USD", tag: L("股利", "Dividend") },
      { id: "r_demo4", name: L("美債 ETF 債息", "Treasury ETF coupons"), amount: 60, frequency: "monthly", currency: "USD", tag: L("債券息", "Bond") },
      { id: "r_demo5", name: L("版稅", "Royalties"), amount: 24_000, frequency: "semiannual", currency: "TWD", tag: L("版稅", "Royalty") },
    ],
  };
}

export function holdingValue(h) {
  return num(h?.shares) * num(h?.price);
}

export function accountValue(a) {
  return (a?.holdings || []).reduce((s, h) => s + holdingValue(h), 0);
}

/**
 * Category aggregates in the base currency.
 * Items whose currency has no FX rate are excluded and counted in `missingFx`.
 */
export function aggregate(assets, fx) {
  const a = isV2Assets(assets) ? assets : normalizeAssets(assets, { base: fx?.base });
  const missing = new Set();
  const conv = (amount, ccy) => {
    const v = toBase(amount, ccy, fx);
    if (v == null) {
      missing.add(normalizeCurrency(ccy));
      return 0;
    }
    return v;
  };

  let housingValue = 0, mortgage = 0, monthlyPrincipal = 0;
  for (const p of a.properties) {
    housingValue += conv(p.marketValue, p.currency);
    mortgage += conv(p.mortgageBalance, p.currency);
    monthlyPrincipal += conv(p.monthlyPrincipal, p.currency);
  }

  let stocks = 0, holdings = 0;
  for (const b of a.brokerAccounts) {
    stocks += conv(accountValue(b), b.currency);
    holdings += b.holdings.length;
  }

  let cash = 0, annualTdInterest = 0;
  const cashCurrencies = new Set();
  for (const c of a.cashAccounts) {
    const v = conv(c.balance, c.currency);
    cash += v;
    cashCurrencies.add(c.currency);
    if (c.type === "timeDeposit" && c.rate > 0) annualTdInterest += v * (c.rate / 100);
  }

  let passiveMonthly = 0;
  for (const i of a.passiveItems) passiveMonthly += conv(monthlyAmount(i), i.currency);

  const netEquity = housingValue - mortgage;
  return {
    base: fx?.base || DEFAULT_BASE,
    housingValue,
    mortgage,
    monthlyPrincipal,
    netEquity,
    stocks,
    cashTotal: cash,
    passiveMonthly,
    annualTdInterest,
    netWorth: netEquity + stocks + cash,
    counts: {
      properties: a.properties.length,
      accounts: a.brokerAccounts.length,
      holdings,
      cash: a.cashAccounts.length,
      cashCurrencies: cashCurrencies.size,
      passive: a.passiveItems.length,
    },
    missingFx: [...missing],
  };
}
