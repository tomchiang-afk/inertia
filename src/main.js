import "./styles.css";
import {
  loadState,
  saveState,
  WIDGET_TEMPLATES,
  normalizeWidgetTemplate,
} from "./store.js";
import {
  derive,
  periodDays,
  periodLabel,
  fmtNT,
  fmtDelta,
} from "./math.js";
import { configureAdGate, withEditAd } from "./adGate.js";
import { fetchDelayedQuotes, mockPortfolioFromQuotes } from "./quotes.js";
import {
  t,
  setLocale,
  detectLocale,
  SUPPORTED,
  localeLabel,
} from "./i18n/index.js";

const state = loadState();

/* First launch: detect navigator.language; persist settings.locale */
if (!state.settings.locale || !SUPPORTED.includes(state.settings.locale)) {
  state.settings.locale = detectLocale();
  saveState(state);
}
setLocale(state.settings.locale);
state.settings.widgetTemplate = normalizeWidgetTemplate(state.settings.widgetTemplate);

let route = "home"; // home | house | stock | cash | passive | settings | widget-lock | widget-home
let editBucket = null; // null | house | stock | cash | passive

configureAdGate({ getBuyout: () => !!state.settings.buyout });

const app = document.getElementById("app");

function persist() {
  saveState(state);
}

function currentTemplate() {
  return normalizeWidgetTemplate(state.settings.widgetTemplate);
}

function applyTemplateAttr(root) {
  const id = currentTemplate();
  root.setAttribute("data-template", id);
  document.documentElement.setAttribute("data-template", id);
  document.body.setAttribute("data-template", id);
}

function go(name) {
  route = name;
  editBucket = null;
  render();
}

function primaryPeriodDelta(d) {
  const days = periodDays(state.settings.period);
  const q = Math.round(d.periodQuiet(days));
  if (state.settings.honesty === "pace") return q;
  const scale = days / 30;
  const eq = Math.round(state.assets.equities.periodPnL * scale);
  return eq + q;
}

function sparkPath(quietDay) {
  // Ascending quiet-growth sparkline → path + coords for playhead
  const w = 360;
  const h = 56;
  const pts = [];
  for (let i = 0; i < 30; i++) {
    const x = (i / 29) * w;
    const bump = Math.sin(i / 4.2) * 3 + (i / 29) * (h * 0.35);
    const y = h * 0.78 - bump - (quietDay / 2000) * 4;
    pts.push([x, Math.max(8, Math.min(h - 6, y))]);
  }
  const d = pts
    .map((p, i) =>
      (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)
    )
    .join(" ");
  const fill =
    d + " L" + w.toFixed(1) + " " + h + " L0 " + h + " Z";
  return { w, h, d, fill, coords: pts, last: pts[pts.length - 1] };
}

