import { buildWidgetSnapshot } from "../src/widgetSnapshot.js";
import { setLocale } from "../src/i18n/index.js";
import { DEFAULT_ASSETS } from "../src/store.js";

/* Palette mirror of android/.../widget/WidgetTheme.java + drawable/widget_bg_*.xml */
const THEMES = {
  paper: { bg: "#FCFBF8", radius: 18, border: null, ink: "#1A1A1A", muted: "#5C5C5C", faint: "#8A8A8A", track: "#E8E8E8", accent: "#2F5D4A", sharp: false },
  swiss: { bg: "#FAFAFB", radius: 2, border: "1px solid #D8D8DE", ink: "#0A0A0A", muted: "#4A4A4E", faint: "#7A7A80", track: "#D8D8DE", accent: "#9B1B2E", sharp: true, rule: true },
  sumi: { bg: "#F3F5F1", radius: 14, border: null, ink: "#1C1C1A", muted: "#555850", faint: "#7E8378", track: "#D0D6CC", accent: "#3F4F42", sharp: false },
  glass: { bg: "rgba(255,255,255,0.90)", radius: 22, border: "1px solid rgba(255,255,255,0.45)", ink: "#1B1D21", muted: "#5A5E66", faint: "#8B9099", track: "rgba(0,0,0,0.12)", accent: "#2C5F6E", sharp: false },
  noir: { bg: "#2C2C2E", radius: 18, border: "1px solid #3A3A3C", ink: "#F2F2F0", muted: "#A1A19C", faint: "#6E6E6A", track: "#3A3A3C", accent: "#8FA896", sharp: false },
  matrix: { bg: "#FFFFFF", radius: 4, border: "1.5px solid #2A2A2A", ink: "#111111", muted: "#5A5A5A", faint: "#8A8A8A", track: "#C8C8C8", accent: "#0B7A4B", sharp: true },
};

const DPR = window.devicePixelRatio || 1;

