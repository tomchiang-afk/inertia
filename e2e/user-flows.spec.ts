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
  await expect(page.getByTestId("property-list")).toBeVisible();
  await expect(page.getByTestId("housing-summary")).toContainText("NT$12,800,000");
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
  // Opening an item sheet is browsing too: no ad until a number is saved
  await page.getByTestId("property-p_home").click();
  await expect(page.getByTestId("item-form")).toBeVisible();
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
});

test("saving a changed number triggers ad when buyout off — dismiss then saved", async ({ page }) => {
  await seedEnglish(page, { settings: { buyout: false }, force: true });
  await gotoHome(page);
  await page.getByTestId("bucket-housing").click();
  await page.getByTestId("property-p_home").click();
  await page.locator("#f-marketValue").fill("18500000");
  await page.getByTestId("item-save").click();

  const ad = page.getByTestId("ad-overlay");
  await expect(ad).toBeVisible();
  await page.getByTestId("ad-skip").click();
  await expect(ad).toHaveCount(0);
  await expect(page.getByTestId("item-form")).toHaveCount(0);
  await expect(page.getByTestId("housing-summary")).toContainText("NT$13,300,000");
});

test("buyout skips ad on number save", async ({ page }) => {
  await seedEnglish(page, { settings: { buyout: true }, force: true });
  await gotoHome(page);

  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Settings" }).click();
  await expect(page.getByTestId("buyout-toggle")).toBeChecked();
  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Home" }).click();

  await page.getByTestId("bucket-housing").click();
  await page.getByTestId("property-p_home").click();
  await page.locator("#f-marketValue").fill("19000000");
  await page.getByTestId("item-save").click();
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
  await expect(page.getByTestId("housing-summary")).toContainText("NT$13,800,000");
});

test("persist — change housing number, save (handle ad), reload keeps value", async ({ page }) => {
  // beforeEach seeds buyout:false once; do not force-reseed on reload
  await gotoHome(page);
  await page.getByTestId("bucket-housing").click();
  await page.getByTestId("property-p_home").click();

  const input = page.locator("#f-marketValue");
  await expect(input).toBeVisible();
  await input.fill("19000000");
  await page.getByTestId("item-save").click();
  await dismissAdIfPresent(page);

  await expect(page.getByTestId("property-p_home")).toContainText("NT$13,800,000");

  await page.reload();
  await page.getByTestId("bucket-housing").click();
  await expect(page.getByTestId("property-p_home")).toContainText("NT$13,800,000");
  await page.getByTestId("property-p_home").click();
  await expect(page.locator("#f-marketValue")).toHaveValue("19000000");
});

test("demo rhythm — ?demo=1 adds demo-rhythm class and hero rhythm", async ({ page }) => {
  await page.goto("/?demo=1");
  await page.getByTestId("app-title").waitFor();
  const body = page.locator("body");
  await expect(body).toHaveClass(/demo-rhythm/);
  // Paper default → bars metronome; hero rhythm block present
  await expect(page.getByTestId("rhythm-hero")).toBeVisible();
  await expect(page.getByTestId("rhythm-metro").first()).toBeVisible();
});

test("widget template — Settings → select noir → preview has data-template", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Settings" }).click();
  await expect(page.getByTestId("template-picker")).toBeVisible();

  await page.getByTestId("template-noir").click();
  await expect(page.getByTestId("template-noir")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#app")).toHaveAttribute("data-template", "noir");

  await page.getByRole("button", { name: "Lock small (preview)" }).click();
  await expect(page.getByTestId("lock-widget")).toHaveAttribute("data-template", "noir");
  await expect(page.getByTestId("lock-widget")).toHaveAttribute("data-rhythm", "dots");
  await expect(page.getByTestId("rhythm-dots").first()).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Home medium (preview)" }).click();
  await expect(page.getByTestId("home-widget")).toHaveAttribute("data-template", "noir");
  await expect(page.getByTestId("home-widget")).toHaveAttribute("data-rhythm", "dots");
  await expect(page.getByTestId("rhythm-dots").first()).toBeVisible();
});

