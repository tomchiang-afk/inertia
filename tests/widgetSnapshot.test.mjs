/**
 * Unit tests for the native widget snapshot builder.
 * Run: npm run test:unit   (node --test, no browser)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWidgetSnapshot, WIDGET_SNAPSHOT_VERSION } from "../src/widgetSnapshot.js";
import { setLocale } from "../src/i18n/index.js";

const ASSETS = {
  housing: { marketValue: 18_000_000, mortgage: 5_200_000, monthlyPrincipal: 22_000 },
  equities: { marketValue: 2_450_000, dayPnL: -3_200, periodPnL: 186_000 },
  cash: { checking: 420_000, timeDeposit: 800_000, tdAnnualRate: 1.7 },
  passive: { monthly: 28_500 },
};
// net worth = 12.8M + 2.45M + 1.22M = 16,470,000
const NOW = new Date(2026, 8, 15, 9, 30); // 15 Sep 2026 → 50% of month

function state({ mode = "exact", fields = {}, template = "paper", goals } = {}) {
  return {
    assets: structuredClone(ASSETS),
    settings: { widgetTemplate: template, widgetPrivacy: { displayMode: mode, fields } },
    goals:
      goals ?? [
        { id: "g1", name: "頭期款", target: 20_000_000, align: "netWorth", onWidget: true },
        { id: "g2", name: "Other", target: 1_000_000, align: "cash", onWidget: false },
      ],
  };
}

const RAW_DIGITS = /\d{1,3}(,\d{3})+/; // e.g. 16,470,000

function allText(s) {
  return JSON.stringify({
    nw: s.netWorth.text + s.netWorth.short,
    pace: s.pace.text,
    goal: s.goal.text,
    buckets: s.buckets,
  });
}

test.beforeEach(() => setLocale("zh-TW"));

test("exact: full amounts, compact short, live extrapolation data", () => {
  const s = buildWidgetSnapshot(state(), { now: NOW });
  assert.equal(s.v, WIDGET_SNAPSHOT_VERSION);
  assert.equal(s.brand, "Inertia");
  assert.equal(s.mode, "exact");
  assert.equal(s.netWorth.show, true);
  assert.equal(s.netWorth.label, "淨資產");
  assert.equal(s.netWorth.text, "NT$16,470,000");
  assert.equal(s.netWorth.short, "NT$16M");
  assert.match(s.pace.text, /^\+NT\$\d/);
  assert.equal(s.pace.label, "月節奏");
  assert.equal(s.rhythm.show, true);
  assert.equal(s.rhythm.pct, 50);
  assert.equal(s.goal.show, true);
  assert.equal(s.goal.name, "頭期款");
  assert.match(s.goal.text, /^82% · NT\$16M$/);
  assert.equal(s.goal.barPct, 82.4);
  assert.ok(s.live);
  assert.equal(s.live.format, "exact");
  assert.equal(s.live.base, 16_470_000);
  assert.ok(s.live.perDay > 0);
  assert.equal(s.live.at, NOW.getTime());
  assert.deepEqual(s.buckets.map((b) => b.key), ["housing", "twse", "cash", "passive"]);
  assert.equal(s.buckets[3].text, "NT$28.5k/月");
  assert.equal(s.updatedAt, NOW.getTime());
  assert.equal(s.labels.updated, "更新");
});

test("rounded: amounts in 萬, live uses wan format", () => {
  const s = buildWidgetSnapshot(state({ mode: "rounded" }), { now: NOW });
  assert.equal(s.netWorth.text, "NT$1,647 萬");
  assert.equal(s.netWorth.short, "NT$1,647 萬");
  assert.match(s.pace.text, /^\+NT\$\d+ 萬$/);
  assert.equal(s.live.format, "wan");
  assert.equal(s.live.unit, "萬");
  assert.match(s.goal.text, /^82% · NT\$1,647 萬$/);
});

test("relative: no absolute NT$ anywhere, month progress + % only", () => {
  const s = buildWidgetSnapshot(state({ mode: "relative" }), { now: NOW });
  const txt = allText(s);
  assert.doesNotMatch(txt, /NT\$/);
  assert.doesNotMatch(txt, RAW_DIGITS);
  assert.match(s.netWorth.text, /^本月進度 \d+%$/);
  assert.equal(s.netWorth.monthProgressTemplate, "本月進度 {pct}%");
  assert.match(s.pace.text, /^\+\d+(\.\d+)?%$/);
  assert.equal(s.goal.text, "82%");
  assert.equal(s.goal.barPct, 82.4);
  assert.equal(s.live, null);
  assert.ok(!s.buckets.some((b) => b.key === "passive"));
});

test("rhythm: no numbers at all, rhythm + goal bar only", () => {
  const s = buildWidgetSnapshot(state({ mode: "rhythm" }), { now: NOW });
  assert.equal(s.netWorth.show, false);
  assert.equal(s.netWorth.text, "");
  assert.equal(s.pace.show, false);
  assert.equal(s.pace.text, "");
  assert.equal(s.goal.text, "");
  assert.equal(s.goal.show, true);
  assert.equal(s.goal.barPct, 82.4);
  assert.deepEqual(s.buckets, []);
  assert.equal(s.live, null);
  assert.equal(s.rhythm.show, true);
  assert.doesNotMatch(allText(s), /\d/);
});

test("rhythm: rhythm bar stays even with monthPace field off", () => {
  const s = buildWidgetSnapshot(state({ mode: "rhythm", fields: { monthPace: false } }), { now: NOW });
  assert.equal(s.rhythm.show, true);
});

test("masked: bullets only, goal ratio and bar fill hidden, no live data", () => {
  const s = buildWidgetSnapshot(state({ mode: "masked" }), { now: NOW });
  assert.equal(s.netWorth.text, "NT$••••••");
  assert.equal(s.netWorth.short, "NT$••••••");
  assert.equal(s.pace.text, "+••••");
  assert.equal(s.goal.text, "••••");
  assert.equal(s.goal.barPct, null);
  assert.equal(s.live, null);
  assert.ok(s.buckets.every((b) => b.text === "NT$••••••"));
  assert.doesNotMatch(allText(s), /\d/);
  // raw numbers must not leak anywhere in the payload
  assert.doesNotMatch(JSON.stringify(s), /16470000|16,470,000/);
});

test("field toggles: netWorth / monthPace / goalProgress / buckets off", () => {
  const s = buildWidgetSnapshot(
    state({
      fields: { netWorth: false, monthPace: false, goalProgress: false, bucketTwse: false, bucketCash: false },
    }),
    { now: NOW }
  );
  assert.equal(s.netWorth.show, false);
  assert.equal(s.netWorth.text, "");
  assert.equal(s.live, null, "no live base when net worth hidden");
  assert.doesNotMatch(JSON.stringify(s), /16470000/);
  assert.equal(s.pace.show, false);
  assert.equal(s.rhythm.show, false);
  assert.equal(s.goal.show, false);
  assert.deepEqual(s.buckets.map((b) => b.key), ["housing", "passive"]);
});

test("no onWidget goal → goal hidden", () => {
  const s = buildWidgetSnapshot(
    state({ goals: [{ id: "g1", name: "A", target: 1, align: "cash", onWidget: false }] }),
    { now: NOW }
  );
  assert.equal(s.goal.show, false);
});

test("templates map to theme + rhythm style", () => {
  const cases = {
    paper: ["light", "bars"],
    swiss: ["light", "bars-sharp"],
    sumi: ["light", "ink"],
    glass: ["light", "dots"],
    noir: ["dark", "dots"],
    matrix: ["light", "scan"],
    bogus: ["light", "bars"],
  };
  for (const [tpl, [theme, style]] of Object.entries(cases)) {
    const s = buildWidgetSnapshot(state({ template: tpl }), { now: NOW });
    assert.equal(s.theme, theme, tpl);
    assert.equal(s.rhythm.style, style, tpl);
    assert.equal(s.template, tpl === "bogus" ? "paper" : tpl);
  }
});

test("locale: labels follow app locale, brand stays Inertia", () => {
  setLocale("en");
  const s = buildWidgetSnapshot(state(), { now: NOW });
  assert.equal(s.netWorth.label, "Net worth");
  assert.equal(s.labels.updated, "Updated");
  assert.equal(s.brand, "Inertia");
  assert.equal(s.locale, "en");
});
