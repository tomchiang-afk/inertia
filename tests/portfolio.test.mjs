/**
 * v2 asset model: migration, FX, passive normalization, aggregates, formatting.
 * Run: npm run test:unit
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  migrateAssetsV1,
  normalizeAssets,
  monthlyAmount,
  aggregate,
  demoAssets,
  SCHEMA_VERSION,
  normalizeBrokerAccount,
  normalizeCashAccount,
} from "../src/portfolio.js";
import {
  defaultFx,
  rebaseFx,
  toBase,
  convert,
  rateToBase,
  withRate,
  ensureCurrency,
  normalizeFx,
  currencySymbol,
  roundSig,
  fmtRateInput,
} from "../src/currency.js";
import { fmtMoney, fmtCompact, fmtRounded, fmtMasked } from "../src/format.js";
import { derive } from "../src/math.js";
import { goalProgress } from "../src/goals.js";

// localStorage shim for store.js
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};
const { hydrateState, loadState, V1_BACKUP_KEY } = await import("../src/store.js");

const V1 = {
  housing: { marketValue: 18_000_000, mortgage: 5_200_000, monthlyPrincipal: 22_000 },
  equities: { marketValue: 2_450_000, dayPnL: -3_200, periodPnL: 186_000 },
  cash: { checking: 420_000, timeDeposit: 800_000, tdAnnualRate: 1.7 },
  passive: { monthly: 28_500 },
};
const V1_QUIET_DAY = 22_000 / 30 + (800_000 * 0.017) / 365 + 28_500 / 30;

/* ------------------------------------------------------------ migration */

test("migration: v1 fixed buckets → v2 lists, every number preserved", () => {
  const a = migrateAssetsV1(V1, "zh-TW");
  assert.equal(a.properties.length, 1);
  assert.deepEqual(
    { ...a.properties[0], id: undefined },
    { id: undefined, alias: "自住", marketValue: 18_000_000, mortgageBalance: 5_200_000, monthlyPrincipal: 22_000, interestRate: null, currency: "TWD" }
  );
  const acct = a.brokerAccounts[0];
  assert.equal(acct.market, "TW");
  assert.equal(acct.currency, "TWD");
  assert.equal(acct.alias, "台股");
  assert.ok(!("dayPnL" in acct) && !("periodPnL" in acct), "v0.3.1: market P&L is not carried into v2");
  assert.equal(acct.holdings.length, 1);
  assert.equal(acct.holdings[0].shares * acct.holdings[0].price, 2_450_000);
  assert.deepEqual(
    a.cashAccounts.map((c) => [c.type, c.balance, c.rate]),
    [["checking", 420_000, null], ["timeDeposit", 800_000, 1.7]]
  );
  assert.deepEqual(
    a.passiveItems.map((p) => [p.name, p.amount, p.frequency, p.currency]),
    [["股利與租金", 28_500, "monthly", "TWD"]]
  );
});

test("migration: aggregates equal the v1 math (net worth + quiet day)", () => {
  const d = derive(migrateAssetsV1(V1, "en"), defaultFx("TWD"));
  assert.equal(d.netWorth, 16_470_000);
  assert.equal(d.netEquity, 12_800_000);
  assert.equal(d.stocks, 2_450_000);
  assert.equal(d.cashTotal, 1_220_000);
  assert.equal(d.passiveMonthly, 28_500);
  assert.equal(d.dayPnL, undefined, "no market P&L aggregate (month rhythm only)");
  assert.ok(Math.abs(d.quietDay - V1_QUIET_DAY) < 1e-9);
});

test("migration: names follow saved locale; English fallback", () => {
  assert.equal(migrateAssetsV1(V1, "en").properties[0].alias, "Home");
  assert.equal(migrateAssetsV1(V1, "ja").properties[0].alias, "自宅");
  assert.equal(migrateAssetsV1(V1, "ko").cashAccounts[1].alias, "정기예금");
  assert.equal(migrateAssetsV1(V1, "xx").properties[0].alias, "Home");
});