function metroHTML() {
  return `<span class="rhythm-metro pace-only" data-testid="rhythm-metro" aria-hidden="true">
    <span class="rhythm-beat"></span>
    <span class="rhythm-beat"></span>
    <span class="rhythm-beat"></span>
    <span class="rhythm-beat"></span>
  </span>`;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* —— Rhythm live counter + spark playhead —— */
let rhythmRaf = null;
let playheadRaf = null;
let sparkCoords = [];
let lastRoute = null;

function stopRhythmLive() {
  if (rhythmRaf != null) {
    cancelAnimationFrame(rhythmRaf);
    rhythmRaf = null;
  }
}

function stopPlayhead() {
  if (playheadRaf != null) {
    cancelAnimationFrame(playheadRaf);
    playheadRaf = null;
  }
}

function setRhythmLiveStatic(quietDay) {
  const el = document.getElementById("rhythmLive");
  if (el) el.textContent = fmtNT(Math.round(quietDay));
}

function startRhythmLive(quietDay) {
  stopRhythmLive();
  const el = document.getElementById("rhythmLive");
  if (!el) return;
  if (prefersReducedMotion()) {
    setRhythmLiveStatic(quietDay);
    return;
  }
  const target = quietDay;
  const floor = Math.round(target * 0.55);
  const demo = document.body.classList.contains("demo-rhythm");
  const loopMs = demo ? 7000 : 22000;
  const t0 = performance.now();

  function frame(now) {
    if (route !== "home") {
      rhythmRaf = null;
      return;
    }
    const elapsed = (now - t0) % loopMs;
    const p = elapsed / loopMs;
    let eased;
    if (p < 0.88) {
      const u = p / 0.88;
      eased = u * u * (3 - 2 * u);
    } else {
      const u = (p - 0.88) / 0.12;
      eased = 1 - u * u * (3 - 2 * u);
    }
    const val = Math.round(floor + (target - floor) * eased);
    el.textContent = fmtNT(Math.min(val, Math.round(target)));
    rhythmRaf = requestAnimationFrame(frame);
  }
  rhythmRaf = requestAnimationFrame(frame);
}

function startPlayhead() {
  stopPlayhead();
  const head = document.getElementById("sparkPlayhead");
  if (!head || !sparkCoords.length) return;
  if (prefersReducedMotion()) {
    head.setAttribute("hidden", "");
    return;
  }
  head.removeAttribute("hidden");
  const demo = document.body.classList.contains("demo-rhythm");
  const loopMs = demo ? 4500 : 7500;
  const t0 = performance.now();
  const n = sparkCoords.length;

  function frame(now) {
    if (route !== "home") {
      playheadRaf = null;
      return;
    }
    const p = ((now - t0) % loopMs) / loopMs;
    const f = p * (n - 1);
    const i = Math.floor(f);
    const tFrac = f - i;
    const a = sparkCoords[i];
    const b = sparkCoords[Math.min(i + 1, n - 1)];
    const x = a[0] + (b[0] - a[0]) * tFrac;
    const y = a[1] + (b[1] - a[1]) * tFrac;
    head.setAttribute("cx", x.toFixed(2));
    head.setAttribute("cy", y.toFixed(2));
    playheadRaf = requestAnimationFrame(frame);
  }
  playheadRaf = requestAnimationFrame(frame);
}

function animateSparkStroke() {
  const line = document.getElementById("sparkLine");
  if (!line) return;
  line.classList.remove("animate");
  void line.getBoundingClientRect();
  if (!prefersReducedMotion()) line.classList.add("animate");
}

function onLeaveRhythmViews() {
  stopRhythmLive();
  stopPlayhead();
  const head = document.getElementById("sparkPlayhead");
  if (head) head.setAttribute("hidden", "");
}

function onEnterHome(quietDay) {
  requestAnimationFrame(() => {
    animateSparkStroke();
    if (state.settings.honesty === "pace") {
      startRhythmLive(quietDay);
    } else {
      setRhythmLiveStatic(quietDay);
    }
    startPlayhead();
  });
}

function openEdit(bucket) {
  withEditAd("edit", () => {
    editBucket = bucket;
    render();
  });
}

function closeEdit() {
  editBucket = null;
  render();
}

function saveEdit(bucket, values) {
  withEditAd("save", () => {
    if (bucket === "house") {
      state.assets.housing.marketValue = values.marketValue;
      state.assets.housing.mortgage = values.mortgage;
      state.assets.housing.monthlyPrincipal = values.monthlyPrincipal;
    } else if (bucket === "stock") {
      state.assets.equities.marketValue = values.marketValue;
      state.assets.equities.dayPnL = values.dayPnL;
      state.assets.equities.periodPnL = values.periodPnL;
    } else if (bucket === "cash") {
      state.assets.cash.checking = values.checking;
      state.assets.cash.timeDeposit = values.timeDeposit;
      state.assets.cash.tdAnnualRate = values.tdAnnualRate;
    } else if (bucket === "passive") {
      state.assets.passive.monthly = values.monthly;
    }
    persist();
    editBucket = null;
    render();
  });
}

function num(form, name) {
  const v = form.elements[name].value;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function editSheetHTML(bucket) {
  const h = state.assets.housing;
  const e = state.assets.equities;
  const c = state.assets.cash;
  const p = state.assets.passive;
  let title = t("edit");
  let fields = "";

  if (bucket === "house") {
    title = t("edit.housing");
    fields = `
      <div class="field"><label for="f-mv">${t("edit.marketValue")}</label>
        <input id="f-mv" name="marketValue" type="number" inputmode="numeric" value="${h.marketValue}" /></div>
      <div class="field"><label for="f-mort">${t("edit.mortgage")}</label>
        <input id="f-mort" name="mortgage" type="number" inputmode="numeric" value="${h.mortgage}" /></div>
      <div class="field"><label for="f-prin">${t("edit.monthlyPrincipal")}</label>
        <input id="f-prin" name="monthlyPrincipal" type="number" inputmode="numeric" value="${h.monthlyPrincipal}" /></div>`;
  } else if (bucket === "stock") {
    title = t("edit.twse");
    fields = `
      <div class="field"><label for="f-smv">${t("edit.marketValue")}</label>
        <input id="f-smv" name="marketValue" type="number" inputmode="numeric" value="${e.marketValue}" /></div>
      <div class="field"><label for="f-day">${t("edit.todayPnL")}</label>
        <input id="f-day" name="dayPnL" type="number" inputmode="numeric" value="${e.dayPnL}" /></div>
      <div class="field"><label for="f-per">${t("edit.periodPnL")}</label>
        <input id="f-per" name="periodPnL" type="number" inputmode="numeric" value="${e.periodPnL}" /></div>`;
  } else if (bucket === "cash") {
    title = t("edit.cash");
    fields = `
      <div class="field"><label for="f-chk">${t("edit.checking")}</label>
        <input id="f-chk" name="checking" type="number" inputmode="numeric" value="${c.checking}" /></div>
      <div class="field"><label for="f-td">${t("edit.timeDeposit")}</label>
        <input id="f-td" name="timeDeposit" type="number" inputmode="numeric" value="${c.timeDeposit}" /></div>
      <div class="field"><label for="f-rate">${t("edit.tdRate")}</label>
        <input id="f-rate" name="tdAnnualRate" type="number" step="0.01" inputmode="decimal" value="${c.tdAnnualRate}" /></div>`;
  } else if (bucket === "passive") {
    title = t("edit.passive");
    fields = `
      <div class="field"><label for="f-pass">${t("edit.monthlyPassive")}</label>
        <input id="f-pass" name="monthly" type="number" inputmode="numeric" value="${p.monthly}" /></div>`;
  }

  return `
    <div class="sheet-backdrop" id="edit-backdrop" role="dialog" aria-modal="true" aria-label="${title}">
      <form class="sheet" id="edit-form" data-testid="edit-form">
        <h2>${title}</h2>
        ${fields}
        <div class="sheet-actions">
          <button type="button" class="btn btn-ghost" id="edit-cancel">${t("cancel")}</button>
          <button type="submit" class="btn btn-primary">${t("save")}</button>
        </div>
      </form>
    </div>`;
}

function screenHome(d) {
  const pl = periodLabel(state.settings.period);
  const delta = primaryPeriodDelta(d);
  const honesty =
    state.settings.honesty === "pace" ? t("honesty.pace") : t("honesty.actual");
  const spark = sparkPath(d.quietDay);
  const stockDeltaClass =
    state.assets.equities.dayPnL < 0 ? "down" : "";

  return `
    <div class="topbar"><div class="title">${t("brand")}</div>
      <button type="button" class="back" data-go="settings">${t("settings")}</button>
    </div>
    <div class="screen active" data-screen="home">
      <div class="hero">
        <div class="label">${t("netWorth")}</div>
        <div class="nw" data-testid="net-worth">${fmtNT(d.netWorth)}</div>
        <div class="meta-row">
          <span class="pill ${delta >= 0 ? "up" : "down"}">${pl} ${fmtDelta(delta)}</span>
          <button type="button" class="pill accent ${state.settings.honesty === "pace" ? "pace-breathe" : ""}" id="honesty-toggle" aria-pressed="${state.settings.honesty === "pace"}">${honesty}</button>
          ${state.settings.honesty === "pace" ? metroHTML() : ""}
        </div>
      </div>
      <p class="quiet-line">${t("quiet.line", { amount: `<strong>${fmtNT(Math.round(d.quietDay))}</strong>` })}</p>
      ${
        state.settings.honesty === "pace"
          ? `<p class="rhythm-live-line" id="rhythmLiveLine">${t("rhythm.paceRunning")} <span id="rhythmLive">${fmtNT(Math.round(d.quietDay * 0.55))}</span></p>`
          : state.settings.honesty === "actual"
          ? `<p class="quiet-line" style="color:${state.assets.equities.dayPnL < 0 ? "var(--down)" : "var(--accent)"}">${t("twse.today", { delta: fmtDelta(state.assets.equities.dayPnL) })}</p>`
          : ""
      }
      <div class="spark-wrap">
        <div class="cap">${t("spark.cap")}</div>
        <svg viewBox="0 0 ${spark.w} ${spark.h}" preserveAspectRatio="none" aria-hidden="true">
          <path class="fill" d="${spark.fill}" />
          <path class="line" id="sparkLine" d="${spark.d}" />
          <circle id="sparkPlayhead" cx="${spark.coords[0][0]}" cy="${spark.coords[0][1]}" r="4" hidden />
        </svg>
      </div>
      <div class="asset-list">
        <button type="button" class="asset-row" data-go="house" data-testid="bucket-housing">
          <span class="name">${t("asset.housingEquity")}</span>
          <span class="amt">${fmtNT(d.netEquity, true)}</span>
          <span class="delta">${t("delta.principalMo", { amount: fmtNT(state.assets.housing.monthlyPrincipal, true) })}</span>
          <span class="chev">›</span>
        </button>
        <button type="button" class="asset-row" data-go="stock">
          <span class="name">${t("asset.twse")}</span>
          <span class="amt">${fmtNT(state.assets.equities.marketValue, true)}</span>
          <span class="delta ${stockDeltaClass}">${t("delta.today", { delta: fmtDelta(state.assets.equities.dayPnL, true) })}</span>
          <span class="chev">›</span>
        </button>
        <button type="button" class="asset-row" data-go="cash">
          <span class="name">${t("asset.cash")}</span>
          <span class="amt">${fmtNT(d.cashTotal, true)}</span>
          <span class="delta mute">${t("delta.checkingTd")}</span>
          <span class="chev">›</span>
        </button>
        <button type="button" class="asset-row" data-go="passive">
          <span class="name">${t("asset.passive")}</span>
          <span class="amt">${fmtNT(state.assets.passive.monthly, true)}${t("perMo")}</span>
          <span class="delta mute">${t("delta.monthlyPace")}</span>
          <span class="chev">›</span>
        </button>
      </div>
    </div>`;
}

function screenBucket(kind, d) {
  const titles = {
    house: t("bucket.housing"),
    stock: t("bucket.twse"),
    cash: t("bucket.cash"),
    passive: t("bucket.passive"),
  };
  let body = "";
  if (kind === "house") {
    const h = state.assets.housing;
    body = `
      <div class="detail-card">
        <div class="detail-row"><span class="k">${t("field.netEquity")}</span><span class="v">${fmtNT(d.netEquity)}</span></div>
        <div class="detail-row"><span class="k">${t("field.marketValue")}</span><span class="v" data-testid="housing-market-value">${fmtNT(h.marketValue)}</span></div>
        <div class="detail-row"><span class="k">${t("field.mortgage")}</span><span class="v">${fmtNT(h.mortgage)}</span></div>
        <div class="detail-row"><span class="k">${t("field.monthlyPrincipal")}</span><span class="v">${fmtNT(h.monthlyPrincipal)}${t("perMo")}</span></div>
        <p class="detail-note">${t("note.housing", { amount: fmtNT(Math.round(d.dailyPrincipal)) })}</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-edit="house" data-testid="edit-housing">${t("edit")}</button>
      </div>`;
  } else if (kind === "stock") {
    const e = state.assets.equities;
    body = `
      <div class="detail-card">
        <div class="detail-row"><span class="k">${t("field.marketValue")}</span><span class="v">${fmtNT(e.marketValue)}</span></div>
        <div class="detail-row"><span class="k">${t("field.todayPnL")}</span><span class="v ${e.dayPnL < 0 ? "down" : "up"}">${fmtDelta(e.dayPnL)}</span></div>
        <div class="detail-row"><span class="k">${t("field.periodPnL")}</span><span class="v ${e.periodPnL < 0 ? "down" : "up"}">${fmtDelta(e.periodPnL)}</span></div>
        <p class="detail-note">${t("note.twse")}</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-edit="stock">${t("edit")}</button>
        <button type="button" class="btn" id="btn-delayed-quote">${t("btn.delayedQuote")}</button>
      </div>`;
  } else if (kind === "cash") {
    const c = state.assets.cash;
    body = `
      <div class="detail-card">
        <div class="detail-row"><span class="k">${t("field.total")}</span><span class="v">${fmtNT(d.cashTotal)}</span></div>
        <div class="detail-row"><span class="k">${t("field.checking")}</span><span class="v">${fmtNT(c.checking)}</span></div>
        <div class="detail-row"><span class="k">${t("field.timeDeposit")}</span><span class="v">${fmtNT(c.timeDeposit)}</span></div>
        <div class="detail-row"><span class="k">${t("field.tdAnnualRate")}</span><span class="v">${c.tdAnnualRate}%</span></div>
        <p class="detail-note">${t("note.cash", { amount: fmtNT(Math.round(d.dailyTdInterest)) })}</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-edit="cash">${t("edit")}</button>
      </div>`;
  } else if (kind === "passive") {
    const p = state.assets.passive;
    body = `
      <div class="detail-card">
        <div class="detail-row"><span class="k">${t("field.monthlyPace")}</span><span class="v">${fmtNT(p.monthly)}${t("perMo")}</span></div>
        <div class="detail-row"><span class="k">${t("field.dailyPace")}</span><span class="v">${fmtNT(Math.round(d.dailyPassivePace))}</span></div>
        <p class="detail-note">${t("note.passive")}</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-edit="passive">${t("edit")}</button>
      </div>`;
  }

  return `
    <div class="topbar">
      <button type="button" class="back" data-go="home">${t("back")}</button>
      <div class="title">${titles[kind]}</div>
    </div>
    <div class="screen active">${body}</div>`;
}

function screenSettings() {
  const s = state.settings;
  const langButtons = SUPPORTED.map(
    (loc) =>
      `<button type="button" data-locale="${loc}" class="${s.locale === loc ? "active" : ""}">${localeLabel(loc)}</button>`
  ).join("");

  return `
    <div class="topbar">
      <button type="button" class="back" data-go="home">${t("back")}</button>
      <div class="title">${t("settings.title")}</div>
    </div>
    <div class="screen active">
      <div class="settings-block">
        <h3>${t("settings.language")}</h3>
        <div class="seg" id="locale-seg" data-testid="locale-seg">
          ${langButtons}
        </div>
      </div>
      <div class="settings-block">
        <h3>${t("settings.period")}</h3>
        <div class="seg" id="period-seg">
          <button type="button" data-period="7d" class="${s.period === "7d" ? "active" : ""}">${t("period.7d.full")}</button>
          <button type="button" data-period="30d" class="${s.period === "30d" ? "active" : ""}">${t("period.30d.full")}</button>
          <button type="button" data-period="month" class="${s.period === "month" ? "active" : ""}">${t("period.month.full")}</button>
        </div>
      </div>
      <div class="settings-block">
        <h3>${t("settings.honesty")}</h3>
        <div class="seg" id="honesty-seg">
          <button type="button" data-honesty="pace" class="${s.honesty === "pace" ? "active" : ""}">${t("honesty.pace")}</button>
          <button type="button" data-honesty="actual" class="${s.honesty === "actual" ? "active" : ""}">${t("honesty.actual")}</button>
        </div>
      </div>
      <div class="settings-block">
        <div class="toggle-row">
          <div>
            <div>${t("settings.buyout")}</div>
            <div class="desc">${t("settings.buyoutDesc")}</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="buyout-toggle" data-testid="buyout-toggle" ${s.buyout ? "checked" : ""} />
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <div class="settings-block">
        <h3>${t("settings.aboutQuotes")}</h3>
        <p class="about">${t("settings.aboutQuotesBody")}</p>
      </div>
      <div class="settings-block">
        <h3>${t("settings.widgetTemplate")}</h3>
        <div class="template-picker" id="template-picker" data-testid="template-picker" role="listbox" aria-label="${t("settings.widgetTemplate")}">
          ${WIDGET_TEMPLATES.map((id) => `
            <button type="button"
              class="template-swatch ${s.widgetTemplate === id ? "active" : ""}"
              data-template-pick="${id}"
              data-testid="template-${id}"
              role="option"
              aria-selected="${s.widgetTemplate === id ? "true" : "false"}"
              title="${t("template." + id + ".desc")}">
              <span class="swatch-face" data-face="${id}" aria-hidden="true"></span>
              <span class="swatch-name">${t("template." + id)}</span>
            </button>`).join("")}
        </div>
        <p class="template-desc" data-testid="template-desc">${t("template." + s.widgetTemplate + ".desc")}</p>
      </div>
      <div class="settings-block">
        <h3>${t("settings.widgetPreviews")}</h3>
        <div class="actions">
          <button type="button" class="btn" data-go="widget-lock">${t("settings.widgetLock")}</button>
          <button type="button" class="btn" data-go="widget-home">${t("settings.widgetHome")}</button>
        </div>
        <p class="about" style="margin-top:6px">${t("settings.widgetNote")}</p>
      </div>
      <div class="settings-block">
        <h3>${t("settings.about")}</h3>
        <p class="about">${t("settings.aboutBody", {
          tagline: t("tagline"),
          lang: localeLabel(s.locale || "en"),
        })}</p>
      </div>
    </div>`;
}

function screenWidgetLock(d) {
  const pace30 = Math.round(d.periodQuiet(30));
  return `
    <div class="topbar">
      <button type="button" class="back" data-go="settings">${t("back")}</button>
      <div class="title">${t("widget.lockTitle")}</div>
    </div>
    <div class="screen active">
      <div class="preview-banner">${t("widget.previewBanner")}</div>
      <div class="widget-stage">
        <div class="lock-widget" data-template="${currentTemplate()}" data-testid="lock-widget" aria-label="${t("widget.lockAria")}">
          <div class="brand">${t("brand")}</div>
          <div class="lab">${t("netWorth")}</div>
          <div class="val">${fmtNT(d.netWorth)}</div>
          <div class="pace-row">
            <div class="pace pace-breathe">${t("widget.monthPace", { delta: fmtDelta(pace30, true) })}</div>
            ${metroHTML()}
          </div>
        </div>
      </div>
      <p class="preview-note">${t("widget.previewNoteLock")}</p>
    </div>`;
}

function screenWidgetHome(d) {
  const pl = periodLabel(state.settings.period);
  const days = periodDays(state.settings.period);
  const e = state.assets.equities;
  const stockDelta =
    state.settings.honesty === "actual"
      ? { t: t("delta.today", { delta: fmtDelta(e.dayPnL, true) }), c: e.dayPnL < 0 ? "down" : "" }
      : { t: pl + " " + fmtDelta(e.periodPnL, true), c: "" };
  const dailyTd = d.dailyTdInterest;

  return `
    <div class="topbar">
      <button type="button" class="back" data-go="settings">${t("back")}</button>
      <div class="title">${t("widget.homeTitle")}</div>
    </div>
    <div class="screen active">
      <div class="preview-banner">${t("widget.previewBanner")}</div>
      <div class="widget-stage">
        <div class="medium-widget" data-template="${currentTemplate()}" data-testid="home-widget" aria-label="${t("widget.homeAria")}">
          <div class="mw-head">
            <span class="brand">${t("brand")}</span>
            <span class="period">${pl}</span>
          </div>
          <div class="mw-row">
            <span class="tag">${t("widget.housing")}</span>
            <span class="amt">${fmtNT(d.netEquity, true)}</span>
            <span class="d">${t("widget.prin", { amount: fmtNT(Math.round(state.assets.housing.monthlyPrincipal * (days / 30)), true) })}</span>
          </div>
          <div class="mw-row">
            <span class="tag">${t("widget.twse")}</span>
            <span class="amt">${fmtNT(e.marketValue, true)}</span>
            <span class="d ${stockDelta.c}">${stockDelta.t}</span>
          </div>
          <div class="mw-row">
            <span class="tag">${t("widget.cash")}</span>
            <span class="amt">${fmtNT(d.cashTotal, true)}</span>
            <span class="d mute">${t("widget.tdInt", { amount: fmtNT(Math.round(dailyTd * days), true) })}</span>
          </div>
          <div class="mw-row">
            <span class="tag">${t("widget.passive")}</span>
            <span class="amt">${fmtNT(state.assets.passive.monthly, true)}${t("perMo")}</span>
            <span class="d">${t("widget.pace", { amount: fmtNT(Math.round(state.assets.passive.monthly * (days / 30)), true) })}</span>
          </div>
        </div>
      </div>
      <p class="preview-note">${t("widget.previewNoteHome")}</p>
    </div>`;
}

function render() {
  const d = derive(state.assets);
  let body = "";
  if (route === "home") body = screenHome(d);
  else if (route === "house") body = screenBucket("house", d);
  else if (route === "stock") body = screenBucket("stock", d);
  else if (route === "cash") body = screenBucket("cash", d);
  else if (route === "passive") body = screenBucket("passive", d);
  else if (route === "settings") body = screenSettings();
  else if (route === "widget-lock") body = screenWidgetLock(d);
  else if (route === "widget-home") body = screenWidgetHome(d);
  else body = screenHome(d);

  const sheet = editBucket ? editSheetHTML(editBucket) : "";

  const leavingHome =
    lastRoute === "home" && route !== "home";
  if (leavingHome) onLeaveRhythmViews();

  app.innerHTML = `
    <header class="app-chrome">
      <h1 data-testid="app-title">${t("brand")}<em>${t("tagline")}</em></h1>
      <p>${t("chrome.sub")}</p>
    </header>
    <nav class="nav-seg" aria-label="${t("nav.screens")}">
      <button type="button" data-go="home" class="${route === "home" ? "active" : ""}">${t("nav.home")}</button>
      <button type="button" data-go="house" class="${route === "house" ? "active" : ""}">${t("nav.housing")}</button>
      <button type="button" data-go="stock" class="${route === "stock" ? "active" : ""}">${t("nav.twse")}</button>
      <button type="button" data-go="cash" class="${route === "cash" ? "active" : ""}">${t("nav.cash")}</button>
      <button type="button" data-go="passive" class="${route === "passive" ? "active" : ""}">${t("nav.passive")}</button>
      <button type="button" data-go="settings" class="${route === "settings" ? "active" : ""}">${t("nav.settings")}</button>
    </nav>
    <div class="shell" data-template="${currentTemplate()}">${body}</div>
    ${sheet}
  `;

  applyTemplateAttr(app);
  bind();

  if (route === "home") {
    const spark = sparkPath(d.quietDay);
    sparkCoords = spark.coords;
    onEnterHome(d.quietDay);
  } else if (route === "widget-lock") {
    /* metronome CSS-only on lock preview; no ads */
  } else {
    onLeaveRhythmViews();
  }
  lastRoute = route;
}

function bind() {
  app.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => go(el.getAttribute("data-go")));
  });

  app.querySelectorAll("[data-edit]").forEach((el) => {
    el.addEventListener("click", () => openEdit(el.getAttribute("data-edit")));
  });

  const honestyToggle = document.getElementById("honesty-toggle");
  if (honestyToggle) {
    honestyToggle.addEventListener("click", () => {
      state.settings.honesty =
        state.settings.honesty === "pace" ? "actual" : "pace";
      persist();
      render();
    });
  }

  document.getElementById("locale-seg")?.querySelectorAll("[data-locale]").forEach((b) => {
    b.addEventListener("click", () => {
      const loc = b.getAttribute("data-locale");
      if (!SUPPORTED.includes(loc)) return;
      state.settings.locale = loc;
      setLocale(loc);
      persist();
      render();
    });
  });

  document.getElementById("period-seg")?.querySelectorAll("[data-period]").forEach((b) => {
    b.addEventListener("click", () => {
      state.settings.period = b.getAttribute("data-period");
      persist();
      render();
    });
  });

  document.getElementById("honesty-seg")?.querySelectorAll("[data-honesty]").forEach((b) => {
    b.addEventListener("click", () => {
      state.settings.honesty = b.getAttribute("data-honesty");
      persist();
      render();
    });
  });

  const buyout = document.getElementById("buyout-toggle");
  if (buyout) {
    buyout.addEventListener("change", () => {
      state.settings.buyout = buyout.checked;
      persist();
    });
  }

  document.getElementById("template-picker")?.querySelectorAll("[data-template-pick]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = normalizeWidgetTemplate(b.getAttribute("data-template-pick"));
      state.settings.widgetTemplate = id;
      persist();
      render();
    });
  });

  const form = document.getElementById("edit-form");
  if (form) {
    document.getElementById("edit-cancel")?.addEventListener("click", closeEdit);
    document.getElementById("edit-backdrop")?.addEventListener("click", (ev) => {
      if (ev.target.id === "edit-backdrop") closeEdit();
    });
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const bucket = editBucket;
      let values = {};
      if (bucket === "house") {
        values = {
          marketValue: num(form, "marketValue"),
          mortgage: num(form, "mortgage"),
          monthlyPrincipal: num(form, "monthlyPrincipal"),
        };
      } else if (bucket === "stock") {
        values = {
          marketValue: num(form, "marketValue"),
          dayPnL: num(form, "dayPnL"),
          periodPnL: num(form, "periodPnL"),
        };
      } else if (bucket === "cash") {
        values = {
          checking: num(form, "checking"),
          timeDeposit: num(form, "timeDeposit"),
          tdAnnualRate: num(form, "tdAnnualRate"),
        };
      } else if (bucket === "passive") {
        values = { monthly: num(form, "monthly") };
      }
      saveEdit(bucket, values);
    });
  }

  const quoteBtn = document.getElementById("btn-delayed-quote");
  if (quoteBtn) {
    quoteBtn.addEventListener("click", async () => {
      quoteBtn.disabled = true;
      quoteBtn.textContent = t("btn.fetchingQuotes");
      try {
        const quotes = await fetchDelayedQuotes(["0050", "2330"]);
        const next = mockPortfolioFromQuotes(
          quotes,
          state.assets.equities.marketValue
        );
        const summary = quotes
          .map(
            (q) =>
              `${q.symbol} ${q.price} (${t("confirm.delayMin", { min: q.delayedMin })})`
          )
          .join(", ");
        const ok = window.confirm(
          t("confirm.delayedQuotes", {
            summary,
            value: fmtNT(next),
          })
        );
        if (ok) {
          withEditAd("save", () => {
            state.assets.equities.marketValue = next;
            persist();
            render();
          });
        } else {
          quoteBtn.disabled = false;
          quoteBtn.textContent = t("btn.delayedQuote");
        }
      } catch {
        quoteBtn.disabled = false;
        quoteBtn.textContent = t("btn.delayedQuote");
      }
    });
  }
}

/* ?demo=1 → body.demo-rhythm for clearer/faster motion (recording) */
if (new URLSearchParams(location.search).get("demo") === "1") {
  document.body.classList.add("demo-rhythm");
}

render();