test("widget template — swiss has accent rule structure; sumi asymmetric lock", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Settings" }).click();

  await page.getByTestId("template-swiss").click();
  await page.getByRole("button", { name: "Lock small (preview)" }).click();
  await expect(page.getByTestId("lock-widget")).toHaveAttribute("data-template", "swiss");
  await expect(page.getByTestId("lock-widget")).toHaveAttribute("data-rhythm", "bars");
  await expect(page.getByTestId("rhythm-metro").first()).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();

  await page.getByTestId("template-sumi").click();
  await page.getByRole("button", { name: "Lock small (preview)" }).click();
  await expect(page.getByTestId("lock-widget")).toHaveAttribute("data-template", "sumi");
  await expect(page.getByTestId("lock-widget")).toHaveAttribute("data-rhythm", "ink");
  await expect(page.locator(".lw-asymmetric")).toBeVisible();
  await expect(page.getByTestId("rhythm-dots").first()).toBeVisible();
});

test("widget template — Settings → select matrix → preview has data-template", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Settings" }).click();
  await expect(page.getByTestId("template-picker")).toBeVisible();

  await page.getByTestId("template-matrix").click();
  await expect(page.getByTestId("template-matrix")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#app")).toHaveAttribute("data-template", "matrix");

  await page.getByRole("button", { name: "Lock small (preview)" }).click();
  await expect(page.getByTestId("lock-widget")).toHaveAttribute("data-template", "matrix");
  await expect(page.getByTestId("lock-widget")).toHaveAttribute("data-rhythm", "scan");
  await expect(page.getByTestId("rhythm-scan").first()).toBeVisible();
  await expect(page.getByTestId("rhythm-scan").first().locator(".rhythm-beat")).toHaveCount(4);

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Home medium (preview)" }).click();
  await expect(page.getByTestId("home-widget")).toHaveAttribute("data-template", "matrix");
  await expect(page.getByTestId("home-widget")).toHaveAttribute("data-rhythm", "scan");
  await expect(page.getByTestId("rhythm-scan").first()).toBeVisible();
});


test("widget privacy — masked hides raw NT$ on lock preview", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Settings" }).click();
  await expect(page.getByTestId("widget-privacy")).toBeVisible();

  await page.getByTestId("privacy-mode-masked").click();
  await expect(page.getByTestId("privacy-mode-masked")).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "Lock small (preview)" }).click();
  const lock = page.getByTestId("lock-widget");
  await expect(lock).toHaveAttribute("data-privacy-mode", "masked");
  await expect(page.getByTestId("lock-net-worth")).toHaveText("NT$••••••");
  // Demo net worth NT$16,470,000 must not appear as raw absolute figure
  await expect(lock).not.toContainText("16,470,000");
  await expect(lock).not.toContainText("NT$16,470,000");
});

test("widget privacy — relative shows % / progress, not raw absolute", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Settings" }).click();

  await page.getByTestId("privacy-mode-relative").click();
  await expect(page.getByTestId("privacy-mode-relative")).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "Lock small (preview)" }).click();
  const lock = page.getByTestId("lock-widget");
  await expect(lock).toHaveAttribute("data-privacy-mode", "relative");
  await expect(page.getByTestId("lock-net-worth")).toContainText(/Month progress \d+%/);
  await expect(lock).not.toContainText("16,470,000");
  await expect(lock).not.toContainText("NT$16,470,000");

  const pace = page.getByTestId("lock-pace");
  await expect(pace).toBeVisible();
  await expect(pace).toHaveText(/^[+−]?\d+(\.\d+)?%$/);
});


