import { test, expect } from "@playwright/test";
import { seedEnglish, gotoHome } from "./helpers";

/**
 * Native Android widget snapshot (src/widgetSnapshot.js): the payload pushed to
 * the InertiaWidget Capacitor plugin must follow the privacy mode chosen in
 * Settings. The web build never calls the plugin (not a native platform).
 */

async function snapshotFromSavedState(page) {
  return page.evaluate(async () => {
    const { buildWidgetSnapshot } = await import("/src/widgetSnapshot.js");
    const { loadState } = await import("/src/store.js");
    return buildWidgetSnapshot(loadState(), { now: new Date(2026, 8, 15, 9, 0) });
  });
}

test.beforeEach(async ({ page }) => {
  await seedEnglish(page, {
    goals: [{ id: "g1", name: "Down payment", target: 20_000_000, align: "netWorth", onWidget: true }],
  });
});

test("native widget snapshot — exact by default, then masked after Settings change", async ({ page }) => {
  await gotoHome(page);
  let snap = await snapshotFromSavedState(page);
  expect(snap.brand).toBe("Inertia");
  expect(snap.mode).toBe("exact");
  expect(snap.netWorth.text).toBe("NT$16,470,000");
  expect(snap.pace.text).toMatch(/^\+NT\$/);
  expect(snap.goal).toMatchObject({ show: true, name: "Down payment", barPct: 82.4 });
  expect(snap.live).toMatchObject({ format: "exact", base: 16_470_000 });

  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Widget" }).click();
  await page.getByTestId("privacy-mode-masked").click();
  await expect(page.getByTestId("privacy-mode-masked")).toHaveAttribute("aria-selected", "true");

  snap = await snapshotFromSavedState(page);
  expect(snap.mode).toBe("masked");
  expect(snap.netWorth.text).toBe("NT$••••••");
  expect(snap.pace.text).toBe("+••••");
  expect(snap.goal.text).toBe("••••");
  expect(snap.goal.barPct).toBeNull();
  expect(snap.live).toBeNull();
  expect(JSON.stringify(snap)).not.toMatch(/16,?470,?000/);
});

test("native widget snapshot — relative / rhythm modes carry no absolute NT$", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("navigation", { name: "Screens" }).getByRole("button", { name: "Widget" }).click();

  await page.getByTestId("privacy-mode-relative").click();
  let snap = await snapshotFromSavedState(page);
  expect(snap.netWorth.text).toMatch(/^Month progress \d+%$/);
  expect(snap.pace.text).toMatch(/^\+\d+(\.\d+)?%$/);
  expect(snap.goal.text).toBe("82%");
  expect(JSON.stringify([snap.netWorth, snap.pace, snap.goal, snap.buckets])).not.toContain("NT$");

  await page.getByTestId("privacy-mode-rhythm").click();
  snap = await snapshotFromSavedState(page);
  expect(snap.netWorth.show).toBe(false);
  expect(snap.pace.show).toBe(false);
  expect(snap.rhythm.show).toBe(true);
  expect(snap.buckets).toEqual([]);
  expect(snap.goal.text).toBe("");
});

test("native widget mock — masked layout shows no raw amounts", async ({ page }) => {
  await page.goto("/tools/android-widget-mock.html?template=noir&mode=masked");
  await page.waitForFunction(() => (window as any).__mockReady === true);
  const widgets = page.getByTestId("android-widget");
  await expect(widgets).toHaveCount(2);
  await expect(widgets.first()).toContainText("NT$••••••");
  await expect(widgets.first()).not.toContainText(/\d{1,3},\d{3}/);
});
