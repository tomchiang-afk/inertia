/**
 * HTML builders for the v2 category lists (drill-down from Home) and item edit sheets.
 * Pure string builders; main.js owns state, routing, binding and the ad rule.
 */
import { t } from "./i18n/index.js";
import {
  MARKETS,
  CASH_TYPES,
  FREQUENCIES,
  MARKET_CURRENCY,
  monthlyAmount,
  holdingValue,
  accountValue,
} from "./portfolio.js";
import { toBase, COMMON_CURRENCIES, normalizeCurrency } from "./currency.js";
import { fmtMoney, fmtCompact, fmtNumber } from "./format.js";

export function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function priceDecimals(n) {
  return Math.abs(n % 1) > 1e-9 ? 2 : 0;
}

/** "US$41,520" plus the converted base value when the item isn't in base. */
function moneyPair(amount, ccy, fx, { compactBase = false } = {}) {
  const base = fx.base;
  const native = fmtMoney(amount, ccy, { decimals: ccy === base ? 0 : priceDecimals(amount) && Math.abs(amount) < 1000 ? 2 : 0 });
  if (normalizeCurrency(ccy) === base) return { main: native, sub: "" };
  const v = toBase(amount, ccy, fx);
  if (v == null) return { main: native, sub: `<span class="fx-missing">${t("fx.needsRate")}</span>`, missing: true };
  return { main: native, sub: "≈ " + (compactBase ? fmtCompact(v, base) : fmtMoney(v, base)) };
}

export function marketLabel(m) {
  return MARKETS.includes(m) ? t("market." + m) : m;
}

function moveButtons(kind, id, idx, len, extra = "") {
  return `<span class="move-btns">
      <button type="button" class="icon-btn" data-move="${kind}" data-id="${esc(id)}" ${extra} data-dir="-1" aria-label="${t("list.moveUp")}" ${idx === 0 ? "disabled" : ""}>↑</button>
      <button type="button" class="icon-btn" data-move="${kind}" data-id="${esc(id)}" ${extra} data-dir="1" aria-label="${t("list.moveDown")}" ${idx === len - 1 ? "disabled" : ""}>↓</button>
    </span>`;
}

function row({ kind, id, title, meta, main, sub, idx, len, reorder, testid, extra = "" }) {
  const trailing = reorder
    ? moveButtons(kind, id, idx, len, extra)
    : `<span class="chev" aria-hidden="true">›</span>`;
  const openAttr = reorder ? "" : `data-open="${kind}" data-id="${esc(id)}" ${extra}`;
  const tag = reorder ? "div" : "button";
  const typeAttr = reorder ? "" : `type="button"`;
  return `<${tag} ${typeAttr} class="item-row${reorder ? " is-reorder" : ""}" ${openAttr} data-testid="${testid}">
      <span class="item-main">
        <span class="item-title">${title}</span>
        ${meta ? `<span class="item-meta">${meta}</span>` : ""}
      </span>
      <span class="item-val">
        <span class="item-amt">${main}</span>
        ${sub ? `<span class="item-sub">${sub}</span>` : ""}
      </span>
      ${trailing}
    </${tag}>`;
}

function listHead(kind, reorder, count) {
  const btn = count > 1
    ? `<button type="button" class="btn btn-ghost btn-sm" data-reorder="${kind}" aria-pressed="${reorder}" data-testid="reorder-${kind}">${reorder ? t("list.done") : t("list.reorder")}</button>`
    : "";
  return btn;
}

function summary(lines, testid) {
  return `<div class="list-summary" data-testid="${testid}">
      <div class="ls-main"><span class="ls-k">${lines.k}</span><span class="ls-v">${lines.v}</span></div>
      ${lines.sub ? `<div class="ls-sub">${lines.sub}</div>` : ""}
    </div>`;
}

function missingNote(d) {
  if (!d.missingFx?.length) return "";
  return `<p class="fx-note" data-testid="fx-missing-note">${t("fx.missingNote", { codes: d.missingFx.join(", ") })}</p>`;
}

/* ---------------------------------------------------------------- lists */

