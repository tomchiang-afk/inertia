# Inertia — Lean PRD

> Taiwan-first household asset management. Widget-first. Not a trading app.
> English product name only. Tagline: **Your assets keep moving.**
> Version: web MVP · 2026-09-24

---

## 1. Problem / insight

On **flat or red market days**, Taiwanese households with Housing + TWSE + Cash + rent/dividends still feel idle anxiety: “nothing happened today.” Brokerage apps amplify daily P&L noise; bank apps show balances without *progress*.

**Insight:** Quiet growth is real — mortgage principal paydown, TD interest accrual, dividend and rent pace — but invisible. The job is to make that progress glanceable on **lock screen + home screen widgets**, with an honesty layer that never fakes market gains.

---

## 2. Target user (Taiwan)

- Primary: 30–50, dual-income or homeowner, holds housing ± mortgage, some TWSE ETF/stocks, checking + time deposit, optional rental or dividend income.
- Thinks in **TWD**; UI chrome is **English**.
- Checks phone home/lock many times a day; opens finance apps rarely on quiet days.
- Wants calm household stewardship, not day-trading tips.
- Not: crypto traders, US-centric FIRE maximalists, or live-bank-API early adopters.

---

## 3. Product principles

1. **Widget-first** — Lock small + Home medium are the product; full app is setup and depth.
2. **Honesty** — Never invent TWSE gains. Toggle: **Today actual** vs **Month pace**.
3. **Quiet growth** — Celebrate principal / interest accrual / passive pace on flat days.
4. **Calm / practical** — Soft neutrals, one muted green (`#2F5D4A`); no alert spam; no emoji chrome.
5. **Manual truth (MVP)** — User-entered balances & rates are primary. Fully **local-first**.
6. **No LLM** — No generative AI features in product or support copy for MVP.

---

## 4. Locked commercial decisions

| Decision | Rule |
|----------|------|
| Download | **Free** |
| Monetization | **One-time buyout** removes ads (IAP later; simulated toggle in web MVP) |
| Ads | **Edit-only.** NEVER on widgets. NEVER on mere browse/view of App Home or bucket detail. ONLY when user starts or commits editing numbers (open edit form / save). |
| Quotes | **User-entered primary.** Thin `/api/quotes` client stub for **delayed** quotes later (mock / canned offline). |
| AI | **No LLM.** |
| Data | LocalStorage or IndexedDB; no account required for MVP. Key: `inertia.v1`. |

---

## 5. GTM (Taiwan)

1. **Positioning** — Not a trading terminal; household asset *pace* on the widget. Quiet growth, not a brokerage P&L wall.
2. **Channels** — App Store / Google Play (later native shell); content around mortgage principal, TD, ETF dividends, household asset primers; Taiwan ETF / mortgage communities (restrained, no hype).
3. **Hook** — Free download → manually set four buckets → add widget → on quiet days see today’s quiet contribution; ads only when changing numbers → one-time buyout.
4. **Conversion** — Soft prompt after N successful edits: “Edit often? Buy out once — ads gone forever.” Never interrupt browse or widget glance.
5. **Store path (later)** — Capacitor/RN shell → iOS WidgetKit + Android App Widgets → AdMob (edit interstitial only) + StoreKit / Play Billing one-time unlock.

---

## 6. Scope

### MVP (this web app)
- Four buckets + net worth; quiet-day math
- App Home, bucket detail ×4 with Edit, Settings (honesty, period, buyout mock, quotes about)
- Widget **preview** pages (lock + home medium) — labeled Preview; **no ads**
- Local persistence; ad gate on edit open/save when not bought out
- Quote stub: `fetchDelayedQuotes(symbols)` mock + optional confirm update on TWSE

### Later
- Native widgets, IAP buyout, AdMob edit interstitial
- Thin delayed-quote backend (`GET /api/quotes?symbols=`)
- Home large widget; multi-property; optional soft sync

### Out of scope
- Trading / order entry / AI tips / social
- Live bank APIs, push spam
- Ads on widgets or read-only screens

---

## 7. Four buckets + fields

| Bucket | Fields |
|--------|--------|
| Housing | `marketValue`, `mortgage`, netEquity = value − mortgage; `monthlyPrincipal` |
| TWSE | `marketValue`, `dayPnL`, `periodPnL` |
| Cash | `checking`, `timeDeposit`, `tdAnnualRate` (tdPrincipal = timeDeposit) |
| Passive income | `monthly` |

**Net worth** = housing equity + TWSE + checking + TD (passive is pace only — not in net worth).

---

## 8. Quiet-day math

```
dailyPrincipal   = monthlyPrincipal / daysInMonth
dailyTdInterest  = timeDeposit * (tdAnnualRate / 100) / 365
dailyPassivePace = monthlyPassive / daysInMonth
quietDayGrowth   = dailyPrincipal + dailyTdInterest + dailyPassivePace
```

Do **not** include TWSE mark-to-market in quiet growth.

---

## 9. Architecture

```
[Vite web app]
  ├─ UI (English) — Home / Buckets / Edit / Settings / Widget previews
  ├─ store.js — localStorage inertia.v1 (assets + settings + buyout; migrates jingchang.v1)
  ├─ math.js — quiet-day / period / net worth
  ├─ adGate.js — edit-only interstitial when !buyout
  └─ quotes.js — fetchDelayedQuotes() stub (mock delayed)

Future:
  Native shell → widgets read shared glance snapshot
  Thin backend → delayed quotes only (optional)
  IAP → sets buyout flag; AdMob only behind adGate
```

**Local-first:** all truth in device storage. Quotes never overwrite without user confirm (still an edit path → may show ad once if not bought out).

---

## 10. Success metrics (directional)

| Metric | Target |
|--------|--------|
| Widget add after onboarding | ≥ 60% |
| Widget glances ≫ full-app opens | Yes |
| Quiet-day retention (dayPnL ≤ 0) | Glance or open |
| Buyout after repeated edits | Soft, non-blocking on browse |

---

*End of lean PRD. Product name: **Inertia**.*
