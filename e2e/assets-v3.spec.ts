import { test, expect, Page } from "@playwright/test";
import { seedEnglish, gotoHome } from "./helpers";

/**
 * v3: user-defined categories (properties, brokerage accounts + holdings, multi-currency cash,
 * custom passive income), base currency + FX, v1 → v2 migration and the edit-only ad rule.
 * seedEnglish writes a v1 (fixed-bucket) save, so every test also starts from a migration.
 */

const nav = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name }).click();

async function saveExpectingAd(page: Page) {
  await page.getByTestId("item-save").click();
  const ad = page.getByTestId("ad-overlay");
  await expect(ad).toBeVisible();
  await page.getByTestId("ad-skip").click();
  await expect(ad).toHaveCount(0);
  await expect(page.getByTestId("item-form")).toHaveCount(0);
}

async function saveExpectingNoAd(page: Page) {
  await page.getByTestId("item-save").click();
  await expect(page.getByTestId("item-form")).toHaveCount(0);
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
}

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("inertia.v1") || "{}"));

test.beforeEach(async ({ page }) => {
  await seedEnglish(page);
});

test("migration — old fixed-bucket save becomes lists, totals unchanged, raw backup kept", async ({ page }) => {
  await gotoHome(page);
  await expect(page.getByTestId("net-worth")).toHaveText("NT$16,470,000");
  await expect(page.getByTestId("bucket-housing")).toContainText("1 properties");
  await expect(page.getByTestId("bucket-stocks")).toContainText("Stocks");
  const s = await saved(page);
  expect(s.schemaVersion).toBe(2);
  expect(s.assets.properties).toEqual([
    expect.objectContaining({ alias: "Home", marketValue: 18_000_000, mortgageBalance: 5_200_000, monthlyPrincipal: 22_000, currency: "TWD" }),
  ]);
  expect(s.assets.brokerAccounts[0]).toMatchObject({ market: "TW", currency: "TWD" });
  expect(s.assets.brokerAccounts[0].dayPnL).toBeUndefined(); // v0.3.1: no market P&L
  expect(s.assets.cashAccounts.map((c: any) => [c.type, c.balance])).toEqual([["checking", 420_000], ["timeDeposit", 800_000]]);
  expect(s.assets.passiveItems[0]).toMatchObject({ amount: 28_500, frequency: "monthly" });
  expect(s.assets.housing).toBeUndefined();
  const backup = await page.evaluate(() => localStorage.getItem("inertia.v1.backup-schema1"));
  expect(JSON.parse(backup!).assets.housing.marketValue).toBe(18_000_000);

  await page.getByTestId("bucket-cash").click();
  await expect(page.getByTestId("cash-list")).toContainText("Time deposit");
  await expect(page.getByTestId("cash-list")).toContainText("1.7%");
});

test("add property with alias — ad on save, shows in list and Home total", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("bucket-housing").click();
  await page.getByTestId("add-property").click();
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
  await page.getByTestId("form-alias").fill("Tainan townhouse");
  await page.getByTestId("form-marketValue").fill("9000000");
  await page.getByTestId("form-mortgageBalance").fill("4000000");
  await page.getByTestId("form-monthlyPrincipal").fill("15000");
  await expect(page.getByTestId("item-preview")).toContainText("NT$5,000,000");
  await saveExpectingAd(page);

  const row = page.locator('[data-testid^="property-p_"]', { hasText: "Tainan townhouse" });
  await expect(row).toContainText("NT$5,000,000");
  await expect(page.getByTestId("housing-summary")).toContainText("NT$17,800,000");
  await nav(page, "Home");
  await expect(page.getByTestId("bucket-housing")).toContainText("2 properties");
  await expect(page.getByTestId("net-worth")).toHaveText("NT$21,470,000");
});

test("add US brokerage account + holding — grouped by account, converted to base", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("bucket-stocks").click();
  await page.getByTestId("add-account").click();
  await page.getByTestId("form-alias").fill("Schwab");
  await page.getByTestId("form-market").fill("US");
  await page.getByTestId("form-market").dispatchEvent("change");
  await expect(page.getByTestId("form-currency")).toHaveValue("USD");
  await saveExpectingAd(page); // new item

  const group = page.locator('[data-testid^="account-b_"]', { hasText: "Schwab" });
  await expect(group).toContainText("US · USD · 0 holdings");
  await group.getByRole("button", { name: "+ Add holding" }).click();
  await expect(page.getByTestId("item-form")).toContainText("prices in USD");
  await page.getByTestId("form-symbol").fill("aapl");
  await page.getByTestId("form-name").fill("Apple");
  await page.getByTestId("form-shares").fill("10");
  await page.getByTestId("form-price").fill("228.5");
  await expect(page.getByTestId("item-preview")).toContainText("US$2,285 ≈ NT$69,693");
  await saveExpectingAd(page);

  const holding = group.locator('[data-testid^="holding-"]');
  await expect(holding).toContainText("AAPL");
  await expect(holding).toContainText("10 sh × US$228.50");
  await expect(group.locator('[data-testid^="account-value-"]')).toHaveText("US$2,285");
  await expect(page.getByTestId("stocks-summary")).toContainText("NT$2,519,693");
});