export function housingList(state, d, reorder) {
  const fx = state.settings.fx;
  const list = state.assets.properties;
  const rows = list
    .map((p, i) => {
      const net = moneyPair(p.marketValue - p.mortgageBalance, p.currency, fx, { compactBase: true });
      const meta = [
        t("house.meta", { value: fmtCompact(p.marketValue, p.currency), loan: fmtCompact(p.mortgageBalance, p.currency) }),
        p.monthlyPrincipal ? t("delta.principalMo", { amount: fmtCompact(p.monthlyPrincipal, p.currency) }) : "",
        p.interestRate != null ? p.interestRate + "%" : "",
      ].filter(Boolean).join(" · ");
      return row({ kind: "property", id: p.id, title: esc(p.alias), meta, main: net.main, sub: net.sub, idx: i, len: list.length, reorder, testid: `property-${p.id}` });
    })
    .join("");
  return `
    ${summary({
      k: t("field.netEquity"),
      v: fmtMoney(d.netEquity),
      sub: t("house.summary", { value: fmtCompact(d.housingValue), loan: fmtCompact(d.mortgage), prin: fmtCompact(d.monthlyPrincipal) }),
    }, "housing-summary")}
    ${missingNote(d)}
    <div class="list-head"><h3>${t("list.properties")}</h3>${listHead("property", reorder, list.length)}</div>
    <div class="item-list" data-testid="property-list">${rows || `<p class="item-empty">${t("list.empty.house")}</p>`}</div>
    <p class="detail-note bare">${t("note.housing", { amount: fmtMoney(Math.round(d.dailyPrincipal)) })}</p>
    <div class="actions"><button type="button" class="btn btn-primary" data-new="property" data-testid="add-property">${t("list.add.property")}</button></div>`;
}

export function stocksList(state, d, reorder) {
  const fx = state.settings.fx;
  const accts = state.assets.brokerAccounts;
  const groups = accts
    .map((a, ai) => {
      const val = moneyPair(accountValue(a), a.currency, fx, { compactBase: true });
      const holdings = a.holdings
        .map((h, hi) => {
          const hv = moneyPair(holdingValue(h), a.currency, fx, { compactBase: true });
          const title = h.symbol
            ? `<span class="sym">${esc(h.symbol)}</span>${h.name ? ` <span class="item-name">${esc(h.name)}</span>` : ""}`
            : esc(h.name || "—");
          const meta = t("stock.holdingMeta", {
            shares: fmtNumber(h.shares),
            price: fmtMoney(h.price, a.currency, { decimals: priceDecimals(h.price) }),
          }) + (h.costBasis != null && h.costBasis > 0
            ? ` · <span class="${h.price >= h.costBasis ? "up" : "down"}">${fmtPct((h.price / h.costBasis - 1) * 100)}</span>`
            : "");
          return row({ kind: "holding", id: h.id, extra: `data-account="${esc(a.id)}"`, title, meta, main: hv.main, sub: hv.sub, idx: hi, len: a.holdings.length, reorder, testid: `holding-${h.id}` });
        })
        .join("");
      const move = reorder ? moveButtons("account", a.id, ai, accts.length) : "";
      return `
        <section class="acct-group" data-testid="account-${esc(a.id)}">
          <div class="acct-head">
            <button type="button" class="acct-title" data-open="account" data-id="${esc(a.id)}" data-testid="account-edit-${esc(a.id)}" ${reorder ? "disabled" : ""}>
              <span class="item-title">${esc(a.alias)}</span>
              <span class="item-meta">${esc(marketLabel(a.market))} · ${esc(a.currency)} · ${t("stock.nHoldings", { n: a.holdings.length })}</span>
            </button>
            <span class="item-val"><span class="item-amt" data-testid="account-value-${esc(a.id)}">${val.main}</span>${val.sub ? `<span class="item-sub">${val.sub}</span>` : ""}</span>
            ${move}
          </div>
          <div class="item-list nested">${holdings || `<p class="item-empty">${t("stock.noHoldings")}</p>`}</div>
          ${reorder ? "" : `<button type="button" class="btn-link" data-new="holding" data-account="${esc(a.id)}" data-testid="add-holding-${esc(a.id)}">+ ${t("list.add.holding")}</button>`}
        </section>`;
    })
    .join("");
  // No market P&L (month rhythm only): the summary just counts accounts / holdings.
  const pnlLine = t("stock.summary", { n: d.counts.accounts, h: d.counts.holdings });
  return `
    ${summary({ k: t("field.marketValue"), v: fmtMoney(d.stocks), sub: pnlLine }, "stocks-summary")}
    ${missingNote(d)}
    <div class="list-head"><h3>${t("list.accounts")}</h3>${listHead("account", reorder, Math.max(accts.length, accts.some((a) => a.holdings.length > 1) ? 2 : 0))}</div>
    <div class="acct-list" data-testid="account-list">${groups || `<p class="item-empty">${t("list.empty.stock")}</p>`}</div>
    <p class="detail-note bare">${t("note.stocks")}</p>
    <div class="actions"><button type="button" class="btn btn-primary" data-new="account" data-testid="add-account">${t("list.add.account")}</button></div>`;
}

