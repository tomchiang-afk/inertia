// Renders PNGs / video for Direction C (iOS-first). Usage: node render.mjs [pngs|video|quick]
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const url = q => 'file://' + path.join(dir, 'index.html') + '?' + q;
const what = process.argv[2] || 'pngs';
const browser = await chromium.launch();
async function shot(q, out, scale = 3, vp = { width: 430, height: 932 }, full = false) {
  const p = await browser.newPage({ viewport: vp, deviceScaleFactor: scale });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url(q)); await p.waitForFunction(() => window.__ready === true); await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(dir, out), fullPage: full });
  if (errs.length) console.log('ERR', out, errs);
  console.log('wrote', out); await p.close();
}
const T = 't=7000'; // steady state, mid-entry (entry 2)
mkdirSync(path.join(dir, 'renders'), { recursive: true });
if (what === 'quick') {
  await shot(`view=home&controls=0&theme=dark&${T}`, 'renders/_quick.png', 2);
} else if (what === 'pngs') {
  for (const th of ['dark', 'light', 'tinted']) await shot(`view=home&controls=0&theme=${th}&${T}`, `renders/home-${th}.png`);
  await shot(`view=lock&controls=0&${T}`, 'renders/lock-screen.png');
  for (const th of ['dark', 'light']) {
    await shot(`view=medium&theme=${th}&${T}`, `renders/medium-${th}.png`, 3, { width: 400, height: 206 });
    await shot(`view=small&theme=${th}&${T}`, `renders/small-${th}.png`, 3, { width: 206, height: 206 });
  }
  await shot(`view=sheet&${T}`, 'renders/privacy-modes-sheet.png', 3, { width: 1480, height: 800 }, true);
  await shot(`theme=dark&${T}`, 'renders/mock-interactive.png', 2, { width: 780, height: 1000 });
} else if (what === 'video') {
  const fr = path.join(dir, 'renders/_frames'); rmSync(fr, { recursive: true, force: true }); mkdirSync(fr, { recursive: true });
  const p = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.goto(url('view=video&theme=dark&t=0')); await p.waitForFunction(() => window.__ready === true);
  const fps = 30, secs = 10;
  for (let i = 0; i < fps * secs; i++) {
    await p.evaluate(t => window.__setTime(t), 1500 + (i / fps) * 1000);
    await p.screenshot({ path: path.join(fr, String(i).padStart(4, '0') + '.png') });
  }
  const fr2 = path.join(dir, 'renders/_frames2'); rmSync(fr2, { recursive: true, force: true }); mkdirSync(fr2, { recursive: true });
  const q = await browser.newPage({ viewport: { width: 400, height: 206 }, deviceScaleFactor: 2 });
  await q.goto(url('view=medium&theme=dark&t=0')); await q.waitForFunction(() => window.__ready === true);
  for (let i = 0; i < 15 * secs; i++) {
    await q.evaluate(t => window.__setTime(t), 1500 + (i / 15) * 1000);
    await q.screenshot({ path: path.join(fr2, String(i).padStart(4, '0') + '.png') });
  }
  const o = path.join(dir, 'renders');
  execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${fr}/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart ${o}/sediment-ios-home.mp4`);
  execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${fr}/%04d.png -vf "fps=15,scale=430:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" ${o}/sediment-ios-home.gif`);
  execSync(`ffmpeg -y -loglevel error -framerate 15 -i ${fr2}/%04d.png -vf "scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" ${o}/sediment-medium.gif`);
  rmSync(fr, { recursive: true, force: true }); rmSync(fr2, { recursive: true, force: true });
  console.log('video done');
}
await browser.close();
