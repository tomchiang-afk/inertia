import "./styles.css";
import { loadState, saveState } from "./store.js";
import {
  derive,
  periodDays,
  periodLabel,
  fmtNT,
  fmtDelta,
} from "./math.js";
import { configureAdGate, withEditAd } from "./adGate.js";
import { fetchDelayedQuotes, mockPortfolioFromQuotes } from "./quotes.js";

const state = loadState();
let route = "home"; // home | house | stock | cash | passive | settings | widget-lock | widget-home
let editBucket = null; // null | house | stock | cash | passive

configureAdGate({ getBuyout: () => !!state.settings.buyout });

const app = document.getElementById("app");

function persist() {
  saveState(state);
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
  return `<span class="rhythm-metro pace-only" aria-hidden="true">
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
    const t = f - i;
    const a = sparkCoords[i];
    const b = sparkCoords[Math.min(i + 1, n - 1)];
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
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
  let title = "Edit";
  let fields = "";

  if (bucket === "house") {
    title = "Edit Housing";
    fields = `
      <div class="field"><label for="f-mv">Market value (TWD)</label>
        <input id="f-mv" name="marketValue" type="number" inputmode="numeric" value="${h.marketValue}" /></div>
      <div class="field"><label for="f-mort">Mortgage balance (TWD)</label>
        <input id="f-mort" name="mortgage" type="number" inputmode="numeric" value="${h.mortgage}" /></div>
      <div class="field"><label for="f-prin">Monthly principal (TWD)</label>
        <input id="f-prin" name="monthlyPrincipal" type="number" inputmode="numeric" value="${h.monthlyPrincipal}" /></div>`;
  } else if (bucket === "stock") {
    title = "Edit TWSE";
    fields = `
      <div class="field"><label for="f-smv">Market value (TWD)</label>
        <input id="f-smv" name="marketValue" type="number" inputmode="numeric" value="${e.marketValue}" /></div>
      <div class="field"><label for="f-day">Today P&amp;L (TWD)</label>
        <input id="f-day" name="dayPnL" type="number" inputmode="numeric" value="${e.dayPnL}" /></div>
      <div class="field"><label for="f-per">Period P&amp;L (TWD)</label>
        <input id="f-per" name="periodPnL" type="number" inputmode="numeric" value="${e.periodPnL}" /></div>`;
  } else if (bucket === "cash") {
    title = "Edit Cash";
    fields = `
      <div class="field"><label for="f-chk">Checking (TWD)</label>
        <input id="f-chk" name="checking" type="number" inputmode="numeric" value="${c.checking}" /></div>
      <div class="field"><label for="f-td">Time deposit (TWD)</label>
        <input id="f-td" name="timeDeposit" type="number" inputmode="numeric" value="${c.timeDeposit}" /></div>
      <div class="field"><label for="f-rate">TD annual rate (%)</label>
        <input id="f-rate" name="tdAnnualRate" type="number" step="0.01" inputmode="decimal" value="${c.tdAnnualRate}" /></div>`;
  } else if (bucket === "passive") {
    title = "Edit Passive income";
    fields = `
      <div class="field"><label for="f-pass">Monthly pace (dividends + rent, TWD)</label>
        <input id="f-pass" name="monthly" type="number" inputmode="numeric" value="${p.monthly}" /></div>`;
  }

  return `
    <div class="sheet-backdrop" id="edit-backdrop" role="dialog" aria-modal="true" aria-label="${title}">
      <form class="sheet" id="edit-form">
        <h2>${title}</h2>
        ${fields}
        <div class="sheet-actions">
          <button type="button" class="btn btn-ghost" id="edit-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>`;
}