function hexA(color, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a / 255})`;
}

/* Mirror of WidgetBitmaps.rhythm */
function rhythmCanvas(wDp, hDp, style, day, n, th) {
  const c = document.createElement("canvas");
  const w = Math.round(wDp * DPR), h = Math.round(hDp * DPR);
  c.width = w; c.height = h; c.style.width = wDp + "px"; c.style.height = hDp + "px";
  const g = c.getContext("2d");
  if (style === "scan") {
    const blocks = 4, gap = h * 0.6, bw = (w - gap * (blocks - 1)) / blocks;
    const cur = Math.min(blocks - 1, Math.floor(((day - 1) * blocks) / n));
    for (let i = 0; i < blocks; i++) {
      g.fillStyle = i === cur ? th.accent : i < cur ? th.faint : th.track;
      g.fillRect(i * (bw + gap), 0, bw, h);
    }
    return c;
  }
  const slot = w / n;
  for (let i = 0; i < n; i++) {
    const d = i + 1, past = d < day, today = d === day, cx = i * slot + slot / 2;
    const beat = 0.45 + 0.55 * Math.abs(Math.sin(d * 0.9));
    if (style === "dots" || style === "ink") {
      const ink = style === "ink";
      const r = Math.min(Math.min(slot * (ink ? 0.3 : 0.38), 3.2 * DPR), h / 2);
      const pitch = r * 2 + Math.max(1, r * (ink ? 1.0 : 0.6));
      const rows = Math.max(1, Math.floor((h + (pitch - 2 * r)) / pitch));
      const lit = today ? rows : past ? Math.max(1, Math.round(rows * beat)) : 0;
      const top = (h - (rows * pitch - (pitch - 2 * r))) / 2;
      for (let row = 0; row < rows; row++) {
        const on = row >= rows - lit;
        g.fillStyle = today && on ? th.accent : on ? hexA(th.accent, ink ? 110 + 120 * beat : 200) : th.track;
        if (!on && rows > 1 && row < rows - 1 && !past && !today) continue;
        const cy = rows === 1 ? h / 2 : top + r + row * pitch;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      }
    } else {
      const bw = Math.max(1, Math.min(slot * 0.58, 3 * DPR));
      let bh = today ? h : h * beat;
      if (!past && !today) bh = Math.min(h * 0.35, 3 * DPR);
      g.fillStyle = today || past ? th.accent : th.track;
      g.beginPath();
      if (style === "bars-sharp" || th.sharp) g.rect(cx - bw / 2, h - bh, bw, bh);
      else g.roundRect(cx - bw / 2, h - bh, bw, bh, bw / 2);
      g.fill();
    }
  }
  return c;
}

/* Mirror of WidgetBitmaps.goalBar */
function goalCanvas(wDp, hDp, pct, th) {
  const c = document.createElement("canvas");
  const w = Math.round(wDp * DPR), h = Math.round(hDp * DPR);
  c.width = w; c.height = h; c.style.width = wDp + "px"; c.style.height = hDp + "px";
  const g = c.getContext("2d");
  const r = th.sharp ? 0 : h / 2;
  g.fillStyle = th.track; g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill();
  if (pct != null && pct >= 0) {
    const fw = (w * Math.min(Math.max(pct, 0), 100)) / 100;
    if (fw > 0) { g.fillStyle = th.accent; g.beginPath(); g.roundRect(0, 0, Math.max(fw, h), h, r); g.fill(); }
  }
  return c;
}

function el(tag, cls, text, style) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (style) Object.assign(e.style, style);
  return e;
}

function fmtUpdated(at) {
  const d = new Date(at);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

/* Mirror of WidgetRenderer.render */
export function renderWidget(snap, { wDp, hDp, medium, now = new Date() }) {
  const th = THEMES[snap?.template] || THEMES.paper;
  const w = el("div", "w" + (medium ? " medium" : ""), null, {
    width: wDp + "px", height: hDp + "px", background: th.bg, borderRadius: th.radius + "px",
    border: th.border || "none", color: th.ink,
  });
  w.dataset.testid = "android-widget";
  if (th.rule) w.append(el("div", "rule", null, { background: th.accent }));
  const head = el("div", "head");
  head.append(el("div", "brand", "Inertia", { color: th.ink }));
  const upd = el("div", "upd", snap ? `${snap.labels.updated} ${fmtUpdated(snap.updatedAt)}` : "", { color: th.faint });
  head.append(upd);
  w.append(head, el("div", "spacer"));
  if (!snap) {
    w.append(el("div", "ph", "開啟 Inertia 一次即可同步小工具。", { color: th.muted }));
    return w;
  }
  const contentW = wDp - 28;
  const body = el("div", "body");
  const nw = snap.netWorth;
  if (nw.show) {
    body.append(el("div", "lab", nw.label, { color: th.muted }));
    // API 26+ (autoSizeTextType) shows the full string on both sizes.
    body.append(el("div", "val", nw.text, { color: th.ink }));
  } else if (snap.mode === "rhythm" && snap.rhythm.show) {
    body.append(el("div", "lab", snap.rhythm.label, { color: th.muted }));
  }
  if (snap.pace.show) {
    const p = el("div", "pace");
    p.append(el("span", null, snap.pace.label, { color: th.muted }), el("b", null, snap.pace.text, { color: th.accent }));
    body.append(p);
  }
  const hasBuckets = medium && snap.buckets.length > 0;
  let goalEl = null;
  if (snap.goal.show && hDp >= (medium ? 128 : 132)) {
    goalEl = el("div", "goal");
    goalEl.append(el("div", "gt", snap.goal.text ? `${snap.goal.name} · ${snap.goal.text}` : snap.goal.name, { color: th.muted }));
    const gw = hasBuckets ? Math.round(((contentW - 21) * 1.15) / 2.15) : contentW;
    goalEl.append(goalCanvas(gw, 3, snap.goal.barPct, th));
  }
  if (medium) {
    const cols = el("div", "cols");
    const left = el("div", "left");
    left.append(body);
    if (goalEl) left.append(goalEl);
    cols.append(left);
    if (hasBuckets) {
      cols.append(el("div", "div", null, { background: th.track }));
      const right = el("div", "right");
      for (const b of snap.buckets.slice(0, 4)) {
        const r = el("div", "brow");
        r.append(el("span", null, b.label, { color: th.muted }), el("span", null, b.text, { color: th.ink }));
        right.append(r);
      }
      cols.append(right);
    }
    w.append(cols);
  } else {
    w.append(body);
  }
  if (snap.rhythm.show) {
    const day = now.getDate();
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const r = rhythmCanvas(contentW, snap.mode === "rhythm" ? (medium ? 22 : 18) : 8, snap.rhythm.style, day, dim, th);
    r.classList.add("rhythm");
    w.append(r);
  }
  if (!medium && goalEl) w.append(goalEl);
  return w;
}

/* ---- Query-driven page: ?template=paper&mode=exact&sizes=small,medium&wall=1&empty=1 ---- */
const q = new URLSearchParams(location.search);
const template = q.get("template") || "paper";
const mode = q.get("mode") || "exact";
const sizes = (q.get("sizes") || "small,medium").split(",");
const now = new Date(2026, 8, 27, 20, 13);
setLocale(q.get("locale") || "zh-TW");
const state = {
  assets: structuredClone(DEFAULT_ASSETS),
  settings: { widgetTemplate: template, widgetPrivacy: { displayMode: mode } },
  goals: q.get("goal") === "0" ? [] : [{ id: "g1", name: "換屋頭期款", target: 20_000_000, align: "netWorth", onWidget: true }],
};
const snap = q.get("empty") === "1" ? null : buildWidgetSnapshot(state, { now });
const stage = document.getElementById("stage");
if (q.get("wall") === "1") stage.classList.add(template === "noir" ? "wall-dark" : "wall");
const DIMS = { small: [170, 170, false], medium: [352, 170, true] };
for (const s of sizes) {
  const [wDp, hDp, medium] = DIMS[s] || DIMS.small;
  const box = el("div");
  box.append(renderWidget(snap, { wDp, hDp, medium, now }));
  if (q.get("caption")) box.append(el("div", "cap", q.get("caption").replace("{size}", s === "small" ? "2×2" : "4×2")));
  stage.append(box);
}
/* Emulate android:autoSizeTextType="uniform" on the value line. */
for (const v of document.querySelectorAll(".val")) {
  let size = parseFloat(getComputedStyle(v).fontSize);
  while (v.scrollWidth > v.clientWidth && size > 12) {
    size -= 0.5;
    v.style.fontSize = size + "px";
  }
}
window.__mockReady = true;
