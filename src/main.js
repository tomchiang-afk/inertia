import "./styles.css";
import {
  loadState,
  saveState,
  WIDGET_STYLES,
  normalizeWidgetStyle,
} from "./store.js";
import {
  GOAL_ALIGNS,
  MAX_GOALS,
  newGoalId,
  normalizeGoals,
  primaryGoal,
  goalProgress,
  withPrimaryOnWidget,
} from "./goals.js";
import {
  derive,
  periodDays,
  periodLabel,
  fmtNT,
  fmtDelta,
} from "./math.js";
import {
  DISPLAY_MODES,
  PRIVACY_FIELDS,
  normalizeWidgetPrivacy,
  privacyFieldOn,
  formatWidgetMoney,
  formatWidgetPace,
  formatGoalProgressLabel,
  showGoalBarFill,
  showRhythmWithoutPace,
} from "./widgetPrivacy.js";
import { configureAdGate, withEditAd } from "./adGate.js";
import { withPace, paceCapped, todaySoFar, PACE_MAX_DAYS } from "./pace.js";
import { syncNativeWidget, initNativeWidget } from "./nativeWidget.js";
import {
  normalizeFx,
  rebaseFx,
  withRate,
  withoutRate,
  ensureCurrency,
  normalizeCurrency,
  rateToBase,
  toBase,
  currencySymbol,
  roundSig,
  fmtRateInput,
} from "./currency.js";
import { setDisplayCurrency, fmtMoney, fmtMasked } from "./format.js";
import {
  MARKET_CURRENCY,
  newId,
  normalizeProperty,
  normalizeBrokerAccount,
  normalizeHolding,
  normalizeCashAccount,
  normalizePassiveItem,
  monthlyAmount,
  holdingValue,
} from "./portfolio.js";
import {
  housingList,
  stocksList,
  cashList,
  passiveList,
  itemSheetHTML,
  readItemForm,
  numbersChanged,
} from "./assetUI.js";
import {
  t,
  setLocale,
  detectLocale,
  SUPPORTED,
  localeLabel,
} from "./i18n/index.js";

const state = loadState();
state.goals = normalizeGoals(state.goals);
state.settings.fx = normalizeFx(state.settings.fx, "TWD");
setDisplayCurrency(state.settings.fx.base);

/* First launch: detect navigator.language; persist settings.locale */
if (!state.settings.locale || !SUPPORTED.includes(state.settings.locale)) {
  state.settings.locale = detectLocale();
  saveState(state);
}
setLocale(state.settings.locale);
state.settings.widgetStyle = normalizeWidgetStyle(state.settings.widgetStyle, state.settings.widgetTemplate);
delete state.settings.widgetTemplate;
state.settings.widgetPrivacy = normalizeWidgetPrivacy(state.settings.widgetPrivacy);

let route = "home"; // home | house | stock | cash | passive | widget | settings
let goalEdit = null; // null | "new" | goalId
/** Item sheet: { kind: property|account|holding|cash|passive, id: string|null (null = new), accountId? } */
let itemEdit = null;
let reorderKind = null; // property | account | cash | passive while arranging
let deleteArmed = false;

configureAdGate({ getBuyout: () => !!state.settings.buyout });

const app = document.getElementById("app");

function persist() {
  saveState(state);
  syncNativeWidget(state);
}

function currentStyle() {
  return normalizeWidgetStyle(state.settings.widgetStyle, state.settings.widgetTemplate);
}

function privacy() {
  return normalizeWidgetPrivacy(state.settings.widgetPrivacy);
}

function applyStyleAttr(root) {
  const id = currentStyle();
  root.setAttribute("data-style", id);
  document.documentElement.setAttribute("data-style", id);
  document.body.setAttribute("data-style", id);
}

function go(name) {
  route = name;
  itemEdit = null;
  goalEdit = null;
  reorderKind = null;
  render();
}

/** Period pill: smooth month rhythm over the chosen period (never market P&L). */
function primaryPeriodDelta(d) {
  return Math.round(d.periodQuiet(periodDays(state.settings.period)));
}