function screenHome(d) {
  const pl = periodLabel(state.settings.period);
  const delta = primaryPeriodDelta(d);
  const honesty =
    state.settings.honesty === "pace" ? "Month pace" : "Today actual";
  const spark = sparkPath(d.quietDay);
  const stockDeltaClass =
    state.assets.equities.dayPnL < 0 ? "down" : "";

  return `
    <div class="topbar"><div class="title">Inertia</div>
      <button type="button" class="back" data-go="settings">Settings</button>
    </div>
    <div class="screen active" data-screen="home">
      <div class="hero">
        <div class="label">Net worth</div>
        <div class="nw">${fmtNT(d.netWorth)}</div>
        <div class="meta-row">
          <span class="pill ${delta >= 0 ? "up" : "down"}">${pl} ${fmtDelta(delta)}</span>
          <button type="button" class="pill accent ${state.settings.honesty === "pace" ? "pace-breathe" : ""}" id="honesty-toggle" aria-pressed="${state.settings.honesty === "pace"}">${honesty}</button>
          ${state.settings.honesty === "pace" ? metroHTML() : ""}
        </div>
      </div>
      <p class="quiet-line">Today's quiet contribution ~ <strong>${fmtNT(Math.round(d.quietDay))}</strong> · mortgage principal + TD interest + passive pace</p>
      ${
        state.settings.honesty === "pace"
          ? `<p class="rhythm-live-line" id="rhythmLiveLine">Pace running <span id="rhythmLive">${fmtNT(Math.round(d.quietDay * 0.55))}</span></p>`
          : state.settings.honesty === "actual"
          ? `<p class="quiet-line" style="color:${state.assets.equities.dayPnL < 0 ? "var(--down)" : "var(--accent)"}">TWSE today ${fmtDelta(state.assets.equities.dayPnL)}</p>`
          : ""
      }
      <div class="spark-wrap">
        <div class="cap">30-day quiet growth pace (illustrative)</div>
        <svg viewBox="0 0 ${spark.w} ${spark.h}" preserveAspectRatio="none" aria-hidden="true">
          <path class="fill" d="${spark.fill}" />
          <path class="line" id="sparkLine" d="${spark.d}" />
          <circle id="sparkPlayhead" cx="${spark.coords[0][0]}" cy="${spark.coords[0][1]}" r="4" hidden />
        </svg>
      </div>
      <div class="asset-list">
        <button type="button" class="asset-row" data-go="house">
          <span class="name">Housing equity</span>
          <span class="amt">${fmtNT(d.netEquity, true)}</span>
          <span class="delta">Principal +${fmtNT(state.assets.housing.monthlyPrincipal, true)}/mo</span>
          <span class="chev">›</span>
        </button>
        <button type="button" class="asset-row" data-go="stock">
          <span class="name">TWSE</span>
          <span class="amt">${fmtNT(state.assets.equities.marketValue, true)}</span>
          <span class="delta ${stockDeltaClass}">Today ${fmtDelta(state.assets.equities.dayPnL, true)}</span>
          <span class="chev">›</span>
        </button>
        <button type="button" class="asset-row" data-go="cash">
          <span class="name">Cash</span>
          <span class="amt">${fmtNT(d.cashTotal, true)}</span>
          <span class="delta mute">Checking + TD</span>
          <span class="chev">›</span>
        </button>
        <button type="button" class="asset-row" data-go="passive">
          <span class="name">Passive income</span>
          <span class="amt">${fmtNT(state.assets.passive.monthly, true)}/mo</span>
          <span class="delta mute">Monthly pace</span>
          <span class="chev">›</span>
        </button>
      </div>
    </div>`;
}

function screenBucket(kind, d) {
  const titles = {
    house: "Housing",
    stock: "TWSE",
    cash: "Cash",
    passive: "Passive income",
  };
  let body = "";
  if (kind === "house") {
    const h = state.assets.housing;
    body = `
      <div class="detail-card">
        <div class="detail-row"><span class="k">Net equity</span><span class="v">${fmtNT(d.netEquity)}</span></div>
        <div class="detail-row"><span class="k">Market value</span><span class="v">${fmtNT(h.marketValue)}</span></div>
        <div class="detail-row"><span class="k">Mortgage</span><span class="v">${fmtNT(h.mortgage)}</span></div>
        <div class="detail-row"><span class="k">Monthly principal</span><span class="v">${fmtNT(h.monthlyPrincipal)}/mo</span></div>
        <p class="detail-note">About ${fmtNT(Math.round(d.dailyPrincipal))}/day of principal counts toward quiet growth. Interest does not.</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-edit="house">Edit</button>
      </div>`;
  } else if (kind === "stock") {
    const e = state.assets.equities;
    body = `
      <div class="detail-card">
        <div class="detail-row"><span class="k">Market value</span><span class="v">${fmtNT(e.marketValue)}</span></div>
        <div class="detail-row"><span class="k">Today P&amp;L</span><span class="v ${e.dayPnL < 0 ? "down" : "up"}">${fmtDelta(e.dayPnL)}</span></div>
        <div class="detail-row"><span class="k">Period P&amp;L</span><span class="v ${e.periodPnL < 0 ? "down" : "up"}">${fmtDelta(e.periodPnL)}</span></div>
        <p class="detail-note">TWSE figures are what you enter. Delayed quotes are reference only and never overwrite without your confirm.</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-edit="stock">Edit</button>
        <button type="button" class="btn" id="btn-delayed-quote">Delayed TWSE update (mock)</button>
      </div>`;
  } else if (kind === "cash") {
    const c = state.assets.cash;
    body = `
      <div class="detail-card">
        <div class="detail-row"><span class="k">Total</span><span class="v">${fmtNT(d.cashTotal)}</span></div>
        <div class="detail-row"><span class="k">Checking</span><span class="v">${fmtNT(c.checking)}</span></div>
        <div class="detail-row"><span class="k">Time deposit</span><span class="v">${fmtNT(c.timeDeposit)}</span></div>
        <div class="detail-row"><span class="k">TD annual rate</span><span class="v">${c.tdAnnualRate}%</span></div>
        <p class="detail-note">Daily TD interest accrual ~ ${fmtNT(Math.round(d.dailyTdInterest))}, counted in quiet growth.</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-edit="cash">Edit</button>
      </div>`;
  } else if (kind === "passive") {
    const p = state.assets.passive;
    body = `
      <div class="detail-card">
        <div class="detail-row"><span class="k">Monthly pace</span><span class="v">${fmtNT(p.monthly)}/mo</span></div>
        <div class="detail-row"><span class="k">Daily pace</span><span class="v">${fmtNT(Math.round(d.dailyPassivePace))}</span></div>
        <p class="detail-note">Dividends and rent show as pace — not added to net worth, to avoid double-counting housing equity.</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-edit="passive">Edit</button>
      </div>`;
  }

  return `
    <div class="topbar">
      <button type="button" class="back" data-go="home">Back</button>
      <div class="title">${titles[kind]}</div>
    </div>
    <div class="screen active">${body}</div>`;
}

