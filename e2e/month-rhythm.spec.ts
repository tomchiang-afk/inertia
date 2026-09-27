import { test, expect, Page } from "@playwright/test";
import { seedEnglish, gotoHome } from "./helpers";

/**
 * v0.3.1: month rhythm only. No "today actual" switch, no daily market P&L on Home / widgets;
 * net worth between edits grows only by the smooth pace (principal + TD interest + passive).
 * Seed (v1 save): net worth 16,470,000; quietDay = 22,000/30 + 800,000×1.7%/365 + 28,500/30.
 */
const QUIET_DAY = 22_000 / 30 + (800_000 * 0.017) / 365 + 28_500 / 30; // ≈ 1,720.59
const DAY = 86_400_000;
const T0 = new Date("2026-09-27T12:00:00+08:00").getTime();
const nt = (n: number) => "NT$" + Math.round(n).toLocaleString("en-US");

const nav = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name }).click();
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("inertia.v1") || "{}"));

test("no today-actual switch anywhere; static month-pace badge; settings explain the rhythm", async ({ page }) => {
  await seedEnglish(page);
  await gotoHome(page);
  await expect(page.locator("#honesty-toggle")).toHaveCount(0);
  await expect(page.getByTestId("pace-badge")).toHaveText("Month pace");
  expect(await page.getByTestId("pace-badge").evaluate((el) => el.tagName)).toBe("SPAN"); // not a button
  await expect(page.locator("body")).not.toContainText(/Today actual|Stocks today/);
  await expect(page.getByTestId("bucket-stocks")).toContainText("Not in pace");
  await expect(page.getByTestId("bucket-stocks")).not.toContainText("3,200");
  await expect(page.getByTestId("rhythm-hero")).toBeVisible();

  await nav(page, "Settings");
  await expect(page.locator("#honesty-seg")).toHaveCount(0);
  await expect(page.getByTestId("settings-rhythm")).toContainText("mortgage principal + time-deposit interest + passive income");
  await expect(page.locator("body")).not.toContainText("Today actual");

  await nav(page, "Stocks");
  await expect(page.getByTestId("stocks-summary")).not.toContainText(/Today|3,200|186/);
  await page.locator('[data-open="account"]').first().click();
  await expect(page.getByTestId("item-form")).toBeVisible();
  await expect(page.getByTestId("form-dayPnL")).toHaveCount(0);
  await expect(page.getByTestId("form-periodPnL")).toHaveCount(0);
});

test("legacy settings (honesty: actual, todayActual toggle) migrate safely", async ({ page }) => {
  await seedEnglish(page, {
    settings: { honesty: "actual", widgetPrivacy: { displayMode: "exact", fields: { todayActual: true, bucketCash: false } } },
  });
  await gotoHome(page);
  await expect(page.getByTestId("net-worth")).toHaveText("NT$16,470,000");
  await expect(page.locator("body")).not.toContainText(/Today actual|Stocks today|−NT\$3,200/);
  await expect(page.getByTestId("bucket-cash")).toHaveCount(0); // other privacy toggles survive
  const s = await saved(page);
  expect(s.settings.honesty).toBeUndefined();
  expect(s.settings.widgetPrivacy.fields.todayActual).toBeUndefined();
  expect(s.settings.widgetPrivacy.fields.bucketCash).toBe(false);
  expect(typeof s.paceAnchorAt).toBe("number");
});

test("net worth between edits grows only by the smooth pace; editing numbers re-anchors", async ({ page }) => {
  await page.clock.setFixedTime(T0);
  await seedEnglish(page, { top: { paceAnchorAt: T0 - 10 * DAY } });
  await gotoHome(page);
  await expect(page.getByTestId("net-worth")).toHaveText(nt(16_470_000 + QUIET_DAY * 10));
  // Period pill = pace × 30 days, never market P&L (+186,000 would show here in the old model).
  await expect(page.locator(".meta-row .pill.up")).toHaveText(`30d +${nt(QUIET_DAY * 30)}`);
  // Today's rhythm so far at 12:00 = half a day.
  await expect(page.getByTestId("rhythm-today")).toHaveText(nt(Math.floor(QUIET_DAY / 2)));

  // Widget snapshot uses the same anchor (native extrapolates base + perDay × days since at).
  const snap = await page.evaluate(async () => {
    const { buildWidgetSnapshot } = await import("/src/widgetSnapshot.js");
    const { loadState } = await import("/src/store.js");
    return buildWidgetSnapshot(loadState());
  });
  expect(snap.netWorth.text).toBe(nt(16_470_000 + QUIET_DAY * 10));
  expect(snap.live.base).toBe(16_470_000);
  expect(snap.live.at).toBe(T0 - 10 * DAY);
  expect(JSON.stringify(snap)).not.toMatch(/3,200|186,000|dayPnL/);

  // One day later (app reopened): only the pace was added.
  await page.clock.setFixedTime(T0 + DAY);
  await page.reload();
  await expect(page.getByTestId("net-worth")).toHaveText(nt(16_470_000 + QUIET_DAY * 11));

  // Rename only → anchor kept.
  await nav(page, "Housing");
  await page.locator('[data-open="property"]').first().click();
  await page.getByTestId("form-alias").fill("Home sweet home");
  await page.getByTestId("item-save").click();
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
  expect((await saved(page)).paceAnchorAt).toBe(T0 - 10 * DAY);

  // Changed amount → the typed numbers become the new anchor (ad shows, per the edit rule).
  await page.locator('[data-open="property"]').first().click();
  await page.getByTestId("form-marketValue").fill("18100000");
  await page.getByTestId("item-save").click();
  await page.getByTestId("ad-skip").click();
  expect((await saved(page)).paceAnchorAt).toBe(T0 + DAY);
  await nav(page, "Home");
  await expect(page.getByTestId("net-worth")).toHaveText("NT$16,570,000");
});

test("accrual caps at 45 days and Home asks for an update", async ({ page }) => {
  await page.clock.setFixedTime(T0);
  await seedEnglish(page, { top: { paceAnchorAt: T0 - 60 * DAY } });
  await gotoHome(page);
  await expect(page.getByTestId("net-worth")).toHaveText(nt(16_470_000 + QUIET_DAY * 45));
  await expect(page.getByTestId("pace-capped-note")).toContainText("45 days");
});

test("home numbers tick forward with the pace while open", async ({ page }) => {
  await page.clock.install({ time: T0 });
  await seedEnglish(page, { top: { paceAnchorAt: T0 } });
  await gotoHome(page);
  await expect(page.getByTestId("net-worth")).toHaveText("NT$16,470,000");
  await page.clock.fastForward(6 * 3_600_000); // six hours later, same session
  await page.clock.runFor(1_000); // let the rAF repaint run
  await expect(page.getByTestId("net-worth")).toHaveText(nt(16_470_000 + QUIET_DAY / 4));
  await expect(page.getByTestId("rhythm-today")).toHaveText(nt(Math.floor(QUIET_DAY * 0.75)));
});