test("add JPY cash account — native amount + base conversion", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("bucket-cash").click();
  await page.getByTestId("add-cash").click();
  await page.getByTestId("form-alias").fill("Tokyo savings");
  await page.getByTestId("form-institution").fill("MUFG");
  await page.getByTestId("form-country").fill("JP");
  await page.getByTestId("form-currency").fill("jpy");
  await expect(page.getByTestId("form-rate")).toBeHidden();
  await page.getByTestId("form-type").selectOption("timeDeposit");
  await expect(page.getByTestId("form-rate")).toBeVisible();
  await page.getByTestId("form-balance").fill("500000");
  await page.getByTestId("form-rate").fill("0.3");
  await saveExpectingAd(page);

  const row = page.locator('[data-testid^="cash-c_"]', { hasText: "Tokyo savings" });
  await expect(row).toContainText("JP¥500,000");
  await expect(row).toContainText("≈ NT$105k");
  await expect(row).toContainText("MUFG, JP");
  await expect(page.getByTestId("cash-summary")).toContainText("NT$1,325,000");
  const s = await saved(page);
  expect(s.assets.cashAccounts.at(-1)).toMatchObject({ currency: "JPY", type: "timeDeposit", rate: 0.3 });
});

test("add custom passive item — any name/tag/frequency, normalized to monthly pace", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("bucket-passive").click();
  await page.getByTestId("add-passive").click();
  await page.getByTestId("form-name").fill("Podcast sponsorship");
  await page.getByTestId("form-tag").fill("Side gig");
  await page.getByTestId("form-currency").fill("USD");
  await page.getByTestId("form-amount").fill("1200");
  await page.getByTestId("form-frequency").selectOption("quarterly");
  await saveExpectingAd(page);

  const row = page.locator('[data-testid^="passive-r_"]', { hasText: "Podcast sponsorship" });
  await expect(row).toContainText("US$1,200/qtr");
  await expect(row).toContainText("≈ NT$12,200/mo");
  await expect(row).toContainText("Side gig");
  await expect(page.getByTestId("passive-summary")).toContainText("NT$40,700/mo");
});

test("change base currency — totals, goals and widget snapshot follow; FX edits never show ads", async ({ page }) => {
  await seedEnglish(page, {
    force: true,
    goals: [{ id: "g1", name: "Down payment", target: 20_000_000, align: "netWorth", onWidget: true }],
  });
  await gotoHome(page);
  await nav(page, "Settings");
  const fx = page.getByTestId("settings-fx");
  await expect(fx).toContainText("Defaults as of 2026-09-27");
  await expect(page.getByTestId("fx-rate-USD")).toHaveValue("30.5");

  // Edit a rate: no ad, stamp becomes "Last edited"
  await page.getByTestId("fx-rate-USD").fill("32");
  await page.getByTestId("fx-rate-USD").press("Enter");
  await page.getByTestId("fx-rate-USD").blur();
  await expect(page.getByTestId("fx-stamp")).toContainText("Last edited");
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);

  await page.getByTestId("fx-base").selectOption("USD");
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
  await expect(page.getByTestId("fx-row-TWD")).toBeVisible();
  await expect(page.getByTestId("fx-rate-TWD")).toHaveValue("0.03125");

  await nav(page, "Home");
  await expect(page.getByTestId("net-worth")).toHaveText("US$514,688");
  await expect(page.getByTestId("bucket-housing")).toContainText("US$400k");
  // goal target converted with the same rate → progress unchanged (82%)
  await expect(page.getByTestId("goal-meta-g1")).toContainText("82%");
  await expect(page.getByTestId("goal-meta-g1")).toContainText("US$625k");

  const snap = await page.evaluate(async () => {
    const { buildWidgetSnapshot } = await import("/src/widgetSnapshot.js");
    const { loadState } = await import("/src/store.js");
    return buildWidgetSnapshot(loadState());
  });
  expect(snap.currency).toEqual({ code: "USD", symbol: "US$" });
  expect(snap.netWorth.text).toBe("US$514,688");
  expect(snap.buckets.map((b: any) => b.label)).toEqual(["Housing", "Stocks", "Cash", "Passive"]);

  const s = await saved(page);
  expect(s.settings.fx.base).toBe("USD");
  expect(s.goals[0].target).toBe(625_000);

  // Round trip USD → JPY → TWD: the rates the user typed come back exactly (no drift).
  await nav(page, "Settings");
  await page.getByTestId("fx-base").selectOption("JPY");
  await page.getByTestId("fx-base").selectOption("TWD");
  await expect(page.getByTestId("fx-rate-USD")).toHaveValue("32");
  await expect(page.getByTestId("fx-rate-JPY")).toHaveValue("0.21");
  await nav(page, "Home");
  await expect(page.getByTestId("net-worth")).toHaveText("NT$16,470,000");
  const back = await saved(page);
  expect(back.settings.fx.rates.USD).toBe(32);
  expect(Math.round(back.goals[0].target)).toBe(20_000_000);
});