function screenSettings() {
  const s = state.settings;
  return `
    <div class="topbar">
      <button type="button" class="back" data-go="home">Back</button>
      <div class="title">Settings</div>
    </div>
    <div class="screen active">
      <div class="settings-block">
        <h3>Period</h3>
        <div class="seg" id="period-seg">
          <button type="button" data-period="7d" class="${s.period === "7d" ? "active" : ""}">7 days</button>
          <button type="button" data-period="30d" class="${s.period === "30d" ? "active" : ""}">30 days</button>
          <button type="button" data-period="month" class="${s.period === "month" ? "active" : ""}">This month</button>
        </div>
      </div>
      <div class="settings-block">
        <h3>Honesty (default)</h3>
        <div class="seg" id="honesty-seg">
          <button type="button" data-honesty="pace" class="${s.honesty === "pace" ? "active" : ""}">Month pace</button>
          <button type="button" data-honesty="actual" class="${s.honesty === "actual" ? "active" : ""}">Today actual</button>
        </div>
      </div>
      <div class="settings-block">
        <div class="toggle-row">
          <div>
            <div>Buyout unlock (mock)</div>
            <div class="desc">When on, edit ads never show. Production = one-time IAP.</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="buyout-toggle" ${s.buyout ? "checked" : ""} />
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <div class="settings-block">
        <h3>About delayed quotes</h3>
        <p class="about">Numbers you <strong>enter by hand</strong> are the source of truth. Optional delayed TWSE quotes (~15 min) are reference only; confirming a market-value update is still an edit path. This build uses an offline mock stub (<code>src/quotes.js</code>).</p>
      </div>
      <div class="settings-block">
        <h3>Widget previews</h3>
        <div class="actions">
          <button type="button" class="btn" data-go="widget-lock">Lock small (preview)</button>
          <button type="button" class="btn" data-go="widget-home">Home medium (preview)</button>
        </div>
        <p class="about" style="margin-top:6px">Previews never show ads. Production = iOS / Android native widgets.</p>
      </div>
      <div class="settings-block">
        <h3>About</h3>
        <p class="about">Inertia<br />Your assets keep moving.<br />UI: English · Currency: TWD<br />No LLM · Data stays on-device</p>
      </div>
    </div>`;
}

function screenWidgetLock(d) {
  const pace30 = Math.round(d.periodQuiet(30));
  return `
    <div class="topbar">
      <button type="button" class="back" data-go="settings">Back</button>
      <div class="title">Lock widget</div>
    </div>
    <div class="screen active">
      <div class="preview-banner">Preview · no ads</div>
      <div class="widget-stage">
        <div class="lock-widget" aria-label="Inertia lock widget preview">
          <div class="brand">Inertia</div>
          <div class="lab">Net worth</div>
          <div class="val">${fmtNT(d.netWorth)}</div>
          <div class="pace-row">
            <div class="pace pace-breathe">Month pace ${fmtDelta(pace30, true)}</div>
            ${metroHTML()}
          </div>
        </div>
      </div>
      <p class="preview-note">Production uses WidgetKit / App Widgets. Browse and widgets never show ads.</p>
    </div>`;
}

