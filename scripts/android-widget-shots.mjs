/**
 * Render the HTML mock of the native Android widget (tools/android-widget-mock.html)
 * to PNGs:
 *   docs/shots/android-widget-*.png                         (docs)
 *   android/app/src/main/res/drawable-nodpi/widget_preview_{small,medium}.png  (widget picker)
 * Usage: npm run android:widget-shots
 */
import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const PORT = 5198;
const server = await createServer({ server: { port: PORT, strictPort: true, host: "127.0.0.1" }, logLevel: "error" });
await server.listen();
const browser = await chromium.launch();

async function shot(query, out, { dpr = 2, selector = "#stage" } = {}) {
  const page = await browser.newPage({ deviceScaleFactor: dpr, viewport: { width: 900, height: 500 } });
  await page.goto(`http://127.0.0.1:${PORT}/tools/android-widget-mock.html?${query}`);
  await page.waitForFunction(() => window.__mockReady === true);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(selector).screenshot({ path: out, omitBackground: true });
  await page.close();
  console.log("wrote", out);
}

mkdirSync("docs/shots", { recursive: true });
const RES = "android/app/src/main/res/drawable-nodpi";
mkdirSync(RES, { recursive: true });

try {
  // Picker previews (transparent background, single widget each).
  await shot("template=paper&mode=exact&sizes=small", `${RES}/widget_preview_small.png`, { selector: ".w" });
  await shot("template=paper&mode=exact&sizes=medium", `${RES}/widget_preview_medium.png`, { selector: ".w" });

  // Templates (exact mode) on a neutral wallpaper.
  for (const tpl of ["paper", "swiss", "sumi", "glass", "noir", "matrix"]) {
    await shot(`template=${tpl}&mode=exact&wall=1`, `docs/shots/android-widget-${tpl}.png`);
  }
  // Privacy modes (paper).
  for (const mode of ["exact", "rounded", "relative", "rhythm", "masked"]) {
    await shot(`template=paper&mode=${mode}&wall=1&caption=${encodeURIComponent(mode + " · {size}")}`,
      `docs/shots/android-widget-privacy-${mode}.png`);
  }
  // Placeholder (no snapshot yet).
  await shot("template=paper&empty=1&wall=1", "docs/shots/android-widget-placeholder.png");
} finally {
  await browser.close();
  await server.close();
}