test("hydrateState: partial v1 save merges v1 defaults (same as old loadState), keeps goals/settings", () => {
  const s = hydrateState({
    assets: { housing: { marketValue: 20_000_000 } },
    settings: { locale: "en", widgetTemplate: "noir", buyout: true },
    goals: [{ id: "g1", name: "X", target: 1, align: "passiveMonth", onWidget: true }],
  });
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.migratedFrom, 1);
  assert.equal(s.assets.properties[0].marketValue, 20_000_000);
  assert.equal(s.assets.properties[0].mortgageBalance, 5_200_000);
  assert.equal(s.settings.widgetStyle, "editorial");
  assert.equal(s.settings.widgetTemplate, undefined);
  assert.equal(s.settings.buyout, true);
  assert.equal(s.settings.fx.base, "TWD");
  assert.equal(s.goals.length, 1);
});

test("hydrateState: v2 save is stable (idempotent round trip)", () => {
  const first = hydrateState({ assets: demoAssets("en"), settings: { locale: "en" } });
  const second = hydrateState(JSON.parse(JSON.stringify({ assets: first.assets, settings: first.settings })));
  assert.equal(second.migratedFrom, undefined);
  assert.deepEqual(second.assets, first.assets);
});

test("loadState: migrates stored v1 once, writes schemaVersion and keeps a raw backup", () => {
  localStorage.clear();
  const raw = JSON.stringify({ assets: V1, settings: { locale: "zh-TW" }, goals: [] });
  localStorage.setItem("inertia.v1", raw);
  const s = loadState();
  assert.equal(s.assets.properties[0].alias, "自住");
  const saved = JSON.parse(localStorage.getItem("inertia.v1"));
  assert.equal(saved.schemaVersion, 2);
  assert.ok(Array.isArray(saved.assets.properties));
  assert.equal(localStorage.getItem(V1_BACKUP_KEY), raw);
  // second load: already v2, backup untouched
  const again = loadState();
  assert.deepEqual(again.assets, s.assets);
});

test("loadState: fresh install gets varied demo data", () => {
  localStorage.clear();
  const s = loadState();
  const a = s.assets;
  assert.equal(a.properties.length, 2);
  assert.deepEqual(a.brokerAccounts.map((b) => b.market), ["TW", "US"]);
  assert.deepEqual(a.brokerAccounts.flatMap((b) => b.holdings.map((h) => h.symbol)), ["2330", "0050", "00878", "VOO", "AAPL"]);
  assert.deepEqual([...new Set(a.cashAccounts.map((c) => c.currency))], ["TWD", "USD", "JPY"]);
  assert.ok(a.passiveItems.length >= 4);
  assert.deepEqual([...new Set(a.passiveItems.map((p) => p.frequency))].sort(), ["monthly", "quarterly", "semiannual", "yearly"]);
});

/* ------------------------------------------------------------ FX */

test("FX: default table, conversion to base and cross rates", () => {
  const fx = defaultFx("TWD");
  assert.equal(fx.base, "TWD");
  assert.equal(rateToBase("TWD", fx), 1);
  assert.equal(toBase(100, "USD", fx), 3_050);
  assert.equal(toBase(1_000_000, "JPY", fx), 210_000);
  assert.ok(Math.abs(convert(100, "USD", "JPY", fx) - 3_050 / 0.21) < 1e-9);
  assert.equal(toBase(5, "XYZ", fx), null, "unknown currency → null, never guessed");
});