function fmtPct(n) {
  const s = Math.abs(n).toFixed(1).replace(/\.0$/, "") + "%";
  return (n >= 0 ? "+" : "−") + s;
}

export function cashList(state, d, reorder) {
  const fx = state.settings.fx;
  const list = state.assets.cashAccounts;
  const rows = list
    .map((c, i) => {
      const v = moneyPair(c.balance, c.currency, fx, { compactBase: true });
      const meta = [
        t("cash.type." + c.type),
        [c.institution, c.country].filter(Boolean).map(esc).join(", "),
        c.type === "timeDeposit" && c.rate != null ? c.rate + "%" : "",
        c.type === "timeDeposit" && c.maturity ? t("cash.maturity", { date: c.maturity }) : "",
      ].filter(Boolean).join(" · ");
      return row({ kind: "cash", id: c.id, title: esc(c.alias), meta, main: v.main, sub: v.sub, idx: i, len: list.length, reorder, testid: `cash-${c.id}` });
    })
    .join("");
  return `
    ${summary({ k: t("field.total"), v: fmtMoney(d.cashTotal), sub: t("cash.summary", { n: d.counts.cash, c: d.counts.cashCurrencies, amount: fmtMoney(Math.round(d.dailyTdInterest)) }) }, "cash-summary")}
    ${missingNote(d)}
    <div class="list-head"><h3>${t("list.cashAccounts")}</h3>${listHead("cash", reorder, list.length)}</div>
    <div class="item-list" data-testid="cash-list">${rows || `<p class="item-empty">${t("list.empty.cash")}</p>`}</div>
    <div class="actions"><button type="button" class="btn btn-primary" data-new="cash" data-testid="add-cash">${t("list.add.cash")}</button></div>`;
}

export function passiveList(state, d, reorder) {
  const fx = state.settings.fx;
  const list = state.assets.passiveItems;
  const rows = list
    .map((p, i) => {
      const mo = monthlyAmount(p);
      const moBase = toBase(mo, p.currency, fx);
      const main = fmtMoney(p.amount, p.currency, { decimals: priceDecimals(p.amount) }) + `<span class="per">${t("passive.per." + p.frequency)}</span>`;
      const sub = moBase == null
        ? `<span class="fx-missing">${t("fx.needsRate")}</span>`
        : p.frequency === "monthly" && p.currency === fx.base
          ? ""
          : t("passive.monthlyEq", { amount: fmtMoney(moBase) });
      const meta = [p.tag ? `<span class="tag-chip">${esc(p.tag)}</span>` : "", t("passive.freq." + p.frequency), p.currency !== fx.base ? p.currency : ""]
        .filter(Boolean).join(" · ");
      return row({ kind: "passive", id: p.id, title: esc(p.name), meta, main, sub, idx: i, len: list.length, reorder, testid: `passive-${p.id}` });
    })
    .join("");
  return `
    ${summary({ k: t("field.monthlyPace"), v: fmtMoney(d.passiveMonthly) + t("perMo"), sub: t("passive.summary", { n: d.counts.passive, day: fmtMoney(Math.round(d.dailyPassivePace)) }) }, "passive-summary")}
    ${missingNote(d)}
    <div class="list-head"><h3>${t("list.passiveItems")}</h3>${listHead("passive", reorder, list.length)}</div>
    <div class="item-list" data-testid="passive-list">${rows || `<p class="item-empty">${t("list.empty.passive")}</p>`}</div>
    <p class="detail-note bare">${t("note.passive")}</p>
    <div class="actions"><button type="button" class="btn btn-primary" data-new="passive" data-testid="add-passive">${t("list.add.passive")}</button></div>`;
}

/* ---------------------------------------------------------------- sheets */