test("goals — create goal shows progress on Home; edit + delete", async ({ page }) => {
  await gotoHome(page);
  const section = page.getByTestId("goals-section");
  await expect(section).toBeVisible();
  await expect(page.getByTestId("goals-empty")).toBeVisible();

  await section.getByTestId("goal-add").click();
  await expect(page.getByTestId("goal-form")).toBeVisible();
  await page.getByTestId("goal-name").fill("Emergency cash");
  await page.getByTestId("goal-target").fill("2000000");
  await page.getByTestId("goal-align").selectOption("cash");
  await page.getByTestId("goal-on-widget").check();
  await page.getByTestId("goal-save").click();
  // New goal sets a number → existing edit ad rule applies (buyout off)
  await dismissAdIfPresent(page);
  await expect(page.getByTestId("goal-form")).toHaveCount(0);

  const row = section.locator('[data-testid^="goal-row-"]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Emergency cash");
  // cash = 420k + 800k = 1.22M of 2M → 61%
  const bar = section.locator('[data-testid^="goal-bar-"]');
  await expect(bar).toHaveAttribute("aria-valuenow", "61");
  await expect(row).toContainText("61%");
  await expect(row).toContainText("NT$1.2M of NT$2M");

  // Edit name only → no ad (ads only on editing numbers)
  await section.locator('[data-testid^="goal-edit-"]').click();
  await page.getByTestId("goal-name").fill("Cash buffer");
  await page.getByTestId("goal-save").click();
  await expect(page.getByTestId("ad-overlay")).toHaveCount(0);
  await expect(section).toContainText("Cash buffer");

  // Persisted in inertia.v1
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("inertia.v1") || "{}"));
  expect(saved.goals).toHaveLength(1);
  expect(saved.goals[0]).toMatchObject({ name: "Cash buffer", target: 2000000, align: "cash", onWidget: true });

  // Delete from sheet
  await section.locator('[data-testid^="goal-edit-"]').click();
  await page.getByTestId("goal-sheet-delete").click();
  await expect(section.locator('[data-testid^="goal-row-"]')).toHaveCount(0);
  await expect(page.getByTestId("goals-empty")).toBeVisible();
});

test("goals — max 3 enforced (extra saved goals dropped, Add hidden)", async ({ page }) => {
  await seedEnglish(page, {
    force: true,
    goals: [
      { id: "a1", name: "One", target: 1, align: "netWorth" },
      { id: "a2", name: "Two", target: 2, align: "housing" },
      { id: "a3", name: "Three", target: 3, align: "passiveMonth" },
      { id: "a4", name: "Four", target: 4, align: "cash" },
    ],
  });
  await gotoHome(page);
  const section = page.getByTestId("goals-section");
  await expect(section.locator('[data-testid^="goal-row-"]')).toHaveCount(3);
  await expect(section.getByTestId("goal-add")).toHaveCount(0);
});

test("goals — legacy save without goals key migrates safely", async ({ page }) => {
  await seedEnglish(page, { force: true });
  // Runs after the seed script: strip goals like a pre-goals save, plus a malformed variant check
  await page.addInitScript(() => {
    const s = JSON.parse(localStorage.getItem("inertia.v1") || "{}");
    delete s.goals;
    localStorage.setItem("inertia.v1", JSON.stringify(s));
  });
  await gotoHome(page);
  await expect(page.getByTestId("net-worth")).toContainText("NT$");
  await expect(page.getByTestId("goals-empty")).toBeVisible();
  await expect(page.getByTestId("goals-section").getByTestId("goal-add")).toBeVisible();
});

test("goals — widget strip shows amount in exact; privacy masked hides goal amount", async ({ page }) => {
  await seedEnglish(page, {
    force: true,
    goals: [
      { id: "g_e2e1", name: "NW target", target: 20_000_000, align: "netWorth", onWidget: true },
    ],
  });
  await gotoHome(page);
  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Settings" }).click();
  await expect(page.getByTestId("settings-goals")).toContainText("NW target");
  await expect(page.getByTestId("privacy-field-goalProgress")).toBeChecked();

  await page.getByRole("button", { name: "Lock small (preview)" }).click();
  const strip = page.getByTestId("widget-goal-progress");
  await expect(strip).toBeVisible();
  // net worth 16.47M / 20M → 82%
  await expect(page.getByTestId("widget-goal-value")).toHaveText("82% · NT$16M");

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByTestId("privacy-mode-masked").click();
  await page.getByRole("button", { name: "Lock small (preview)" }).click();
  const lock = page.getByTestId("lock-widget");
  await expect(lock).toHaveAttribute("data-privacy-mode", "masked");
  await expect(strip).toHaveAttribute("data-privacy-mode", "masked");
  await expect(page.getByTestId("widget-goal-value")).toHaveText("••••");
  await expect(strip).not.toContainText("NT$16");
  await expect(strip).not.toContainText("82%");
  await expect(lock).not.toContainText("16,470,000");

  // Field toggle off → strip gone
  await page.getByRole("button", { name: "Back" }).click();
  await page.locator('label.switch:has([data-testid="privacy-field-goalProgress"])').click();
  await expect(page.getByTestId("privacy-field-goalProgress")).not.toBeChecked();
  await page.getByRole("button", { name: "Home medium (preview)" }).click();
  await expect(page.getByTestId("widget-goal-progress")).toHaveCount(0);
});