test("FX: rebase keeps cross rates and adds the old base", () => {
  const usd = rebaseFx(defaultFx("TWD"), "USD");
  assert.equal(usd.base, "USD");
  assert.ok(!("USD" in usd.rates));
  assert.ok(Math.abs(usd.rates.TWD - 1 / 30.5) < 1e-6);
  assert.ok(Math.abs(usd.rates.JPY - 0.21 / 30.5) < 1e-6);
  // round trip
  const back = rebaseFx(usd, "TWD");
  assert.ok(Math.abs(back.rates.USD - 30.5) < 1e-3);
  assert.ok(Math.abs(back.rates.JPY - 0.21) < 1e-5);
  // defaultFx(base) = rebased reference table
  assert.equal(defaultFx("USD").base, "USD");
});

test("FX: base round trips (TWD → USD → JPY → TWD) keep rates and totals exact", () => {
  const start = defaultFx("TWD");
  const back = rebaseFx(rebaseFx(rebaseFx(start, "USD"), "JPY"), "TWD");
  for (const [code, r] of Object.entries(start.rates)) assert.equal(back.rates[code], r, code);
  const assets = demoAssets("zh-TW");
  assert.equal(derive(assets, back).netEquity, derive(assets, start).netEquity);
});

test("FX: user edits stamp a date; unknown codes are added with null rate", () => {
  let fx = withRate(defaultFx("TWD"), "usd", 31.2, { date: "2026-10-01" });
  assert.equal(fx.rates.USD, 31.2);
  assert.equal(fx.updatedAt, "2026-10-01");
  assert.equal(fx.edited, true);
  fx = ensureCurrency(fx, "THB");
  assert.equal(fx.rates.THB, null);
  const n = normalizeFx({ base: "twd", rates: { usd: "30", "not-a-code": 1, EUR: -1 } });
  assert.deepEqual(n.rates, { USD: 30, EUR: null });
});

test("aggregate: items without an FX rate are excluded and reported", () => {
  const fx = { base: "TWD", rates: { USD: 30 } };
  const agg = aggregate(
    {
      properties: [],
      brokerAccounts: [],
      cashAccounts: [
        normalizeCashAccount({ currency: "TWD", balance: 1000 }),
        normalizeCashAccount({ currency: "USD", balance: 10 }),
        normalizeCashAccount({ currency: "THB", balance: 999 }),
      ],
      passiveItems: [],
    },
    fx
  );
  assert.equal(agg.cashTotal, 1300);
  assert.deepEqual(agg.missingFx, ["THB"]);
});

/* ------------------------------------------------------------ passive + aggregates */

test("passive: every frequency normalizes to a monthly pace", () => {
  assert.equal(monthlyAmount({ amount: 1200, frequency: "monthly" }), 1200);
  assert.equal(monthlyAmount({ amount: 1200, frequency: "quarterly" }), 400);
  assert.equal(monthlyAmount({ amount: 1200, frequency: "semiannual" }), 200);
  assert.equal(monthlyAmount({ amount: 1200, frequency: "yearly" }), 100);
  assert.equal(monthlyAmount({ amount: 1200, frequency: "bogus" }), 1200);
});

test("aggregate: demo portfolio in TWD — categories, counts, quiet day parts", () => {
  const d = derive(demoAssets("zh-TW"), defaultFx("TWD"));
  // housing: (18M − 5.2M) + (8.6M − 3.1M)
  assert.equal(d.netEquity, 18_300_000);
  // stocks: TW 980k + 535.5k + 110.5k; US (32,400 + 9,120) × 30.5
  assert.equal(d.stocks, 1_626_000 + 41_520 * 30.5);
  // cash: 420k + 800k + 12k × 30.5 + 350k × 0.21
  assert.equal(Math.round(d.cashTotal), 1_220_000 + 366_000 + 73_500);
  // passive: 8,000 + 18,000 + (105/3 + 60) × 30.5 + 4,000
  assert.ok(Math.abs(d.passiveMonthly - (8_000 + 18_000 + 95 * 30.5 + 4_000)) < 1e-6);
  assert.equal(d.monthlyPrincipal, 36_500);
  assert.ok(Math.abs(d.dailyTdInterest - (800_000 * 0.017) / 365) < 1e-9);
  assert.deepEqual(d.counts, { properties: 2, accounts: 2, holdings: 5, cash: 4, cashCurrencies: 3, passive: 5 });
  assert.deepEqual(d.missingFx, []);
});