test("missing FX rate — item excluded + flagged until the rate is added", async ({ page }) => {
  await seedEnglish(page, { force: true, settings: { buyout: true } });
  await gotoHome(page);
  await page.getByTestId("bucket-cash").click();
  await page.getByTestId("add-cash").click();
  await page.getByTestId("form-alias").fill("Bangkok account");
  await page.getByTestId("form-currency").fill("THB");
  await page.getByTestId("form-balance").fill("100000");
  await expect(page.getByTestId("item-preview")).toContainText("add a THB rate");
  await saveExpectingNoAd(page); // buyout
  await expect(page.getByTestId("fx-missing-note")).toContainText("THB");
  await expect(page.getByTestId("cash-summary")).toContainText("NT$1,220,000");

  await nav(page, "Settings");
  await expect(page.getByTestId("fx-row-THB")).toHaveClass(/is-missing/);
  await page.getByTestId("fx-rate-THB").fill("0.9");
  await page.getByTestId("fx-rate-THB").blur();
  await nav(page, "Cash");
  await expect(page.getByTestId("fx-missing-note")).toHaveCount(0);
  await expect(page.getByTestId("cash-summary")).toContainText("NT$1,310,000");
});

test("ads rule — rename / reorder / delete: no ad; changed amount: ad; unchanged number: no ad", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("bucket-cash").click();

  // Rename only → no ad
  await page.getByTestId("cash-c_chk").click();
  await page.getByTestId("form-alias").fill("Everyday checking");
  await saveExpectingNoAd(page);
  await expect(page.getByTestId("cash-c_chk")).toContainText("Everyday checking");

  // Re-save with identical numbers → no ad
  await page.getByTestId("cash-c_chk").click();
  await saveExpectingNoAd(page);

  // Changed balance → ad
  await page.getByTestId("cash-c_chk").click();
  await page.getByTestId("form-balance").fill("450000");
  await saveExpectingAd(page);
  await expect(page.getByTestId("cash-c_chk")).toContainText("NT$450,000");

  // Reorder → no ad, order persisted
  await page.getByTestId("reorder-cash").click();
  await page.locator('[data-move="cash"][data-id="c_td"][data-dir="-1"]').click();
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
  let s = await saved(page);
  expect(s.assets.cashAccounts.map((c: any) => c.id)).toEqual(["c_td", "c_chk"]);
  await page.getByTestId("reorder-cash").click();

  // Delete (two taps) → no ad
  await page.getByTestId("cash-c_td").click();
  await page.getByTestId("item-delete").click();
  await expect(page.getByTestId("item-delete")).toHaveText("Tap again to delete");
  await page.getByTestId("item-delete").click();
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
  await expect(page.getByTestId("cash-c_td")).toHaveCount(0);
  s = await saved(page);
  expect(s.assets.cashAccounts).toHaveLength(1);

  // Browsing never shows ads; the widget tab neither
  await nav(page, "Home");
  await page.getByTestId("bucket-stocks").click();
  await nav(page, "Widget");
  await page.getByTestId("style-sediment").click();
  await expect(page.getByTestId("home-widget")).toContainText("Stocks");
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
});

test("new strings localized — zh-TW labels for stocks + FX", async ({ page }) => {
  await seedEnglish(page, { force: true, settings: { locale: "zh-TW" } });
  await page.goto("/");
  await expect(page.getByTestId("bucket-stocks")).toContainText("股票");
  await page.getByRole("navigation", { name: "畫面" }).getByRole("button", { name: "設定" }).click();
  await expect(page.getByTestId("settings-fx")).toContainText("幣別與匯率");
  await expect(page.getByTestId("settings-fx")).toContainText("基準幣別");
});
