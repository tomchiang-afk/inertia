// node design/widget-v3/B-instrument/tools/render.mjs  (uses repo's playwright)
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(root, 'renders');
fs.mkdirSync(out, { recursive: true });
const url = q => 'file://' + path.join(root, 'index.html') + '?capture=1&' + q;
const only = process.argv[2] || 'png';
const browser = await chromium.launch();
async function shot(q, file, vp, scale = 3, t = 1500) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: scale });
  await page.goto(url(q)); await page.evaluate(() => window.__ready);
  await page.evaluate(ms => window.__setT(ms), t);
  await page.waitForTimeout(150);
  const el = await page.$('#root > *');
  await el.screenshot({ path: path.join(out, file) });
  await page.close(); console.log('wrote', file);
}
if (only === 'png') {
  for (const th of ['dark', 'light']) {
    await shot(`view=phone&theme=${th}`, `home-${th}.png`, { width: 412, height: 915 });
    await shot(`view=crop&size=2x2&theme=${th}`, `w2x2-${th}.png`, { width: 228, height: 238 });
    await shot(`view=crop&size=4x2&theme=${th}`, `w4x2-${th}.png`, { width: 428, height: 238 });
    await shot(`view=sheet&theme=${th}`, `privacy-sheet-${th}.png`, { width: 680, height: 1400 });
  }
  await shot(`view=controls&theme=dark`, `index-controls.png`, { width: 820, height: 980 }, 1);
}
if (only === 'video') {
  const th = process.argv[3] || 'dark';
  const dir = path.join(root, '.frames-' + th); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  await page.goto(url(`view=phone&theme=${th}`)); await page.evaluate(() => window.__ready);
  const fps = 30, secs = 10, t0 = 4000;   // window covers flips at 6.0s and 12.0s + 10 escapement beats
  for (let i = 0; i < fps * secs; i++) {
    await page.evaluate(ms => window.__setT(ms), t0 + i * 1000 / fps);
    await page.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.png') });
  }
  await page.close(); console.log('frames', dir);
}
await browser.close();
