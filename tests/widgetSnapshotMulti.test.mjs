/**
 * Widget snapshot with a non-TWD base currency, per privacy mode.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWidgetSnapshot } from "../src/widgetSnapshot.js";
import { setLocale } from "../src/i18n/index.js";
import { rebaseFx } from "../src/currency.js";

const FX_USD = { base: "USD", rates: { TWD: 0.03125, JPY: 0.0068 }, updatedAt: "2026-09-27", edited: true };
const ASSETS = {
  properties: [{ id: "p1", alias: "Condo", marketValue: 640_000, mortgageBalance: 240_000, monthlyPrincipal: 1_200, currency: "USD" }],
  brokerAccounts: [
    { id: "b1", alias: "Schwab", market: "US", currency: "USD", dayPnL: -150, periodPnL: 2_000, holdings: [{ id: "h1", symbol: "VOO", shares: 100, price: 500 }] },
    { id: "b2", alias: "國泰", market: "TW", currency: "TWD", holdings: [{ id: "h2", symbol: "2330", shares: 1_000, price: 960 }] },
  ],
  cashAccounts: [
    { id: "c1", alias: "Chase", currency: "USD", balance: 20_000, type: "checking" },
    { id: "c2", alias: "MUFG TD", currency: "JPY", balance: 1_000_000, type: "timeDeposit", rate: 0.5 },
  ],
  passiveItems: [
    { id: "r1", name: "VOO div", amount: 300, frequency: "quarterly", currency: "USD" },
    { id: "r2", name: "板橋租金", amount: 32_000, frequency: "monthly", currency: "TWD" },
  ],
};
// net worth = 400,000 + (50,000 + 30,000) + (20,000 + 6,800) = 506,800 USD; passive 1,100/mo
const NOW = new Date(2026, 8, 15, 9, 30);

function state(mode = "exact", fx = FX_USD, fields = {}) {
  return {
    assets: structuredClone(ASSETS),
    settings: { widgetTemplate: "paper", widgetPrivacy: { displayMode: mode, fields }, fx },
    goals: [{ id: "g1", name: "FIRE", target: 600_000, align: "netWorth", onWidget: true }],
  };
}

test.beforeEach(() => setLocale("en"));

test("USD base / exact: amounts in US$, live carries prefix", () => {
  const s = buildWidgetSnapshot(state(), { now: NOW });
  assert.deepEqual(s.currency, { code: "USD", symbol: "US$" });
  assert.equal(s.netWorth.text, "US$506,800");
  assert.equal(s.netWorth.short, "US$507k");
  assert.match(s.pace.text, /^\+US\$\d/);
  assert.equal(s.goal.text, "84% · US$507k");
  assert.equal(s.goal.barPct, 84.5);
  assert.deepEqual(s.live && { f: s.live.format, p: s.live.prefix, b: s.live.base }, { f: "exact", p: "US$", b: 506_800 });
  assert.deepEqual(
    s.buckets.map((b) => [b.key, b.label, b.text]),
    [
      ["housing", "Housing", "US$400k"],
      ["stocks", "Stocks", "US$80k"],
      ["cash", "Cash", "US$26.8k"],
      ["passive", "Passive", "US$1,100/mo"],
    ]
  );
  assert.doesNotMatch(JSON.stringify(s), /NT\$/);
});

test("USD base / rounded: k/M rounding (no 萬), live format 'round'", () => {
  const s = buildWidgetSnapshot(state("rounded"), { now: NOW });
  assert.equal(s.netWorth.text, "US$507k");
  assert.equal(s.live.format, "round");
  assert.equal(s.live.prefix, "US$");
  assert.match(s.pace.text, /^\+US\$\d+(\.\d)?k$/);
  assert.equal(s.goal.text, "84% · US$507k");
  assert.doesNotMatch(JSON.stringify(s.buckets), /萬/);
});

test("USD base / relative: no currency symbol or absolute digits", () => {
  const s = buildWidgetSnapshot(state("relative"), { now: NOW });
  const txt = JSON.stringify([s.netWorth, s.pace, s.goal, s.buckets]);
  assert.doesNotMatch(txt, /US\$|NT\$/);
  assert.doesNotMatch(txt, /\d{1,3}(,\d{3})+/);
  assert.equal(s.live, null);
  assert.equal(s.goal.text, "84%");
  assert.deepEqual(s.buckets.map((b) => [b.key, b.text]), [["housing", "79%"], ["stocks", "16%"], ["cash", "5%"]]);
});

test("USD base / rhythm: no numbers", () => {
  const s = buildWidgetSnapshot(state("rhythm"), { now: NOW });
  assert.equal(s.netWorth.show, false);
  assert.deepEqual(s.buckets, []);
  assert.equal(s.live, null);
  assert.doesNotMatch(JSON.stringify([s.netWorth.text, s.pace.text, s.goal.text]), /\d/);
});

test("USD base / masked: US$•••••• only, no raw value anywhere", () => {
  const s = buildWidgetSnapshot(state("masked"), { now: NOW });
  assert.equal(s.netWorth.text, "US$••••••");
  assert.equal(s.pace.text, "+••••");
  assert.ok(s.buckets.every((b) => b.text === "US$••••••"));
  assert.equal(s.live, null);
  assert.doesNotMatch(JSON.stringify(s), /506,?800/);
});

test("JPY base: rebased FX, JP¥ exact + M rounding", () => {
  const jpy = rebaseFx(FX_USD, "JPY");
  const exact = buildWidgetSnapshot(state("exact", jpy), { now: NOW });
  assert.equal(exact.currency.symbol, "JP¥");
  assert.match(exact.netWorth.text, /^JP¥74,52\d,\d{3}$/);
  const rounded = buildWidgetSnapshot(state("rounded", jpy), { now: NOW });
  assert.equal(rounded.netWorth.text, "JP¥74.5M");
});

test("TWD base keeps 萬 in rounded mode and live 'wan'", () => {
  const twd = rebaseFx(FX_USD, "TWD");
  const s = buildWidgetSnapshot(state("rounded", twd), { now: NOW });
  assert.match(s.netWorth.text, /^NT\$1,62\d 萬$/);
  assert.equal(s.live.format, "wan");
  assert.equal(s.live.prefix, "NT$");
});

test("zh-TW labels: stocks bucket reads 股票", () => {
  setLocale("zh-TW");
  const s = buildWidgetSnapshot(state(), { now: NOW });
  assert.equal(s.buckets[1].label, "股票");
});
