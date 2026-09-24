/**
 * Code-generated rhythm motion proof (same motion language as in-app CSS).
 * Pure JS — no native canvas. Draws 390×844 frames → docs/rhythm-demo.gif
 *
 * Label: Inertia rhythm demo — faithful recreation of metronome + pace ticker + spark playhead.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import GIFEncoder from "gif-encoder-2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_GIF = path.join(ROOT, "docs", "rhythm-demo.gif");
const OUT_MP4 = path.join(ROOT, "docs", "rhythm-demo.mp4");
const FRAMES_DIR = path.join(ROOT, "docs", "_rhythm-frames");

const W = 390;
const H = 844;
const FPS = 12;
const DURATION_S = 3.6; // ~2.2s beat cycle visible + spare
const N = Math.round(FPS * DURATION_S);

const ACCENT = [0x2f, 0x5d, 0x4a];
const BG = [0xf7, 0xf6, 0xf3];
const PAGE = [0xed, 0xeb, 0xe6];
const INK = [0x1a, 0x1a, 0x1a];
const MUTED = [0x5c, 0x5c, 0x5c];
const FAINT = [0x8a, 0x8a, 0x8a];
const WHITE = [255, 255, 255];
const LINE = [0xe8, 0xe8, 0xe8];

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function fillRect(png, x, y, w, h, rgb, a = 255) {
  const x0 = clamp(Math.floor(x), 0, W);
  const y0 = clamp(Math.floor(y), 0, H);
  const x1 = clamp(Math.ceil(x + w), 0, W);
  const y1 = clamp(Math.ceil(y + h), 0, H);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const i = (W * py + px) << 2;
      if (a >= 255) {
        png.data[i] = rgb[0];
        png.data[i + 1] = rgb[1];
        png.data[i + 2] = rgb[2];
        png.data[i + 3] = 255;
      } else {
        const aa = a / 255;
        png.data[i] = Math.round(rgb[0] * aa + png.data[i] * (1 - aa));
        png.data[i + 1] = Math.round(rgb[1] * aa + png.data[i + 1] * (1 - aa));
        png.data[i + 2] = Math.round(rgb[2] * aa + png.data[i + 2] * (1 - aa));
        png.data[i + 3] = 255;
      }
    }
  }
}

function fillRoundRect(png, x, y, w, h, r, rgb, a = 255) {
  // Approximate: fill rect + ignore perfect corners (fine at this scale)
  fillRect(png, x, y, w, h, rgb, a);
  void r;
}

function setPixel(png, x, y, rgb, a = 255) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= W || py >= H) return;
  const i = (W * py + px) << 2;
  if (a >= 255) {
    png.data[i] = rgb[0];
    png.data[i + 1] = rgb[1];
    png.data[i + 2] = rgb[2];
    png.data[i + 3] = 255;
  } else {
    const aa = a / 255;
    png.data[i] = Math.round(rgb[0] * aa + png.data[i] * (1 - aa));
    png.data[i + 1] = Math.round(rgb[1] * aa + png.data[i + 1] * (1 - aa));
    png.data[i + 2] = Math.round(rgb[2] * aa + png.data[i + 2] * (1 - aa));
    png.data[i + 3] = 255;
  }
}

function drawCircle(png, cx, cy, r, rgb) {
  const rr = r * r;
  for (let dy = -r - 1; dy <= r + 1; dy++) {
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      if (dx * dx + dy * dy <= rr) setPixel(png, cx + dx, cy + dy, rgb);
    }
  }
}

/** Tiny 5×7 bitmap font (digits + a few CJK-ish blocks via labels drawn as bars) */
const GLYPHS = {
  "0": ["01110","10001","10011","10101","11001","10001","01110"],
  "1": ["00100","01100","00100","00100","00100","00100","01110"],
  "2": ["01110","10001","00001","00110","01000","10000","11111"],
  "3": ["01110","10001","00001","00110","00001","10001","01110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"],
  "5": ["11111","10000","11110","00001","00001","10001","01110"],
  "6": ["01110","10000","11110","10001","10001","10001","01110"],
  "7": ["11111","00001","00010","00100","01000","01000","01000"],
  "8": ["01110","10001","10001","01110","10001","10001","01110"],
  "9": ["01110","10001","10001","10001","01111","00001","01110"],
  "N": ["10001","11001","10101","10011","10001","10001","10001"],
  "T": ["11111","00100","00100","00100","00100","00100","00100"],
  "$": ["00100","01111","10100","01110","00101","11110","00100"],
  "+": ["00000","00100","00100","11111","00100","00100","00000"],
  ",": ["00000","00000","00000","00000","00100","00100","01000"],
  ".": ["00000","00000","00000","00000","00000","01100","01100"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
  "-": ["00000","00000","00000","11111","00000","00000","00000"],
  ":": ["00000","01100","01100","00000","01100","01100","00000"],
  "/": ["00001","00010","00100","01000","10000","00000","00000"],
  "A": ["01110","10001","10001","11111","10001","10001","10001"],
  "B": ["11110","10001","10001","11110","10001","10001","11110"],
  "P": ["11110","10001","10001","11110","10000","10000","10000"],
  "M": ["10001","11011","10101","10001","10001","10001","10001"],
  "I": ["01110","00100","00100","00100","00100","00100","01110"],
  "E": ["11111","10000","10000","11110","10000","10000","11111"],
  "R": ["11110","10001","10001","11110","10100","10010","10001"],
  "Y": ["10001","10001","01010","00100","00100","00100","00100"],
  "H": ["10001","10001","10001","11111","10001","10001","10001"],
  "L": ["10000","10000","10000","10000","10000","10000","11111"],
  "V": ["10001","10001","10001","10001","10001","01010","00100"],
  "W": ["10001","10001","10001","10101","10101","11011","10001"],
  "G": ["01110","10001","10000","10111","10001","10001","01110"],
  "U": ["10001","10001","10001","10001","10001","10001","01110"],
  "O": ["01110","10001","10001","10001","10001","10001","01110"],
  "Q": ["01110","10001","10001","10001","10101","10010","01101"],
  "C": ["01110","10001","10000","10000","10000","10001","01110"],
  "D": ["11110","10001","10001","10001","10001","10001","11110"],
  "S": ["01111","10000","10000","01110","00001","00001","11110"],
  "F": ["11111","10000","10000","11110","10000","10000","10000"],
  "K": ["10001","10010","10100","11000","10100","10010","10001"],
  "?": ["01110","10001","00001","00010","00100","00000","00100"],
  "=": ["00000","11111","00000","11111","00000","00000","00000"],
};

function drawText(png, text, x, y, scale, rgb) {
  let cx = x;
  for (const ch of text) {
    const g = GLYPHS[ch] || GLYPHS[" "];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] === "1") {
          fillRect(png, cx + col * scale, y + row * scale, scale, scale, rgb);
        }
      }
    }
    cx += 6 * scale;
  }
}