test("brokerage account: market defaults the currency; custom market kept", () => {
  assert.equal(normalizeBrokerAccount({ market: "JP" }).currency, "JPY");
  assert.equal(normalizeBrokerAccount({ market: "us" }).market, "US");
  const custom = normalizeBrokerAccount({ market: "Crypto", currency: "usd" });
  assert.equal(custom.market, "Crypto");
  assert.equal(custom.currency, "USD");
});

test("goals: passiveMonth aligns to the normalized base-currency pace", () => {
  const d = derive(demoAssets("en"), defaultFx("TWD"));
  const p = goalProgress({ align: "passiveMonth", target: d.passiveMonthly * 2 }, null, d);
  assert.equal(p.pct, 50);
});

/* ------------------------------------------------------------ formatting */

test("format: symbols, exact, compact, rounded, masked per currency", () => {
  assert.equal(currencySymbol("TWD"), "NT$");
  assert.equal(currencySymbol("USD"), "US$");
  assert.equal(currencySymbol("JPY"), "JP¥");
  assert.equal(currencySymbol("THB"), "THB ");
  assert.equal(fmtMoney(16_470_000, "TWD"), "NT$16,470,000");
  assert.equal(fmtMoney(-3_200, "TWD"), "−NT$3,200");
  assert.equal(fmtMoney(178.5, "TWD", { decimals: 2 }), "NT$178.50");
  assert.equal(fmtCompact(16_470_000, "TWD"), "NT$16M");
  assert.equal(fmtCompact(28_500, "TWD"), "NT$28.5k");
  assert.equal(fmtCompact(9_999, "USD"), "US$9,999");
  assert.equal(fmtCompact(2_300_000_000, "JPY"), "JP¥2.3B");
  assert.equal(fmtRounded(16_470_000, "TWD"), "NT$1,647 萬");
  assert.equal(fmtRounded(51_600, "TWD", { delta: true }), "+NT$5 萬");
  assert.equal(fmtRounded(506_800, "USD"), "US$507k");
  assert.equal(fmtRounded(1_234_567, "USD"), "US$1.2M");
  assert.equal(fmtRounded(74_529_412, "JPY"), "JP¥74.5M");
  assert.equal(fmtRounded(843, "EUR"), "€840");
  assert.equal(fmtRounded(-2_500, "USD", { delta: true }), "−US$3k");
  assert.equal(fmtMasked("EUR"), "€••••••");
});

test("FX: roundSig / fmtRateInput", () => {
  assert.equal(roundSig(0.1 + 0.2), 0.3);
  assert.equal(roundSig(1 / (1 / 30.5)), 30.5);
  assert.equal(fmtRateInput(1 / 30.5), "0.0327869");
  assert.equal(fmtRateInput(null), "");
});

test("FX: a rate edit after a base switch becomes the new anchor", () => {
  let fx = rebaseFx(defaultFx("TWD"), "USD");
  assert.equal(fx.anchor.base, "TWD");
  fx = withRate(fx, "JPY", 0.007, { date: "2026-10-01" });
  assert.equal(fx.anchor, undefined);
  const twd = rebaseFx(fx, "TWD");
  assert.equal(twd.rates.USD, roundSig(1 / fx.rates.TWD));
  assert.equal(twd.rates.JPY, roundSig(0.007 / fx.rates.TWD));
  // anchor survives normalize (persisted state)
  const persisted = normalizeFx(JSON.parse(JSON.stringify(rebaseFx(defaultFx("TWD"), "EUR"))));
  assert.equal(rebaseFx(persisted, "TWD").rates.USD, 30.5);
});
