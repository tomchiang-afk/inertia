import { test, expect, Page } from "@playwright/test";
import { seedEnglish, gotoHome } from "./helpers";

/**
 * Mandatory v0.5 layout gate: 5 locales x 4 phone widths.
 * The two-tier navigation must stay on one row per tier, every destination
 * must be present and at least 44px tall, and --faint must pass WCAG AA.
 */

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
];
const LOCALES = ["zh-TW", "en", "es", "ja", "ko"];
const DESTS = ["home", "house", "stock", "cash", "passive", "widget", "settings"];

function luminance(hex: string) {
  const rgb = hex.replace("#", "").match(/../g)!.map((v) => parseInt(v, 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

async function rowYs(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().y))
  );
}

for (const locale of LOCALES) {
  for (const vp of VIEWPORTS) {
    test(`layout ${locale} ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await seedEnglish(page, { settings: { locale } });
      await gotoHome(page);

      const strip = page.locator(".cat-strip button");
      const bottom = page.locator(".nav-bottom button");
      await expect(strip).toHaveCount(4);
      await expect(bottom).toHaveCount(3);

      // One row per tier: every button in a tier shares a y coordinate.
      expect(new Set(await rowYs(page, ".cat-strip button")).size).toBe(1);
      expect(new Set(await rowYs(page, ".nav-bottom button")).size).toBe(1);

      const buttons = await page.locator(".nav-shell button").evaluateAll((els) =>
        els.map((el) => ({
          go: el.getAttribute("data-go"),
          h: el.getBoundingClientRect().height,
        }))
      );
      expect(buttons).toHaveLength(7);
      expect(new Set(buttons.map((b) => b.go))).toEqual(new Set(DESTS));
      for (const b of buttons) {
        expect(b.h, `${b.go} height`).toBeGreaterThanOrEqual(44);
      }

      // The tiers fit the viewport without a horizontal page scroll.
      const noOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1
      );
      expect(noOverflow).toBe(true);

      // Every visible action control clears 44px.
      const actionHeights = await page
        .locator(".topbar .back, .btn:visible, .seg button:visible, .icon-btn:visible")
        .evaluateAll((els) =>
          els.map((el) => ({
            tag: el.textContent?.trim().slice(0, 20) || el.className,
            h: el.getBoundingClientRect().height,
          }))
        );
      for (const a of actionHeights) {
        expect(a.h, `${a.tag} height`).toBeGreaterThanOrEqual(44);
      }

      const [onBg, onSurface] = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        const read = (k: string) => cs.getPropertyValue(k).trim();
        return [read("--faint"), read("--bg"), read("--surface")];
      }).then(([faint, bg, surface]) => [contrast(faint, bg), contrast(faint, surface)]);
      expect(onBg).toBeGreaterThanOrEqual(4.5);
      expect(onSurface).toBeGreaterThanOrEqual(4.5);
    });
  }
}