function sparkY(i, n) {
  const t = i / (n - 1);
  const bump = Math.sin(i / 4.2) * 3 + t * 22;
  return 42 - bump;
}

function beatPulse(t, beatIndex, cycle = 2.0) {
  // Same language as CSS rhythmBeat: peak at beat start, decay
  const phase = (t + beatIndex * (cycle / 4)) % cycle;
  if (phase < cycle * 0.1) {
    const u = phase / (cycle * 0.1);
    return { opacity: 0.32 + 0.68 * (1 - u * 0.15), scale: 1 + 0.55 * (1 - u) };
  }
  if (phase < cycle * 0.2) {
    const u = (phase - cycle * 0.1) / (cycle * 0.1);
    return { opacity: 1 - 0.72 * u, scale: 1.55 - 0.55 * u };
  }
  return { opacity: 0.28, scale: 1 };
}

function drawFrame(t) {
  const png = new PNG({ width: W, height: H });
  fillRect(png, 0, 0, W, H, PAGE);

  // Phone chrome
  fillRoundRect(png, 12, 24, W - 24, H - 48, 28, BG);
  fillRect(png, 24, 48, W - 48, 28, WHITE);
  drawText(png, "INERTIA", 32, 56, 2, ACCENT);

  // Scene A (0–1.5s): lock widget; Scene B: home hero
  const showLock = t < 1.5;

  if (showLock) {
    // Dark stage
    fillRoundRect(png, 40, 120, W - 80, 220, 12, [42, 42, 44]);
    fillRoundRect(png, 58, 150, W - 116, 140, 14, [240, 240, 238]);
    drawText(png, "INERTIA", 72, 164, 2, ACCENT);
    drawText(png, "NET WORTH", 72, 186, 1, FAINT);
    drawText(png, "NT$16,470,000", 72, 204, 2, INK);

    const paceOpacity = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin((t / 2.0) * Math.PI * 2));
    const paceRgb = ACCENT.map((c) => Math.round(c * paceOpacity + 255 * (1 - paceOpacity)));
    drawText(png, "PACE +NT$51,600", 72, 236, 2, paceRgb);

    // Metronome 4 beats under pace
    const baseH = 14;
    const barW = 6;
    const gap = 5;
    const bx0 = 72;
    const by = 272;
    for (let b = 0; b < 4; b++) {
      const { opacity, scale } = beatPulse(t, b, 2.2);
      const bh = baseH * scale;
      const rgb = ACCENT;
      const a = Math.round(opacity * 255);
      fillRect(png, bx0 + b * (barW + gap), by - bh, barW, bh, rgb, a);
    }
  } else {
    // Home hero
    fillRoundRect(png, 28, 100, W - 56, 160, 8, WHITE);
    drawText(png, "NET WORTH", 44, 116, 1, FAINT);
    drawText(png, "NT$16,470,000", 44, 136, 3, INK);

    // Honesty pill + metro
    fillRoundRect(png, 44, 178, 72, 20, 10, [232, 240, 236]);
    const pillOp = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin((t / 2.0) * Math.PI * 2));
    drawText(png, "PACE", 56, 184, 1, ACCENT.map((c) => Math.round(c * pillOp)));

    const baseH = 16;
    const barW = 6;
    const gap = 4;
    const bx0 = 130;
    const by = 196;
    for (let b = 0; b < 4; b++) {
      const { opacity, scale } = beatPulse(t, b, 2.2);
      const bh = baseH * scale;
      fillRect(
        png,
        bx0 + b * (barW + gap),
        by - bh,
        barW,
        bh,
        ACCENT,
        Math.round(opacity * 255)
      );
    }

    // Live counter easing toward quietDay (~1720)
    const target = 1720;
    const floor = Math.round(target * 0.55);
    const loop = 3.6;
    const p = (t % loop) / loop;
    let eased;
    if (p < 0.88) {
      const u = p / 0.88;
      eased = u * u * (3 - 2 * u);
    } else {
      const u = (p - 0.88) / 0.12;
      eased = 1 - u * u * (3 - 2 * u);
    }
    const val = Math.round(floor + (target - floor) * eased);
    drawText(png, "PACE RUN NT$" + val.toLocaleString("en-US"), 44, 220, 2, ACCENT);

    // Sparkline card
    fillRoundRect(png, 28, 280, W - 56, 100, 8, WHITE);
    drawText(png, "30D QUIET GROWTH", 44, 292, 1, FAINT);
    const n = 30;
    const sx0 = 44;
    const sy0 = 320;
    const sw = W - 100;
    let prev = null;
    for (let i = 0; i < n; i++) {
      const x = sx0 + (i / (n - 1)) * sw;
      const y = sy0 + sparkY(i, n);
      if (prev) {
        // crude line
        const steps = 8;
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          setPixel(png, prev[0] + (x - prev[0]) * u, prev[1] + (y - prev[1]) * u, ACCENT);
          setPixel(png, prev[0] + (x - prev[0]) * u, prev[1] + (y - prev[1]) * u + 1, ACCENT);
        }
      }
      prev = [x, y];
    }
    // Playhead along path (~7.5s in app; faster here)
    const ph = ((t - 1.5) % 2.1) / 2.1;
    const fi = ph * (n - 1);
    const i0 = Math.floor(fi);
    const tt = fi - i0;
    const x0 = sx0 + (i0 / (n - 1)) * sw;
    const x1 = sx0 + (Math.min(i0 + 1, n - 1) / (n - 1)) * sw;
    const y0 = sy0 + sparkY(i0, n);
    const y1 = sy0 + sparkY(Math.min(i0 + 1, n - 1), n);
    drawCircle(png, x0 + (x1 - x0) * tt, y0 + (y1 - y0) * tt, 4, ACCENT);
  }

  // Footer label
  fillRect(png, 0, H - 56, W, 56, PAGE);
  drawText(png, "INERTIA RHYTHM DEMO", 48, H - 40, 2, MUTED);
  drawText(png, "SAME MOTION AS APP  ?DEMO=1", 40, H - 22, 1, FAINT);

  return png;
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_GIF), { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const encoder = new GIFEncoder(W, H, "neuquant", true);
  encoder.setDelay(Math.round(1000 / FPS));
  encoder.setRepeat(0);
  encoder.start();

  const framePaths = [];
  for (let i = 0; i < N; i++) {
    const t = i / FPS;
    const png = drawFrame(t);
    encoder.addFrame(png.data);
    const fp = path.join(FRAMES_DIR, `f${String(i).padStart(3, "0")}.png`);
    await new Promise((res, rej) => {
      png
        .pack()
        .pipe(fs.createWriteStream(fp))
        .on("finish", res)
        .on("error", rej);
    });
    framePaths.push(fp);
    if (i % 6 === 0) console.log(`frame ${i + 1}/${N}`);
  }

  encoder.finish();
  fs.writeFileSync(OUT_GIF, encoder.out.getData());
  console.log("Wrote", OUT_GIF, `(${N} frames @ ${FPS}fps)`);

  // Optional mp4 via ffmpeg
  try {
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-framerate",
        String(FPS),
        "-i",
        path.join(FRAMES_DIR, "f%03d.png"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        OUT_MP4,
      ],
      { encoding: "utf8" }
    );
    if (r.status === 0) console.log("Wrote", OUT_MP4);
    else console.warn("ffmpeg mp4 skipped:", r.stderr?.slice(-200));
  } catch (e) {
    console.warn("ffmpeg mp4 skipped:", e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