/** Field specs per item kind. `money: true` = a numeric change here triggers the save ad. */
export const FORM_SPECS = {
  property: [
    { name: "alias", type: "text", label: "form.alias", required: true },
    { name: "currency", type: "currency", label: "form.currency" },
    { name: "marketValue", type: "number", label: "form.marketValue", money: true },
    { name: "mortgageBalance", type: "number", label: "form.mortgageBalance", money: true },
    { name: "monthlyPrincipal", type: "number", label: "form.monthlyPrincipal", money: true },
    { name: "interestRate", type: "number", label: "form.interestRate", optional: true, step: "0.01", money: true },
  ],
  account: [
    { name: "alias", type: "text", label: "form.accountAlias", required: true },
    { name: "market", type: "market", label: "form.market" },
    { name: "currency", type: "currency", label: "form.currency" },
  ],
  holding: [
    { name: "symbol", type: "text", label: "form.symbol", max: 16, half: true },
    { name: "name", type: "text", label: "form.holdingName", half: true },
    { name: "shares", type: "number", label: "form.shares", step: "any", money: true },
    { name: "price", type: "number", label: "form.price", step: "any", money: true },
    { name: "costBasis", type: "number", label: "form.costBasis", step: "any", optional: true, money: true },
  ],
  cash: [
    { name: "alias", type: "text", label: "form.alias", required: true },
    { name: "institution", type: "text", label: "form.institution", half: true },
    { name: "country", type: "text", label: "form.country", max: 24, half: true },
    { name: "currency", type: "currency", label: "form.currency" },
    { name: "type", type: "select", label: "form.type", options: CASH_TYPES.map((v) => [v, "cash.type." + v]) },
    { name: "balance", type: "number", label: "form.balance", step: "any", money: true, allowNegative: true },
    { name: "rate", type: "number", label: "form.rate", step: "0.01", optional: true, money: true, when: ["type", "timeDeposit"] },
    { name: "maturity", type: "date", label: "form.maturity", when: ["type", "timeDeposit"] },
  ],
  passive: [
    { name: "name", type: "text", label: "form.incomeName", required: true },
    { name: "tag", type: "text", label: "form.tag", max: 24, list: "tag-list" },
    { name: "currency", type: "currency", label: "form.currency" },
    { name: "amount", type: "number", label: "form.amount", step: "any", money: true },
    { name: "frequency", type: "select", label: "form.frequency", options: FREQUENCIES.map((v) => [v, "passive.freq." + v]) },
  ],
};

export const SHEET_TITLES = {
  property: ["sheet.newProperty", "sheet.editProperty"],
  account: ["sheet.newAccount", "sheet.editAccount"],
  holding: ["sheet.newHolding", "sheet.editHolding"],
  cash: ["sheet.newCash", "sheet.editCash"],
  passive: ["sheet.newPassive", "sheet.editPassive"],
};

export function defaultsFor(kind, state, accountId) {
  const base = state.settings.fx.base;
  if (kind === "property") return { alias: "", currency: base, marketValue: "", mortgageBalance: 0, monthlyPrincipal: 0, interestRate: null };
  if (kind === "account") return { alias: "", market: "TW", currency: "TWD" };
  if (kind === "holding") return { symbol: "", name: "", shares: "", price: "", costBasis: null };
  if (kind === "cash") return { alias: "", institution: "", country: "", currency: base, type: "checking", balance: "", rate: null, maturity: null };
  if (kind === "passive") return { name: "", tag: "", currency: base, amount: "", frequency: "monthly" };
  return {};
}

function currencyCodes(state) {
  const fx = state.settings.fx;
  return [...new Set([fx.base, ...Object.keys(fx.rates), ...COMMON_CURRENCIES])];
}

function fieldHTML(f, value, ctx) {
  const id = "f-" + f.name;
  const label = t(f.label, ctx.labelVars);
  const hidden = f.when && ctx.values[f.when[0]] !== f.when[1];
  const wrap = (inner) =>
    `<div class="field${(f.type === "text" || f.type === "market") && !f.half ? " field-full" : ""}"${f.when ? ` data-when="${f.when[0]}:${f.when[1]}"` : ""}${hidden ? " hidden" : ""}><label for="${id}">${label}</label>${inner}</div>`;
  const v = value == null ? "" : value;
  if (f.type === "text") {
    return wrap(`<input id="${id}" name="${f.name}" type="text" maxlength="${f.max || 60}" value="${esc(v)}" ${f.required ? "required" : ""} ${f.list ? `list="${f.list}"` : ""} autocomplete="off" data-testid="form-${f.name}" />`);
  }
  if (f.type === "number") {
    return wrap(`<input id="${id}" name="${f.name}" type="number" inputmode="decimal" step="${f.step || "1"}" ${f.allowNegative ? "" : 'min="0"'} value="${esc(v)}" ${f.optional ? "" : "required"} data-testid="form-${f.name}" />`);
  }
  if (f.type === "date") {
    return wrap(`<input id="${id}" name="${f.name}" type="date" value="${esc(v)}" data-testid="form-${f.name}" />`);
  }
  if (f.type === "select") {
    const opts = f.options.map(([val, key]) => `<option value="${val}" ${val === v ? "selected" : ""}>${t(key)}</option>`).join("");
    return wrap(`<select id="${id}" name="${f.name}" data-testid="form-${f.name}">${opts}</select>`);
  }
  if (f.type === "currency") {
    const opts = currencyCodes(ctx.state).map((c) => `<option value="${c}"></option>`).join("");
    return wrap(`<input id="${id}" name="currency" type="text" maxlength="3" pattern="[A-Za-z]{3}" list="ccy-list" value="${esc(v)}" required autocomplete="off" class="ccy-input" data-testid="form-currency" />
      <datalist id="ccy-list">${opts}</datalist>`);
  }
  if (f.type === "market") {
    const opts = MARKETS.map((m) => `<option value="${m}">${t("market." + m)}</option>`).join("");
    return wrap(`<input id="${id}" name="market" type="text" maxlength="16" list="market-list" value="${esc(v)}" required autocomplete="off" data-testid="form-market" />
      <datalist id="market-list">${opts}</datalist>
      <span class="field-hint">${t("form.marketHint")}</span>`);
  }
  return "";
}