function screenWidgetHome(d) {
  const pl = periodLabel(state.settings.period);
  const days = periodDays(state.settings.period);
  const e = state.assets.equities;
  const stockDelta =
    state.settings.honesty === "actual"
      ? { t: "Today " + fmtDelta(e.dayPnL, true), c: e.dayPnL < 0 ? "down" : "" }
      : { t: pl + " " + fmtDelta(e.periodPnL, true), c: "" };
  const dailyTd = d.dailyTdInterest;

  return `
    <div class="topbar">
      <button type="button" class="back" data-go="settings">Back</button>
      <div class="title">Home medium</div>
    </div>
    <div class="screen active">
      <div class="preview-banner">Preview · no ads</div>
      <div class="widget-stage">
        <div class="medium-widget" aria-label="Inertia home medium widget preview">
          <div class="mw-head">
            <span class="brand">Inertia</span>
            <span class="period">${pl}</span>
          </div>
          <div class="mw-row">
            <span class="tag">Housing</span>
            <span class="amt">${fmtNT(d.netEquity, true)}</span>
            <span class="d">Prin. +${fmtNT(Math.round(state.assets.housing.monthlyPrincipal * (days / 30)), true)}</span>
          </div>
          <div class="mw-row">
            <span class="tag">TWSE</span>
            <span class="amt">${fmtNT(e.marketValue, true)}</span>
            <span class="d ${stockDelta.c}">${stockDelta.t}</span>
          </div>
          <div class="mw-row">
            <span class="tag">Cash</span>
            <span class="amt">${fmtNT(d.cashTotal, true)}</span>
            <span class="d mute">TD int. +${fmtNT(Math.round(dailyTd * days), true)}</span>
          </div>
          <div class="mw-row">
            <span class="tag">Passive</span>
            <span class="amt">${fmtNT(state.assets.passive.monthly, true)}/mo</span>
            <span class="d">Pace +${fmtNT(Math.round(state.assets.passive.monthly * (days / 30)), true)}</span>
          </div>
        </div>
      </div>
      <p class="preview-note">Production = native widget. Static preview only — no ad gate.</p>
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
      <h1>Inertia<em>Your assets keep moving.</em></h1>
      <p>Household pace · on-device data · ads only on edit (if not bought out)</p>
    </header>
    <nav class="nav-seg" aria-label="Screens">
      <button type="button" data-go="home" class="${route === "home" ? "active" : ""}">Home</button>
      <button type="button" data-go="house" class="${route === "house" ? "active" : ""}">Housing</button>
      <button type="button" data-go="stock" class="${route === "stock" ? "active" : ""}">TWSE</button>
      <button type="button" data-go="cash" class="${route === "cash" ? "active" : ""}">Cash</button>
      <button type="button" data-go="passive" class="${route === "passive" ? "active" : ""}">Passive</button>
      <button type="button" data-go="settings" class="${route === "settings" ? "active" : ""}">Settings</button>
    </nav>
    <div class="shell">${body}</div>
    ${sheet}
  `;

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
      quoteBtn.textContent = "Fetching delayed quotes…";
      try {
        const quotes = await fetchDelayedQuotes(["0050", "2330"]);
        const next = mockPortfolioFromQuotes(
          quotes,
          state.assets.equities.marketValue
        );
        const summary = quotes
          .map((q) => `${q.symbol} ${q.price} (~${q.delayedMin} min delay)`)
          .join(", ");
        const ok = window.confirm(
          `Delayed quotes (mock):\n${summary}\n\nUpdate TWSE market value to ${fmtNT(next)}?\n(Requires confirm; edit path — may show an ad if not bought out)`
        );
        if (ok) {
          withEditAd("save", () => {
            state.assets.equities.marketValue = next;
            persist();
            render();
          });
        } else {
          quoteBtn.disabled = false;
          quoteBtn.textContent = "Delayed TWSE update (mock)";
        }
      } catch {
        quoteBtn.disabled = false;
        quoteBtn.textContent = "Delayed TWSE update (mock)";
      }
    });
  }
}

/* ?demo=1 → body.demo-rhythm for clearer/faster motion (recording) */
if (new URLSearchParams(location.search).get("demo") === "1") {
  document.body.classList.add("demo-rhythm");
}

render();
