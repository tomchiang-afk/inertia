import { test, expect } from "@playwright/test";
import { seedEnglish, dismissAdIfPresent, gotoHome } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedEnglish(page);
});

test("home loads — Inertia title and NT$ net worth", async ({ page }) => {
  await gotoHome(page);
  await expect(page.getByTestId("app-title")).toContainText("Inertia");
  await expect(page.getByTestId("net-worth")).toContainText("NT$");
  await expect(page.getByRole("button", { name: "Settings" }).first()).toBeVisible();
});

test("locale switch — Settings → zh-TW chrome → back to en", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Settings" }).click();
  await expect(page.locator(".title", { hasText: "Settings" })).toBeVisible();

  await page.locator('[data-locale="zh-TW"]').click();
  await expect(page.locator(".title", { hasText: "設定" })).toBeVisible();

  await page.getByRole("navigation", { name: "畫面" }).getByRole("button", { name: "首頁" }).click();
  await expect(page.getByText("淨資產")).toBeVisible();

  await page.getByRole("navigation", { name: "畫面" }).getByRole("button", { name: "設定" }).click();
  await page.locator('[data-locale="en"]').click();
  await expect(page.locator(".title", { hasText: "Settings" })).toBeVisible();

  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Home" }).click();
  await expect(page.getByText("Net worth")).toBeVisible();
});

test("browse bucket detail without edit — no ad overlay", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("bucket-housing").click();
  await expect(page.getByTestId("housing-market-value")).toBeVisible();
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
});

test("edit triggers ad when buyout off — dismiss then form usable", async ({ page }) => {
  await seedEnglish(page, { settings: { buyout: false }, force: true });
  await gotoHome(page);
  await page.getByTestId("bucket-housing").click();
  await page.getByTestId("edit-housing").click();

  const ad = page.getByTestId("ad-overlay");
  await expect(ad).toBeVisible();
  await page.getByTestId("ad-skip").click();
  await expect(ad).toHaveCount(0);

  await expect(page.getByTestId("edit-form")).toBeVisible();
  await expect(page.locator("#f-mv")).toBeEnabled();
});

test("buyout skips ad on Edit", async ({ page }) => {
  await seedEnglish(page, { settings: { buyout: true }, force: true });
  await gotoHome(page);

  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Settings" }).click();
  await expect(page.getByTestId("buyout-toggle")).toBeChecked();
  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Home" }).click();

  await page.getByTestId("bucket-housing").click();
  await page.getByTestId("edit-housing").click();

  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
  await expect(page.getByTestId("edit-form")).toBeVisible();
});

test("persist — change housing number, save (handle ad), reload keeps value", async ({ page }) => {
  // beforeEach seeds buyout:false once; do not force-reseed on reload
  await gotoHome(page);
  await page.getByTestId("bucket-housing").click();
  await page.getByTestId("edit-housing").click();
  await dismissAdIfPresent(page);

  const input = page.locator("#f-mv");
  await expect(input).toBeVisible();
  await input.fill("19000000");
  await page.getByRole("button", { name: "Save" }).click();
  await dismissAdIfPresent(page);

  await expect(page.getByTestId("housing-market-value")).toContainText("NT$19,000,000");

  await page.reload();
  await page.getByTestId("bucket-housing").click();
  await expect(page.getByTestId("housing-market-value")).toContainText("NT$19,000,000");
});

test("demo rhythm — ?demo=1 adds demo-rhythm class or metronome", async ({ page }) => {
  await page.goto("/?demo=1");
  await page.getByTestId("app-title").waitFor();
  const body = page.locator("body");
  await expect(body).toHaveClass(/demo-rhythm/);
  // Metronome visible when honesty is pace (default seed)
  await expect(page.getByTestId("rhythm-metro").first()).toBeVisible();
});
