// node design/widget-v3/B2-pure/tools/render.mjs png | video   (uses the repo's playwright)
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'renders'); fs.mkdirSync(out, { recursive: true });
const url = q => 'file://' + path.join(root, 'index.html') + '?capture=1&' + q;
const what = process.argv[2] || 'png';
const browser = await chromium.launch();
async function shot(q, file, vp, scale = 3, t = 0) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: scale });
  await page.goto(url(q)); await page.evaluate(() => window.__ready);
  await page.evaluate(ms => window.__setT(ms), t); await page.waitForTimeout(200);
  await (await page.$('#root > *')).screenshot({ path: path.join(out, file) });
  await page.close(); console.log('wrote', file);
}
if (what === 'png') {
  await shot('view=home&app=light', 'home-light.png', { width: 430, height: 932 });
  await shot('view=home&app=dark', 'home-dark.png', { width: 430, height: 932 });
  await shot('view=home&app=tinted', 'home-tinted.png', { width: 430, height: 932 });
  await shot('view=home&app=clear', 'home-clear.png', { width: 430, height: 932 });
  await shot('view=lock', 'lock.png', { width: 430, height: 932 });
  await shot('view=sheet&app=light', 'privacy-sheet-light.png', { width: 1000, height: 1300 });
  await shot('view=sheet&app=dark', 'privacy-sheet-dark.png', { width: 1000, height: 1300 });
  await shot('view=renderings', 'renderings-light-dark-tinted-clear.png', { width: 850, height: 920 });
  await shot('view=controls', 'index-controls.png', { width: 860, height: 1000 }, 1);
}
if (what === 'video') {
  const view = process.argv[3] || 'home', app = process.argv[4] || 'light', accel = 360;
  const dir = path.join(root, `.frames-${view}-${app}`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await page.goto(url(`view=${view}&app=${app}&accel=${accel}`)); await page.evaluate(() => window.__ready);
  const fps = 30, secs = 10;
  // start 1.6 s (virtual 22:07:20 + 9.6 min) before the 22:15 entry lands → rolls at ~1.2 s, 3.7 s, 6.2 s, 8.7 s
  for (let i = 0; i < fps * secs; i++) {
    await page.evaluate(ms => window.__setT(ms), i * 1000 / fps);
    await page.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.png') });
  }
  await page.close(); console.log('frames', dir);
}
await browser.close();