export function itemSheetHTML(state, edit, item) {
  const isNew = !edit.id;
  const [newKey, editKey] = SHEET_TITLES[edit.kind];
  const title = t(isNew ? newKey : editKey);
  const values = item || defaultsFor(edit.kind, state, edit.accountId);
  const account = edit.kind === "holding" ? state.assets.brokerAccounts.find((a) => a.id === edit.accountId) : null;
  const ctx = { state, values, labelVars: {} };
  const fields = FORM_SPECS[edit.kind].map((f) => fieldHTML(f, values[f.name], ctx)).join("");
  const tags = edit.kind === "passive"
    ? `<datalist id="tag-list">${[...new Set(state.assets.passiveItems.map((p) => p.tag).filter(Boolean))].map((x) => `<option value="${esc(x)}"></option>`).join("")}</datalist>`
    : "";
  const acctNote = account
    ? `<p class="sheet-sub">${esc(account.alias)} · ${esc(marketLabel(account.market))} · ${t("stock.priceIn", { ccy: account.currency })}</p>`
    : "";
  const del = isNew
    ? ""
    : `<button type="button" class="btn btn-ghost btn-danger" id="item-delete" data-testid="item-delete">${t("form.delete")}</button>`;
  return `
    <div class="sheet-backdrop" id="item-backdrop" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <form class="sheet" id="item-form" data-kind="${edit.kind}" data-testid="item-form" novalidate>
        <h2 tabindex="-1">${esc(title)}</h2>
        ${acctNote}
        <div class="field-grid">${fields}</div>
        ${tags}
        <p class="sheet-preview" id="item-preview" data-testid="item-preview" aria-live="polite"></p>
        <p class="form-error" id="item-error" role="alert" hidden></p>
        <div class="sheet-actions">
          ${del}
          <button type="button" class="btn btn-ghost" id="item-cancel">${t("cancel")}</button>
          <button type="submit" class="btn btn-primary" data-testid="item-save">${t("save")}</button>
        </div>
      </form>
    </div>`;
}

/** Read + validate a form into a plain values object; returns { values } or { error, field }. */
export function readItemForm(form, kind) {
  const values = {};
  for (const f of FORM_SPECS[kind]) {
    const el = form.elements[f.name];
    if (!el) continue;
    const raw = String(el.value ?? "").trim();
    const hidden = el.closest(".field")?.hidden;
    if (f.type === "number") {
      if (raw === "" || hidden) {
        if (!f.optional && !hidden) return { error: "form.errRequired", field: f.name };
        values[f.name] = f.optional || hidden ? null : 0;
        continue;
      }
      const n = Number(raw.replace(/,/g, ""));
      if (!Number.isFinite(n) || (!f.allowNegative && n < 0)) return { error: "form.errNumber", field: f.name };
      values[f.name] = n;
    } else if (f.type === "currency") {
      const c = raw.toUpperCase();
      if (!/^[A-Z]{3}$/.test(c)) return { error: "form.errCurrency", field: f.name };
      values[f.name] = c;
    } else if (f.type === "date") {
      values[f.name] = hidden ? null : raw || null;
    } else {
      if (f.required && !raw) return { error: "form.errRequired", field: f.name };
      values[f.name] = raw;
    }
  }
  if (kind === "holding" && !values.symbol && !values.name) return { error: "form.errSymbol", field: "symbol" };
  return { values };
}

/** Did any money-ish field (or the currency) change? New items always count. */
export function numbersChanged(kind, prev, next) {
  if (!prev) return true;
  for (const f of FORM_SPECS[kind]) {
    if (!(f.money || f.type === "currency")) continue;
    const a = prev[f.name] ?? null;
    const b = next[f.name] ?? null;
    if (f.type === "currency" ? a !== b : Number(a ?? NaN) !== Number(b ?? NaN) && !(a == null && b == null)) return true;
  }
  return false;
}

export { MARKET_CURRENCY };