function sparkPath(quietDay) {
  // Smooth 30-day trend of the month rhythm: net worth grows by the same amount every day, so
  // the line is monotonic with no market wiggle. Slope scales gently with the daily pace so a
  // bigger rhythm reads steeper (illustrative scale, not a price chart).
  const w = 360;
  const h = 56;
  const rise = quietDay > 0 ? Math.min(h * 0.62, h * 0.22 + Math.log10(1 + quietDay) * 6) : 0;
  const pts = [];
  for (let i = 0; i < 30; i++) {
    const x = (i / 29) * w;
    const y = h * 0.8 - rise * (i / 29);
    pts.push([x, Math.max(6, Math.min(h - 6, y))]);
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

/** App Home keeps the bar metronome. Widget styles use the month-beat matrix. */
function homeRhythmHTML(size = "full") {
  return metroHTML(size);
}

/** Rounded/sharp bar metronome — paper & swiss */
function metroHTML(size = "inline") {
  const n = size === "full" ? 16 : size === "strip" ? 8 : 4;
  const beats = Array.from({ length: n }, (_, i) =>
    `<span class="rhythm-beat" style="--i:${i}"></span>`
  ).join("");
  return `<span class="rhythm-metro pace-only" data-rhythm="bars" data-size="${size}" data-testid="rhythm-metro" aria-hidden="true">${beats}</span>`;
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

/** Home live numbers: today's rhythm so far + net worth, both from the smooth pace only. */
function paintRhythmLive() {
  const d = d0();
  const today = document.getElementById("rhythmLive");
  if (today) {
    const txt = fmtNT(Math.floor(todaySoFar(d.quietDay, new Date())));
    if (today.textContent !== txt) today.textContent = txt;
  }
  const nw = document.querySelector('[data-testid="net-worth"]:not([hidden])');
  if (nw) {
    const txt = fmtNT(d.netWorth);
    if (nw.textContent !== txt) nw.textContent = txt;
  }
}

function startRhythmLive() {
  stopRhythmLive();
  paintRhythmLive();
  if (prefersReducedMotion()) return; // static values, refreshed on every render
  // The pace is tiny per second, so repaint ~4×/s and only touch the DOM when text changes.
  let last = 0;
  function frame(now) {
    if (route !== "home") {
      rhythmRaf = null;
      return;
    }
    if (now - last > 250) {
      last = now;
      paintRhythmLive();
    }
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
    // rAF timestamps can precede t0 (performance.now()) on the first frame → keep p in [0,1).
    const p = ((((now - t0) % loopMs) + loopMs) % loopMs) / loopMs;
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

function onEnterHome() {
  requestAnimationFrame(() => {
    animateSparkStroke();
    startRhythmLive();
    startPlayhead();
  });
}

function fx() {
  return state.settings.fx;
}

/** Derived numbers with smooth-rhythm accrual since the last asset edit (see pace.js). */
function d0() {
  return withPace(derive(state.assets, fx()), state.paceAnchorAt, Date.now());
}

/** Asset numbers were (re)entered: the typed values become the new rhythm anchor. */
function reanchorPace() {
  state.paceAnchorAt = Date.now();
}

function openGoalEdit(idOrNew) {
  goalEdit = idOrNew;
  itemEdit = null;
  render();
}

function closeGoalEdit() {
  goalEdit = null;
  render();
}

function saveGoalFromForm(form) {
  const name = String(form.elements.name?.value || "").trim().slice(0, 48) || t("goals.untitled");
  const target = num(form, "target");
  const align = GOAL_ALIGNS.includes(form.elements.align?.value)
    ? form.elements.align.value
    : "netWorth";
  const onWidget = !!form.elements.onWidget?.checked;
  if (!(target > 0)) {
    form.elements.target?.focus();
    return;
  }
  const editingId = goalEdit;
  const prev = normalizeGoals(state.goals).find((g) => g.id === editingId);
  const commit = () => commitGoal(editingId, { name, target, align, onWidget });
  // Existing rule: ads only on editing numbers. Name / align / widget flag: no ad.
  if (editingId === "new" || !prev || prev.target !== target) withEditAd("save", commit);
  else commit();
}

function commitGoal(editingId, { name, target, align, onWidget }) {
  let goals = normalizeGoals(state.goals);

  if (editingId === "new") {
    if (goals.length >= MAX_GOALS) return;
    const g = { id: newGoalId(), name, target, align, onWidget: false };
    goals.push(g);
    if (onWidget) goals = withPrimaryOnWidget(goals, g.id);
  } else {
    goals = goals.map((g) =>
      g.id === editingId ? { ...g, name, target, align, onWidget: g.onWidget } : g
    );
    if (onWidget) goals = withPrimaryOnWidget(goals, editingId);
    else {
      goals = goals.map((g) =>
        g.id === editingId ? { ...g, onWidget: false } : g
      );
    }
  }
  state.goals = normalizeGoals(goals);
  persist();
  goalEdit = null;
  render();
}

function deleteGoal(id) {
  state.goals = normalizeGoals(state.goals.filter((g) => g.id !== id));
  persist();
  goalEdit = null;
  render();
}

function formatGoalAmounts(prog, priv) {
  const mode = priv?.displayMode || "exact";
  if (mode === "rhythm") {
    return { current: "", target: "", remaining: "", pctLabel: "" };
  }
  if (mode === "masked") {
    return {
      current: fmtMasked(),
      target: fmtMasked(),
      remaining: "••••",
      pctLabel: "••••",
    };
  }
  if (mode === "relative") {
    const pct = prog.pct + "%";
    return { current: pct, target: "100%", remaining: "", pctLabel: pct };
  }
  const current = formatWidgetMoney(prog.current, priv, { kind: "absolute", compact: true });
  const target = formatWidgetMoney(prog.target, priv, { kind: "absolute", compact: true });
  const remaining = formatWidgetMoney(prog.remaining, priv, { kind: "absolute", compact: true });
  return {
    current,
    target,
    remaining,
    pctLabel: formatGoalProgressLabel(prog.pct, priv),
  };
}

function goalsListHTML(d, { manage = false } = {}) {
  const goals = normalizeGoals(state.goals);
  const primaryId = primaryGoal(goals)?.id;
  const rows = goals
    .map((g) => {
      const prog = goalProgress(g, state.assets, d);
      const current = fmtNT(prog.current, true);
      const target = fmtNT(prog.target, true);
      const remaining =
        prog.remaining > 0
          ? " · " + t("goals.remaining", { amount: fmtNT(prog.remaining, true) })
          : "";
      const meta = `<span class="goal-meta" data-testid="goal-meta-${g.id}">${prog.pct}% · ${t("goals.currentOf", { current, target })}${remaining}</span>`;
      const badge = primaryId === g.id ? `<span class="goal-badge">${t("goals.primary")}</span>` : "";
      const del = manage
        ? `<button type="button" class="btn btn-ghost btn-sm" data-goal-delete="${g.id}" data-testid="goal-delete-${g.id}">${t("goals.delete")}</button>`
        : "";
      return `
        <div class="goal-row" data-testid="goal-row-${g.id}" data-goal-id="${g.id}">
          <div class="goal-head">
            <span class="goal-name">${escapeHtml(g.name)}</span>
            ${badge}
            <span class="goal-align">${t("goals.align." + g.align)}</span>
          </div>
          <div class="goal-bar" role="progressbar" aria-label="${escapeHtml(g.name)}" aria-valuenow="${Math.round(prog.barPct)}" aria-valuemin="0" aria-valuemax="100" data-testid="goal-bar-${g.id}">
            <span class="goal-bar-fill" style="width:${prog.barPct}%"></span>
          </div>
          <div class="goal-foot">
            ${meta}
            <div class="goal-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-goal-edit="${g.id}" data-testid="goal-edit-${g.id}">${t("edit")}</button>
              ${del}
            </div>
          </div>
        </div>`;
    })
    .join("");

  const full = goals.length >= MAX_GOALS;
  const addBtn = full
    ? ""
    : `<button type="button" class="btn ${manage ? "" : "btn-ghost "}btn-sm" data-goal-edit="new" data-testid="goal-add">${t("goals.add")}</button>`;
  const maxNote = full && manage ? `<p class="about goals-max">${t("goals.max")}</p>` : "";
  const empty = !goals.length
    ? `<p class="about goals-empty" data-testid="goals-empty">${t("goals.empty")}</p>`
    : "";

  return `
    <div class="goals-section${manage ? " goals-manage" : ""}" data-testid="${manage ? "goals-manage" : "goals-section"}">
      <div class="goals-header">
        <h3 class="goals-title">${t("goals.title")}</h3>
        ${addBtn}
      </div>
      ${empty}
      <div class="goals-list">${rows}</div>
      ${maxNote}
    </div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function goalSheetHTML() {
  if (!goalEdit) return "";
  const isNew = goalEdit === "new";
  const existing = isNew
    ? null
    : normalizeGoals(state.goals).find((g) => g.id === goalEdit);
  if (!isNew && !existing) return "";
  const g = existing || {
    name: "",
    target: 1_000_000,
    align: "netWorth",
    onWidget: normalizeGoals(state.goals).length === 0,
  };
  const isPrimary = existing ? !!existing.onWidget : g.onWidget;
  const alignOpts = GOAL_ALIGNS.map(
    (a) =>
      `<option value="${a}" ${g.align === a ? "selected" : ""}>${t("goals.align." + a)}</option>`
  ).join("");
  const title = isNew ? t("goals.add") : t("goals.edit");
  return `
    <div class="sheet-backdrop" id="goal-backdrop" role="dialog" aria-modal="true" aria-label="${title}">
      <form class="sheet" id="goal-form" data-testid="goal-form">
        <h2>${title}</h2>
        <div class="field"><label for="g-name">${t("goals.name")}</label>
          <input id="g-name" name="name" type="text" maxlength="48" value="${escapeHtml(g.name)}" required data-testid="goal-name" /></div>
        <div class="field"><label for="g-target">${t("goals.target", { ccy: fx().base })}</label>
          <input id="g-target" name="target" type="number" inputmode="numeric" min="1" value="${g.target ? Math.round(g.target) : ""}" required data-testid="goal-target" /></div>
        <div class="field"><label for="g-align">${t("goals.align")}</label>
          <select id="g-align" name="align" data-testid="goal-align">${alignOpts}</select></div>
        <div class="toggle-row" style="margin:8px 0 4px">
          <div>${t("goals.onWidget")}</div>
          <label class="switch">
            <input type="checkbox" name="onWidget" data-testid="goal-on-widget" ${isPrimary ? "checked" : ""} />
            <span class="slider"></span>
          </label>
        </div>
        <div class="sheet-actions">
          ${isNew ? "" : `<button type="button" class="btn btn-ghost btn-danger" data-goal-delete="${existing.id}" data-testid="goal-sheet-delete">${t("goals.delete")}</button>`}
          <button type="button" class="btn btn-ghost" id="goal-cancel">${t("cancel")}</button>
          <button type="submit" class="btn btn-primary" data-testid="goal-save">${t("save")}</button>
        </div>
      </form>
    </div>`;
}

function widgetGoalStripHTML(d, priv) {
  if (!privacyFieldOn(priv, "goalProgress")) return "";
  const g = primaryGoal(state.goals);
  if (!g) return "";
  const prog = goalProgress(g, state.assets, d);
  const mode = priv.displayMode || "exact";
  const label = formatGoalProgressLabel(prog, priv);
  const fill = showGoalBarFill(priv) ? prog.barPct : 0;
  const aria = showGoalBarFill(priv)
    ? `role="progressbar" aria-valuenow="${Math.round(prog.barPct)}" aria-valuemin="0" aria-valuemax="100"`
    : `aria-hidden="true"`;
  return `
    <div class="widget-goal" data-testid="widget-goal-progress" data-privacy-mode="${mode}">
      <span class="widget-goal-label${label ? "" : " muted"}">${escapeHtml(g.name)}${label ? ` · <span data-testid="widget-goal-value">${label}</span>` : ""}</span>
      <span class="widget-goal-bar" ${aria}><span class="widget-goal-fill" style="width:${fill}%"></span></span>
    </div>`;
}

function num(form, name) {
  const v = form.elements[name].value;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/* —— v2 item lists: open / save / delete / reorder (ads only on number saves) —— */

const NORMALIZERS = {
  property: (x) => normalizeProperty(x, fx().base),
  account: (x) => normalizeBrokerAccount(x, fx().base),
  holding: (x) => normalizeHolding(x),
  cash: (x) => normalizeCashAccount(x, fx().base),
  passive: (x) => normalizePassiveItem(x, fx().base),
};

const LIST_OF = {
  property: () => state.assets.properties,
  account: () => state.assets.brokerAccounts,
  cash: () => state.assets.cashAccounts,
  passive: () => state.assets.passiveItems,
};

function listFor(kind, accountId) {
  if (kind === "holding") {
    const acct = state.assets.brokerAccounts.find((a) => a.id === accountId);
    return acct ? acct.holdings : null;
  }
  return LIST_OF[kind]?.() || null;
}

function findItem(edit) {
  if (!edit?.id) return null;
  const list = listFor(edit.kind, edit.accountId);
  return list?.find((x) => x.id === edit.id) || null;
}

function openItem(kind, id = null, accountId = null) {
  itemEdit = { kind, id, accountId };
  goalEdit = null;
  deleteArmed = false;
  render();
  // Focus the sheet title, not the first input: on phones an auto-focused input pops the soft
  // keyboard over the sheet before the user chose a field. Screen readers still land in the sheet.
  document.querySelector("#item-form h2")?.focus({ preventScroll: true });
}

function closeItem() {
  itemEdit = null;
  deleteArmed = false;
  render();
}

function saveItemFromForm(form) {
  const edit = itemEdit;
  if (!edit) return;
  const res = readItemForm(form, edit.kind);
  const err = document.getElementById("item-error");
  if (res.error) {
    if (err) {
      err.textContent = t(res.error);
      err.hidden = false;
    }
    form.elements[res.field]?.focus();
    return;
  }
  const prev = findItem(edit);
  const changed = numbersChanged(edit.kind, prev, res.values);
  const commit = () => {
    const list = listFor(edit.kind, edit.accountId);
    if (!list) return;
    if (prev) {
      const merged = NORMALIZERS[edit.kind]({ ...prev, ...res.values, id: prev.id });
      const i = list.findIndex((x) => x.id === prev.id);
      list[i] = merged;
    } else {
      const prefix = { property: "p", account: "b", holding: "h", cash: "c", passive: "r" }[edit.kind];
      list.push(NORMALIZERS[edit.kind]({ ...res.values, id: newId(prefix), holdings: [] }));
    }
    if (res.values.currency) state.settings.fx = ensureCurrency(fx(), res.values.currency);
    if (changed) reanchorPace();
    persist();
    itemEdit = null;
    render();
  };
  // Ad rule: new item, or a changed amount / shares / price / balance / rate / currency.
  // Renames, tags, symbols, market labels, maturity dates and reordering never show an ad.
  if (changed) withEditAd("save", commit);
  else commit();
}

function deleteItem() {
  const edit = itemEdit;
  const list = edit && listFor(edit.kind, edit.accountId);
  if (!list) return;
  if (!deleteArmed) {
    deleteArmed = true;
    const btn = document.getElementById("item-delete");
    if (btn) {
      btn.textContent = t("form.confirmDelete");
      btn.classList.add("is-armed");
    }
    return;
  }
  const i = list.findIndex((x) => x.id === edit.id);
  if (i >= 0) list.splice(i, 1);
  reanchorPace(); // totals changed by the user
  persist();
  itemEdit = null;
  deleteArmed = false;
  render();
}

function moveItem(kind, id, dir, accountId) {
  const list = listFor(kind, accountId);
  if (!list) return;
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  persist(); // no ad: order only
  render();
  document.querySelector(`[data-move="${kind}"][data-id="${id}"][data-dir="${dir}"]:not(:disabled)`)?.focus();
}

/** Base-currency preview under the form ("≈ NT$1,234,567"). */
function updateItemPreview(form) {
  const out = document.getElementById("item-preview");
  if (!out || !itemEdit) return;
  const kind = itemEdit.kind;
  const val = (n) => Number(String(form.elements[n]?.value ?? "").replace(/,/g, "")) || 0;
  let ccy = form.elements.currency?.value?.toUpperCase?.() || "";
  let amount = null;
  let suffix = "";
  if (kind === "property") amount = val("marketValue") - val("mortgageBalance");
  else if (kind === "cash") amount = val("balance");
  else if (kind === "passive") {
    amount = monthlyAmount({ amount: val("amount"), frequency: form.elements.frequency?.value });
    suffix = t("perMo");
  } else if (kind === "holding") {
    const acct = state.assets.brokerAccounts.find((a) => a.id === itemEdit.accountId);
    ccy = acct?.currency || fx().base;
    amount = holdingValue({ shares: val("shares"), price: val("price") });
  }
  if (amount == null || !/^[A-Z]{3}$/.test(normalizeCurrency(ccy, ""))) {
    out.textContent = "";
    return;
  }
  const native = fmtMoney(amount, ccy);
  const b = toBase(amount, ccy, fx());
  const label =
    kind === "property" ? t("field.netEquity") : kind === "passive" ? t("field.monthlyPace") : kind === "cash" ? t("form.balance") : t("form.value");
  if (normalizeCurrency(ccy) === fx().base) out.textContent = `${label}: ${native}${suffix}`;
  else if (b == null) out.textContent = `${label}: ${native}${suffix} · ${t("fx.needsRateHint", { code: normalizeCurrency(ccy) })}`;
  else out.textContent = `${label}: ${native}${suffix} ≈ ${fmtMoney(b)}${suffix}`;
}

function changeBaseCurrency(code) {
  const prev = fx();
  const next = rebaseFx(prev, code);
  if (next.base === prev.base) return;
  // Goal targets are base-currency numbers: convert them so progress stays the same.
  const factor = rateToBase(prev.base, next);
  if (factor != null) {
    state.goals = normalizeGoals(state.goals).map((g) => ({ ...g, target: roundSig(g.target * factor) }));
  }
  state.settings.fx = next;
  setDisplayCurrency(next.base);
  persist(); // settings only: no ad
  render();
}

function bindItems() {
  app.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () =>
      openItem(el.getAttribute("data-open"), el.getAttribute("data-id"), el.getAttribute("data-account"))
    );
  });
  app.querySelectorAll("[data-new]").forEach((el) => {
    el.addEventListener("click", () => openItem(el.getAttribute("data-new"), null, el.getAttribute("data-account")));
  });
  app.querySelectorAll("[data-reorder]").forEach((el) => {
    el.addEventListener("click", () => {
      const k = el.getAttribute("data-reorder");
      reorderKind = reorderKind === k ? null : k;
      render();
    });
  });
  app.querySelectorAll("[data-move]").forEach((el) => {
    el.addEventListener("click", () =>
      moveItem(el.getAttribute("data-move"), el.getAttribute("data-id"), Number(el.getAttribute("data-dir")), el.getAttribute("data-account"))
    );
  });

  const form = document.getElementById("item-form");
  if (form) {
    document.getElementById("item-cancel")?.addEventListener("click", closeItem);
    document.getElementById("item-delete")?.addEventListener("click", deleteItem);
    document.getElementById("item-backdrop")?.addEventListener("click", (ev) => {
      if (ev.target.id === "item-backdrop") closeItem();
    });
    form.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") closeItem();
    });
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      saveItemFromForm(form);
    });
    form.addEventListener("input", () => updateItemPreview(form));
    form.addEventListener("change", (ev) => {
      const target = ev.target;
      if (target.name === "type") {
        form.querySelectorAll("[data-when]").forEach((f) => {
          const [k, v] = f.getAttribute("data-when").split(":");
          f.hidden = form.elements[k]?.value !== v;
        });
      }
      if (target.name === "market" && itemEdit?.kind === "account" && !itemEdit.id) {
        const c = MARKET_CURRENCY[target.value];
        if (c && form.elements.currency) form.elements.currency.value = c;
      }
      if (target.name === "currency") target.value = target.value.toUpperCase();
      updateItemPreview(form);
    });
    updateItemPreview(form);
  }

  document.getElementById("fx-base-select")?.addEventListener("change", (ev) => changeBaseCurrency(ev.target.value));
  document.querySelectorAll("input[data-fx-rate]").forEach((input) => {
    input.addEventListener("change", () => {
      const code = input.getAttribute("data-fx-rate");
      state.settings.fx = withRate(fx(), code, input.value);
      persist(); // FX edits: no ad
      render();
    });
  });
  document.querySelectorAll("[data-fx-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.fx = withoutRate(fx(), btn.getAttribute("data-fx-remove"));
      persist();
      render();
    });
  });
  const addForm = document.getElementById("fx-add-form");
  addForm?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const code = normalizeCurrency(addForm.elements.code.value, "");
    if (!code || code === fx().base) {
      addForm.elements.code.focus();
      return;
    }
    state.settings.fx = withRate(fx(), code, addForm.elements.rate.value);
    persist();
    render();
    document.getElementById("fx-" + code)?.focus();
  });
}


function screenHome(d) {
  const priv = privacy();
  const pl = periodLabel(state.settings.period);
  const delta = primaryPeriodDelta(d);
  const spark = sparkPath(d.quietDay);
  const showNw = privacyFieldOn(priv, "netWorth");
  const showPace = privacyFieldOn(priv, "monthPace");

  const nwHtml = showNw
    ? `<div class="nw" data-testid="net-worth">${fmtNT(d.netWorth)}</div>`
    : `<div class="nw" data-testid="net-worth" hidden></div>`;
  const pacePill = showPace
    ? `<span class="pill ${delta >= 0 ? "up" : "down"}">${pl} ${fmtDelta(delta)}</span>`
    : "";
  const paceBlock = `<p class="rhythm-live-line" id="rhythmLiveLine">${t("rhythm.paceRunning")} <span id="rhythmLive" data-testid="rhythm-today">${fmtNT(Math.floor(todaySoFar(d.quietDay, new Date())))}</span></p>
      <div class="rhythm-hero" data-testid="rhythm-hero">
        <div class="cap">${t("rhythm.matrixCap")}</div>
        ${homeRhythmHTML("full")}
      </div>`;
  const capNote = paceCapped(state.paceAnchorAt)
    ? `<p class="fx-note" data-testid="pace-capped-note">${t("pace.cappedNote", { days: PACE_MAX_DAYS })}</p>`
    : "";

  const c = d.counts;
  const housingRow = privacyFieldOn(priv, "bucketHousing")
    ? `<button type="button" class="asset-row" data-go="house" data-testid="bucket-housing">
          <span class="name">${t("asset.housingEquity")}<span class="sub">${t("home.housingMeta", { n: c.properties })}</span></span>
          <span class="amt">${fmtNT(d.netEquity, true)}</span>
          <span class="delta">${t("delta.principalMo", { amount: fmtNT(d.monthlyPrincipal, true) })}</span>
          <span class="chev">›</span>
        </button>`
    : "";
  const stocksRow = privacyFieldOn(priv, "bucketTwse")
    ? `<button type="button" class="asset-row" data-go="stock" data-testid="bucket-stocks">
          <span class="name">${t("asset.stocks")}<span class="sub">${t("home.stocksMeta", { a: c.accounts, h: c.holdings })}</span></span>
          <span class="amt">${fmtNT(d.stocks, true)}</span>
          <span class="delta mute">${t("home.stocksNotInPace")}</span>
          <span class="chev">›</span>
        </button>`
    : "";
  const cashRow = privacyFieldOn(priv, "bucketCash")
    ? `<button type="button" class="asset-row" data-go="cash" data-testid="bucket-cash">
          <span class="name">${t("asset.cash")}<span class="sub">${t("home.cashMeta", { n: c.cash, c: c.cashCurrencies })}</span></span>
          <span class="amt">${fmtNT(d.cashTotal, true)}</span>
          <span class="delta mute">${d.dailyTdInterest > 0 ? t("home.tdPerDay", { amount: fmtNT(Math.round(d.dailyTdInterest)) }) : ""}</span>
          <span class="chev">›</span>
        </button>`
    : "";
  const passiveRow = privacyFieldOn(priv, "bucketPassive")
    ? `<button type="button" class="asset-row" data-go="passive" data-testid="bucket-passive">
          <span class="name">${t("asset.passive")}<span class="sub">${t("home.passiveMeta", { n: c.passive })}</span></span>
          <span class="amt">${fmtNT(d.passiveMonthly, true)}${t("perMo")}</span>
          <span class="delta mute">${t("delta.monthlyPace")}</span>
          <span class="chev">›</span>
        </button>`
    : "";
  const fxNote = d.missingFx.length
    ? `<p class="fx-note" data-testid="fx-missing-note">${t("fx.missingNote", { codes: d.missingFx.join(", ") })}</p>`
    : "";

  return `
    <div class="topbar"><div class="title">${t("brand")}</div>
      <button type="button" class="back" data-go="settings">${t("settings")}</button>
    </div>
    <div class="screen active" data-screen="home">
      <div class="hero">
        <div class="label">${t("netWorth")}</div>
        ${nwHtml}
        <div class="meta-row">
          ${pacePill}
          <span class="pill accent pace-breathe" data-testid="pace-badge">${t("home.paceBadge")}</span>
          ${homeRhythmHTML("inline")}
        </div>
      </div>
      ${paceBlock}
      ${capNote}
      <div class="spark-wrap spark-secondary">
        <div class="cap">${t("spark.cap")}</div>
        <svg viewBox="0 0 ${spark.w} ${spark.h}" preserveAspectRatio="none" aria-hidden="true">
          <path class="fill" d="${spark.fill}" />
          <path class="line" id="sparkLine" d="${spark.d}" />
          <circle id="sparkPlayhead" cx="${spark.coords[0][0]}" cy="${spark.coords[0][1]}" r="4" hidden />
        </svg>
      </div>
      <div class="asset-list">
        ${housingRow}
        ${stocksRow}
        ${cashRow}
        ${passiveRow}
      </div>
      ${fxNote}
      ${goalsListHTML(d, { manage: false })}
    </div>`;
}

function screenBucket(kind, d) {
  const titles = {
    house: t("bucket.housing"),
    stock: t("bucket.stocks"),
    cash: t("bucket.cash"),
    passive: t("bucket.passive"),
  };
  const reorderFor = { house: "property", stock: "account", cash: "cash", passive: "passive" };
  const reorder = reorderKind === reorderFor[kind];
  let body = "";
  if (kind === "house") body = housingList(state, d, reorder);
  else if (kind === "stock") body = stocksList(state, d, reorder);
  else if (kind === "cash") body = cashList(state, d, reorder);
  else if (kind === "passive") body = passiveList(state, d, reorder);

  return `
    <div class="topbar">
      <button type="button" class="back" data-go="home">${t("back")}</button>
      <div class="title">${titles[kind]}</div>
      <span class="topbar-ccy" title="${t("fx.base")}">${escapeHtml(fx().base)}</span>
    </div>
    <div class="screen active list-screen" data-screen="${kind}">${body}</div>`;
}

/** Currency codes referenced by any item (used to flag rows that can't be removed silently). */
function usedCurrencies() {
  const a = state.assets;
  return new Set([
    ...a.properties.map((x) => x.currency),
    ...a.brokerAccounts.map((x) => x.currency),
    ...a.cashAccounts.map((x) => x.currency),
    ...a.passiveItems.map((x) => x.currency),
  ]);
}

function fxSettingsHTML() {
  const table = fx();
  const used = usedCurrencies();
  const codes = Object.keys(table.rates);
  const baseOpts = [table.base, ...codes]
    .map((c) => {
      const ok = c === table.base || rateToBase(c, table) != null;
      return `<option value="${c}" ${c === table.base ? "selected" : ""} ${ok ? "" : "disabled"}>${c} · ${escapeHtml(currencySymbol(c).trim())}</option>`;
    })
    .join("");
  const rows = codes
    .map((c) => {
      const r = table.rates[c];
      const missing = r == null;
      return `<div class="fx-row${missing ? " is-missing" : ""}" data-testid="fx-row-${c}">
          <span class="fx-code">${c}</span>
          <label class="fx-eq" for="fx-${c}">1 ${c} =</label>
          <input id="fx-${c}" type="number" inputmode="decimal" step="any" min="0" value="${missing ? "" : fmtRateInput(r)}" placeholder="${t("fx.needsRate")}" data-fx-rate="${c}" data-testid="fx-rate-${c}" />
          <span class="fx-base">${table.base}</span>
          ${used.has(c) ? `<span class="fx-used" title="${t("fx.inUse")}">${t("fx.inUse")}</span>` : `<button type="button" class="icon-btn" data-fx-remove="${c}" aria-label="${t("fx.remove")} ${c}" data-testid="fx-remove-${c}">×</button>`}
        </div>`;
    })
    .join("");
  const stamp = table.edited
    ? t("fx.lastEdited", { date: table.updatedAt })
    : t("fx.defaults", { date: table.updatedAt });
  return `
      <div class="settings-block" data-testid="settings-fx" id="settings-fx">
        <h3>${t("settings.fx")}</h3>
        <div class="field inline-field">
          <label for="fx-base-select">${t("fx.base")}</label>
          <select id="fx-base-select" data-testid="fx-base">${baseOpts}</select>
        </div>
        <h4 class="settings-sub">${t("fx.rates")} <span class="fx-stamp" data-testid="fx-stamp">${stamp}</span></h4>
        <div class="fx-table" data-testid="fx-table">${rows}</div>
        <form class="fx-add" id="fx-add-form" data-testid="fx-add-form" novalidate>
          <input name="code" type="text" maxlength="3" placeholder="${t("fx.code")}" aria-label="${t("fx.code")}" autocomplete="off" data-testid="fx-add-code" />
          <input name="rate" type="number" step="any" min="0" placeholder="${t("fx.rateIn", { base: table.base })}" aria-label="${t("fx.rateIn", { base: table.base })}" data-testid="fx-add-rate" />
          <button type="submit" class="btn btn-sm" data-testid="fx-add">${t("fx.add")}</button>
        </form>
      </div>`;
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
      ${fxSettingsHTML()}
      <div class="settings-block">
        <h3>${t("settings.period")}</h3>
        <div class="seg" id="period-seg">
          <button type="button" data-period="7d" class="${s.period === "7d" ? "active" : ""}">${t("period.7d.full")}</button>
          <button type="button" data-period="30d" class="${s.period === "30d" ? "active" : ""}">${t("period.30d.full")}</button>
          <button type="button" data-period="month" class="${s.period === "month" ? "active" : ""}">${t("period.month.full")}</button>
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
      <div class="settings-block" data-testid="settings-goals">
        <h3>${t("settings.goals")}</h3>
        ${goalsListHTML(d0(), { manage: true })}
      </div>
      <div class="settings-block">
        <h3>${t("settings.about")}</h3>
        <p class="about">${t("settings.aboutBody", {
          tagline: t("tagline"),
          lang: localeLabel(s.locale || "en"),
          ccy: fx().base,
        })}</p>
      </div>
    </div>`;
}

function monthBeatHTML(style, size) {
  const now = new Date();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const day = now.getDate();
  const frac = (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
  const rhythmSmall = style === "rhythm" && size === "small";
  const cols = rhythmSmall ? 10 : dim;
  const rows = style === "rhythm" ? (size === "small" ? 3 : 1) : 4;
  if (rhythmSmall) {
    let dots = "";
    const n = Math.min(dim, 30);
    for (let i = 1; i <= cols * rows; i++) {
      if (i > n) {
        dots += `<i class="dot empty"></i>`;
        continue;
      }
      const on = i < day;
      const today = i === day;
      dots += `<i class="dot${today ? " today" : on ? " on" : ""}"></i>`;
    }
    return `<div class="month-beat grid" style="--cols:${cols}" ${size === "small" ? 'data-testid="month-beat"' : ""} aria-hidden="true">${dots}</div>`;
  }
  let html = "";
  for (let c = 1; c <= cols; c++) {
    const filled = style === "rhythm"
      ? (c < day || c === day ? 1 : 0)
      : c < day ? rows : c === day ? Math.max(1, Math.ceil(frac * rows)) : 0;
    let dots = "";
    for (let r = 0; r < rows; r++) {
      const on = r < filled;
      const today = c === day && on && r === filled - 1;
      dots += `<i class="dot${today ? " today" : on ? " on" : ""}"></i>`;
    }
    html += `<span class="col">${dots}</span>`;
  }
  return `<div class="month-beat cols" ${size === "small" ? 'data-testid="month-beat"' : ""} aria-hidden="true">${html}</div>`;
}

function trendSVG() {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const x = (i / 11) * 120;
    const y = 52 - (10 + 34 * t);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const line = pts.join(" ");
  return `<svg class="w-trend" viewBox="0 0 120 56" preserveAspectRatio="none" aria-hidden="true"><polyline points="${line}" /></svg>`;
}

function sedimentBuckets(d, priv) {
  if (priv.displayMode === "rhythm") return "";
  const base = d.netWorth;
  const amt = (n) => formatWidgetMoney(n, priv, { kind: "absolute", compact: true, base });
  const rows = [
    ["bucketHousing", t("widget.housing"), amt(d.netEquity)],
    ["bucketTwse", t("widget.stocks"), amt(d.stocks)],
    ["bucketCash", t("widget.cash"), amt(d.cashTotal)],
    ["bucketPassive", t("widget.passive"), priv.displayMode === "relative" ? "" : amt(d.passiveMonthly) + (priv.displayMode === "masked" ? "" : t("perMo"))],
  ];
  const html = rows
    .filter(([key, , text]) => privacyFieldOn(priv, key) && text)
    .map(([, label, text]) => `<div class="row"><span>${label}</span><span>${text}</span></div>`)
    .join("");
  return html ? `<div class="w-buckets">${html}</div>` : "";
}

function widgetCard(d, size) {
  const style = currentStyle();
  const priv = privacy();
  const pace30 = Math.round(d.periodQuiet(30));
  const showNw = privacyFieldOn(priv, "netWorth");
  const showPace = privacyFieldOn(priv, "monthPace");
  const showRhythm = showPace || showRhythmWithoutPace(priv);
  const nwText = formatWidgetMoney(d.netWorth, priv, {
    kind: "absolute",
    asMonthProgress: priv.displayMode === "relative",
  });
  const paceRaw = formatWidgetPace(pace30, priv, { base: d.netWorth, compact: true });
  const paceShown = priv.displayMode === "rhythm" ? "" : paceRaw;
  const small = size === "small";
  const hero = showNw && nwText
    ? `<div class="w-hero"${small ? ' data-testid="lock-net-worth"' : ""}>${nwText}</div>`
    : priv.displayMode === "rhythm"
      ? `<div class="w-hero w-phrase">${t("widget.rhythm")}</div>`
      : "";
  const pace = showPace && paceShown
    ? `<div class="w-pace"${small ? ' data-testid="lock-pace"' : ""}>${paceShown}</div>`
    : "";
  const side = small ? "" : style === "sediment" ? sedimentBuckets(d, priv) : trendSVG();
  return `
    <div class="wcard wstyle-${style} wsize-${size}" data-style="${style}" data-privacy-mode="${priv.displayMode}" data-testid="${small ? "lock-widget" : "home-widget"}" aria-label="${t(small ? "widget.lockAria" : "widget.homeAria")}">
      <div class="w-top">
        <div class="w-copy">
          <div class="w-kicker">${style === "rhythm" ? t("widget.rhythm") : t("netWorth")}</div>
          ${hero}
          ${pace}
        </div>
        ${side ? `<div class="w-side">${side}</div>` : ""}
      </div>
      ${showRhythm ? monthBeatHTML(style, size) : ""}
      ${small ? widgetGoalStripHTML(d, priv) : ""}
    </div>`;
}

function screenWidget(d) {
  const style = currentStyle();
  const priv = privacy();
  return `
    <div class="topbar">
      <div class="title">${t("nav.widget")}</div>
    </div>
    <div class="screen active" data-screen="widget" data-testid="widget-screen">
      <div class="widget-stage widget-stage-live">
        ${widgetCard(d, "small")}
        ${widgetCard(d, "medium")}
      </div>
      <div class="settings-block">
        <div class="template-picker style-picker" id="style-picker" data-testid="style-picker" role="listbox" aria-label="${t("nav.widget")}">
          ${WIDGET_STYLES.map((id) => `
            <button type="button"
              class="template-swatch ${style === id ? "active" : ""}"
              data-style-pick="${id}"
              data-testid="style-${id}"
              role="option"
              aria-selected="${style === id ? "true" : "false"}">
              <span class="swatch-face" data-face="${id}" aria-hidden="true"></span>
              <span class="swatch-name">${t("style." + id)}</span>
            </button>`).join("")}
        </div>
        <p class="template-desc" data-testid="style-desc">${t("style." + style + ".line")}</p>
      </div>
      <div class="settings-block" data-testid="widget-privacy">
        <h3>${t("settings.widgetPrivacy")}</h3>
        <p class="template-desc" data-testid="privacy-note">${t("settings.widgetPrivacyNote")}</p>
        <h4 class="settings-sub">${t("settings.privacyDisplayMode")}</h4>
        <div class="seg seg-wrap" id="privacy-mode-seg" data-testid="privacy-mode-seg" role="listbox" aria-label="${t("settings.privacyDisplayMode")}">
          ${DISPLAY_MODES.map((mode) => `
            <button type="button"
              data-privacy-mode="${mode}"
              data-testid="privacy-mode-${mode}"
              class="${priv.displayMode === mode ? "active" : ""}"
              role="option"
              aria-selected="${priv.displayMode === mode ? "true" : "false"}">${t("privacy.mode." + mode)}</button>`).join("")}
        </div>
        <p class="template-desc" data-testid="privacy-mode-desc">${t("privacy.mode." + priv.displayMode + ".desc")}</p>
        <h4 class="settings-sub">${t("settings.privacyFields")}</h4>
        <div class="privacy-fields" data-testid="privacy-fields">
          ${PRIVACY_FIELDS.map((key) => `
            <div class="toggle-row privacy-field-row">
              <div>${t("privacy.field." + key)}</div>
              <label class="switch">
                <input type="checkbox" data-privacy-field="${key}" data-testid="privacy-field-${key}" ${priv.fields[key] ? "checked" : ""} />
                <span class="slider"></span>
              </label>
            </div>`).join("")}
        </div>
      </div>
    </div>`;
}

function render() {
  setDisplayCurrency(fx().base);
  const d = d0();
  let body = "";
  if (route === "home") body = screenHome(d);
  else if (route === "house") body = screenBucket("house", d);
  else if (route === "stock") body = screenBucket("stock", d);
  else if (route === "cash") body = screenBucket("cash", d);
  else if (route === "passive") body = screenBucket("passive", d);
  else if (route === "widget") body = screenWidget(d);
  else if (route === "settings") body = screenSettings();
  else body = screenHome(d);

  const sheet = itemEdit
    ? itemSheetHTML(state, itemEdit, findItem(itemEdit))
    : goalEdit
      ? goalSheetHTML()
      : "";

  const leavingHome =
    lastRoute === "home" && route !== "home";
  if (leavingHome) onLeaveRhythmViews();

  app.innerHTML = `
    <header class="app-chrome">
      <h1 data-testid="app-title">${t("brand")}<em>${t("tagline")}</em></h1>
    </header>
    <nav class="nav-seg" aria-label="${t("nav.screens")}">
      <button type="button" data-go="home" class="${route === "home" ? "active" : ""}">${t("nav.home")}</button>
      <button type="button" data-go="house" class="${route === "house" ? "active" : ""}">${t("nav.housing")}</button>
      <button type="button" data-go="stock" class="${route === "stock" ? "active" : ""}">${t("nav.stocks")}</button>
      <button type="button" data-go="cash" class="${route === "cash" ? "active" : ""}">${t("nav.cash")}</button>
      <button type="button" data-go="passive" class="${route === "passive" ? "active" : ""}">${t("nav.passive")}</button>
      <button type="button" data-go="widget" class="${route === "widget" ? "active" : ""}">${t("nav.widget")}</button>
      <button type="button" data-go="settings" class="${route === "settings" ? "active" : ""}">${t("nav.settings")}</button>
    </nav>
    <div class="shell" data-style="${currentStyle()}">${body}</div>
    ${sheet}
  `;

  applyStyleAttr(app);
  bind();

  if (route === "home") {
    const spark = sparkPath(d.quietDay);
    sparkCoords = spark.coords;
    onEnterHome();
  } else {
    onLeaveRhythmViews();
  }
  lastRoute = route;
}

function bind() {
  app.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => go(el.getAttribute("data-go")));
  });

  bindItems();


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


  const buyout = document.getElementById("buyout-toggle");
  if (buyout) {
    buyout.addEventListener("change", () => {
      state.settings.buyout = buyout.checked;
      persist();
    });
  }

  document.getElementById("style-picker")?.querySelectorAll("[data-style-pick]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = normalizeWidgetStyle(b.getAttribute("data-style-pick"));
      state.settings.widgetStyle = id;
      delete state.settings.widgetTemplate;
      persist();
      render();
    });
  });

  document.getElementById("privacy-mode-seg")?.querySelectorAll("[data-privacy-mode]").forEach((b) => {
    b.addEventListener("click", () => {
      const mode = b.getAttribute("data-privacy-mode");
      state.settings.widgetPrivacy = normalizeWidgetPrivacy({
        ...privacy(),
        displayMode: mode,
      });
      persist();
      render();
    });
  });

  document.querySelectorAll("input[data-privacy-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.getAttribute("data-privacy-field");
      const next = normalizeWidgetPrivacy(privacy());
      next.fields[key] = !!input.checked;
      state.settings.widgetPrivacy = next;
      persist();
      render();
    });
  });

  app.querySelectorAll("[data-goal-edit]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-goal-edit");
      openGoalEdit(id);
    });
  });

  app.querySelectorAll("[data-goal-delete]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-goal-delete");
      if (id) deleteGoal(id);
    });
  });

  const goalForm = document.getElementById("goal-form");
  if (goalForm) {
    document.getElementById("goal-cancel")?.addEventListener("click", closeGoalEdit);
    document.getElementById("goal-backdrop")?.addEventListener("click", (ev) => {
      if (ev.target.id === "goal-backdrop") closeGoalEdit();
    });
    goalForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      saveGoalFromForm(goalForm);
    });
  }

}

/* ?demo=1 → body.demo-rhythm for clearer/faster motion (recording) */
if (new URLSearchParams(location.search).get("demo") === "1") {
  document.body.classList.add("demo-rhythm");
}

render();

/* Native home-screen widget: snapshot on start + on resume/pause (no-op on web). */
initNativeWidget(state);
