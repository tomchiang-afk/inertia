/**
 * v0.3.1 month rhythm only: smooth-pace accrual (pace.js), settings migration (honesty /
 * todayActual removed), and the widget snapshot anchor that keeps app + widget in step.
 * Run: npm run test:unit
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { paceDays, withPace, paceCapped, todaySoFar, DAY_MS, PACE_MAX_DAYS } from "../src/pace.js";
import { derive } from "../src/math.js";
import { migrateAssetsV1 } from "../src/portfolio.js";
import { defaultFx } from "../src/currency.js";
import { buildWidgetSnapshot } from "../src/widgetSnapshot.js";
import { normalizeWidgetPrivacy, PRIVACY_FIELDS } from "../src/widgetPrivacy.js";
import { setLocale } from "../src/i18n/index.js";

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};
const { hydrateState, loadState } = await import("../src/store.js");

const V1 = {
  housing: { marketValue: 18_000_000, mortgage: 5_200_000, monthlyPrincipal: 22_000 },
  equities: { marketValue: 2_450_000, dayPnL: -3_200, periodPnL: 186_000 },
  cash: { checking: 420_000, timeDeposit: 800_000, tdAnnualRate: 1.7 },
  passive: { monthly: 28_500 },
};
const NOW = new Date(2026, 8, 27, 12, 0).getTime();
const base = () => derive(migrateAssetsV1(V1, "en"), defaultFx("TWD"));

test("paceDays: fractional days since anchor, clamped to [0, 45]", () => {
  assert.equal(paceDays(NOW - 2.5 * DAY_MS, NOW), 2.5);
  assert.equal(paceDays(NOW + DAY_MS, NOW), 0, "future anchor (clock change) never goes negative");
  assert.equal(paceDays(NOW - 90 * DAY_MS, NOW), PACE_MAX_DAYS);
  assert.equal(paceDays(undefined, NOW), 0);
  assert.ok(paceCapped(NOW - 46 * DAY_MS, NOW));
  assert.ok(!paceCapped(NOW - 44 * DAY_MS, NOW));
});

test("withPace: net worth grows only by quietDay × days; entered total kept", () => {
  const d = base();
  const p = withPace(d, NOW - 10 * DAY_MS, NOW);
  assert.equal(p.netWorthEntered, 16_470_000);
  assert.ok(Math.abs(p.netWorth - (16_470_000 + d.quietDay * 10)) < 1e-6);
  assert.ok(p.quietDay > 0 && p.paceAccrued > 0);
  // monotonic + linear: equal steps per day, no market component
  const a = withPace(d, NOW - DAY_MS, NOW).netWorth;
  const b = withPace(d, NOW - 2 * DAY_MS, NOW).netWorth;
  assert.ok(Math.abs(b - a - d.quietDay) < 1e-6);
  // quietDay is principal + TD interest + passive, nothing else
  assert.ok(Math.abs(d.quietDay - (d.dailyPrincipal + d.dailyTdInterest + d.dailyPassivePace)) < 1e-9);
});

test("todaySoFar: share of today's rhythm since local midnight", () => {
  const noon = new Date(2026, 8, 27, 12, 0);
  assert.equal(todaySoFar(2_000, noon), 1_000);
  assert.equal(todaySoFar(2_000, new Date(2026, 8, 27, 0, 0)), 0);
});

test("settings migration: honesty + todayActual dropped, anchor added, save rewritten once", () => {
  mem.clear();
  const saved = {
    schemaVersion: 2,
    assets: migrateAssetsV1(V1, "zh-TW"),
    settings: {
      locale: "zh-TW",
      honesty: "actual",
      widgetPrivacy: { displayMode: "exact", fields: { todayActual: false, monthPace: false } },
    },
    goals: [],
  };
  localStorage.setItem("inertia.v1", JSON.stringify(saved));
  const s = loadState();
  assert.ok(!("honesty" in s.settings));
  assert.ok(!("todayActual" in s.settings.widgetPrivacy.fields));
  assert.equal(s.settings.widgetPrivacy.fields.monthPace, false, "other toggles survive");
  assert.ok(s.paceAnchorAt > 0);
  const rewritten = JSON.parse(localStorage.getItem("inertia.v1"));
  assert.ok(!("honesty" in rewritten.settings));
  assert.ok(!("todayActual" in rewritten.settings.widgetPrivacy.fields));
  assert.equal(rewritten.paceAnchorAt, s.paceAnchorAt, "anchor persisted so it doesn't reset each open");
  // second load keeps the same anchor
  assert.equal(loadState().paceAnchorAt, s.paceAnchorAt);
  assert.ok(!PRIVACY_FIELDS.includes("todayActual"));
  assert.ok(!("todayActual" in normalizeWidgetPrivacy({ fields: { todayActual: true } }).fields));
});

test("hydrateState: valid anchor kept; future anchor reset to now", () => {
  const a = hydrateState({ assets: migrateAssetsV1(V1, "en"), paceAnchorAt: NOW - DAY_MS }, { now: NOW });
  assert.equal(a.paceAnchorAt, NOW - DAY_MS);
  const b = hydrateState({ assets: migrateAssetsV1(V1, "en"), paceAnchorAt: NOW + DAY_MS }, { now: NOW });
  assert.equal(b.paceAnchorAt, NOW);
});

test("widget snapshot: accrued net worth, live anchored at the last edit, no market P&L", () => {
  setLocale("zh-TW");
  const anchor = NOW - 10 * DAY_MS;
  const st = {
    assets: migrateAssetsV1(V1, "zh-TW"),
    paceAnchorAt: anchor,
    settings: { widgetTemplate: "paper", widgetPrivacy: { displayMode: "exact", fields: {} } },
    goals: [],
  };
  const s = buildWidgetSnapshot(st, { now: new Date(NOW) });
  const d = base();
  const expected = Math.round(16_470_000 + d.quietDay * 10);
  assert.equal(s.netWorth.text, "NT$" + expected.toLocaleString("en-US"));
  assert.equal(s.live.base, 16_470_000);
  assert.equal(s.live.at, anchor);
  // Native WidgetFormat.extrapolate(base, perDay, at, now) gives the same number at `now`.
  const native = s.live.base + s.live.perDay * Math.min((NOW - s.live.at) / DAY_MS, 45);
  assert.ok(Math.abs(native - expected) < 1);
  const json = JSON.stringify(s);
  assert.ok(!/3,200|186,000|186k|todayActual|dayPnL|periodPnL/.test(json), "no market P&L anywhere in the snapshot");
  // re-pushing the snapshot later never jumps backwards
  const later = buildWidgetSnapshot(st, { now: new Date(NOW + DAY_MS) });
  assert.equal(later.live.base, s.live.base);
  assert.equal(later.live.at, s.live.at);
});
