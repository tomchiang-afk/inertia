// Mobile-width screenshots of the v3 asset-category UI (fresh-install demo data).
// Usage: npx vite --host 127.0.0.1 --port 5173 &  then  node scripts/v3-shots.mjs [baseUrl]
// Writes docs/shots/v3-*.png (390x844 CSS px @2x). Run from the project root.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:5173/";
const OUT = "docs/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "zh-TW" });

async function fresh(locale) {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);
  // Pin locale (fresh installs detect it from the browser) and reload so the demo names match.
  await page.evaluate((loc) => {
    const s = JSON.parse(localStorage.getItem("inertia.v1") || "{}");
    s.settings = { ...(s.settings || {}), locale: loc };
    localStorage.setItem("inertia.v1", JSON.stringify(s));
  }, locale);
  await page.reload();
  await page.waitForTimeout(400);
}
const go = async (name) => {
  await page.locator(`nav [data-go="${name}"]`).first().click();
  await page.waitForTimeout(250);
};
const shot = async (name, opts = {}) => {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/v3-${name}.png`, ...opts });
  console.log("wrote", `${OUT}/v3-${name}.png`);
};
const openFirst = async (sel) => {
  await page.locator(sel).first().click();
  await page.waitForTimeout(300);
};
const closeSheet = async () => {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  if (await page.getByTestId("item-form").count()) {
    await page.locator('[data-testid="item-cancel"], .sheet [data-close]').first().click().catch(() => {});
    await page.waitForTimeout(200);
  }
};

await fresh("zh-TW");
await shot("home");
await go("house");
await shot("housing");
await openFirst('[data-open="property"]');
await shot("sheet-property");
await closeSheet();
await go("stock");
await shot("stocks", { fullPage: true });
await openFirst('[data-open="account"]');
await shot("sheet-account");
await closeSheet();
await openFirst('[data-open="holding"]');
await shot("sheet-holding");
await closeSheet();
await go("cash");
await shot("cash");
await openFirst('[data-open="cash"]');
await shot("sheet-cash");
await closeSheet();
await go("passive");
await shot("passive", { fullPage: true });
await openFirst('[data-open="passive"]');
await shot("sheet-passive");
await closeSheet();
await go("settings");
await page.locator("#settings-fx").scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -12));
await shot("fx");

await fresh("en");
await shot("home-en");
await go("stock");
await shot("stocks-en", { fullPage: true });

await browser.close();
