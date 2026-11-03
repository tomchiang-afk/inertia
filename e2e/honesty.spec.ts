import { test, expect } from "@playwright/test";
import { seedEnglish, gotoHome } from "./helpers";

/**
 * Honesty and privacy parity across App Home and the Widget tab.
 * The widget snapshot is the native contract; these checks run on the web surface
 * that mirrors it.
 */

const NO_USD_FX = {
  base: "TWD",
  rates: { JPY: 0.21 },
  updatedAt: "2026-09-27",
  edited: false,
};

const USD_ONLY_ASSETS = {
  properties: [],
  brokerAccounts: [],
  cashAccounts: [
    { id: "c_usd", alias: "USD savings", currency: "USD", balance: 12_000, type: "savings" },
  ],
  passiveItems: [],
};

const GOAL = {
  id: "g1",
  name: "Down payment",
  target: 20_000_000,
  align: "netWorth",
  onWidget: true,
};

test("widget surfaces flag an unrated currency", async ({ page }) => {
  await seedEnglish(page, {
    assets: USD_ONLY_ASSETS,
    settings: { fx: NO_USD_FX },
  });
  await gotoHome(page);

  await page
    .getByRole("navigation", { name: "Screens" })
    .getByRole("button", { name: "Widget" })
    .click();

  await expect(page.getByTestId("widget-fx-missing-note")).toBeVisible();
  await expect(page.getByTestId("widget-fx-missing-note")).toContainText("USD");
  await expect(page.getByTestId("lock-fx-flag")).toBeVisible();
  await expect(page.getByTestId("lock-fx-flag")).toContainText("USD");
});

test("Home honors monthPace and goalProgress toggles", async ({ page }) => {
  await seedEnglish(page, { goals: [GOAL] });
  await gotoHome(page);

  await expect(page.getByTestId("rhythm-today")).toBeVisible();
  await expect(page.getByTestId("pace-badge")).toBeVisible();
  await expect(page.getByTestId("rhythm-hero")).toBeVisible();
  await expect(page.locator(".spark-wrap")).toBeVisible();
  await expect(page.getByTestId("goals-section")).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Screens" });
  await nav.getByRole("button", { name: "Widget" }).click();
  await page.getByTestId("privacy-field-monthPace").evaluate((el: HTMLInputElement) => el.click());
  await page.getByTestId("privacy-field-goalProgress").evaluate((el: HTMLInputElement) => el.click());
  await nav.getByRole("button", { name: "Home" }).click();

  await expect(page.locator("#rhythmLiveLine")).toHaveCount(0);
  await expect(page.getByTestId("pace-badge")).toHaveCount(0);
  await expect(page.getByTestId("rhythm-hero")).toHaveCount(0);
  await expect(page.locator(".spark-wrap")).toHaveCount(0);
  await expect(page.getByTestId("goals-section")).toHaveCount(0);
});

test("Home goals never leak raw net worth in a non-exact display mode", async ({ page }) => {
  await seedEnglish(page, { goals: [GOAL] });
  await gotoHome(page);

  const nav = page.getByRole("navigation", { name: "Screens" });
  await nav.getByRole("button", { name: "Widget" }).click();
  await page.getByTestId("privacy-mode-masked").click();
  await nav.getByRole("button", { name: "Home" }).click();

  const goals = page.getByTestId("goals-section");
  await expect(goals).toBeVisible();
  await expect(goals).not.toContainText("16,470,000");
  await expect(goals).not.toContainText("NT$16.5M");
});

test("Home goals never leak net worth when the netWorth field is hidden", async ({ page }) => {
  await seedEnglish(page, { goals: [GOAL] });
  await gotoHome(page);

  const nav = page.getByRole("navigation", { name: "Screens" });
  await nav.getByRole("button", { name: "Widget" }).click();
  await page.getByTestId("privacy-field-netWorth").evaluate((el: HTMLInputElement) => el.click());
  await nav.getByRole("button", { name: "Home" }).click();

  const goals = page.getByTestId("goals-section");
  await expect(goals).toBeVisible();
  await expect(goals).not.toContainText("16,470,000");
  await expect(goals).not.toContainText("NT$16.5M");
});
