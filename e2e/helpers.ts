import { Page } from "@playwright/test";

type SeedExtra = {
  settings?: Record<string, unknown>;
  assets?: Record<string, unknown>;
  /** Re-seed even if already seeded this tab (e.g. buyout on). */
  force?: boolean;
};

/**
 * Seed English locale + known defaults before app boot.
 * Uses sessionStorage so reload keeps localStorage writes from the app.
 */
export async function seedEnglish(page: Page, overrides: SeedExtra = {}) {
  await page.addInitScript((extra: SeedExtra) => {
    const flag = "e2e-seeded";
    if (sessionStorage.getItem(flag) && !extra.force) return;
    sessionStorage.setItem(flag, "1");

    const base = {
      assets: {
        housing: {
          marketValue: 18_000_000,
          mortgage: 5_200_000,
          monthlyPrincipal: 22_000,
        },
        equities: {
          marketValue: 2_450_000,
          dayPnL: -3_200,
          periodPnL: 186_000,
        },
        cash: {
          checking: 420_000,
          timeDeposit: 800_000,
          tdAnnualRate: 1.7,
        },
        passive: { monthly: 28_500 },
      },
      settings: {
        honesty: "pace",
        period: "30d",
        buyout: false,
        locale: "en",
        ...(extra.settings || {}),
      },
    };
    if (extra.assets) {
      Object.assign(base.assets, extra.assets);
    }
    localStorage.setItem("inertia.v1", JSON.stringify(base));
  }, overrides);
}

export async function dismissAdIfPresent(page: Page) {
  const ad = page.getByTestId("ad-overlay");
  if (await ad.isVisible().catch(() => false)) {
    await page.getByTestId("ad-skip").click();
    await ad.waitFor({ state: "detached" });
  }
}

export async function gotoHome(page: Page) {
  await page.goto("/");
  await page.getByTestId("app-title").waitFor();
}
