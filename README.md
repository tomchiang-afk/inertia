# Inertia — Web MVP

Taiwan household asset app · local-first · multi-language UI · TWD.  
Tagline: **Your assets keep moving.** (localizes; product name **Inertia** does not)  
Design tokens from `/workspace/quiet-wealth-prototype/` (light `#F7F6F3`, accent `#2F5D4A`, dense rows).

## Supported languages

| Code | Language |
|------|----------|
| `zh-TW` | 繁體中文 (Traditional Chinese) |
| `en` | English (fallback) |
| `es` | Español |
| `ja` | 日本語 |
| `ko` | 한국어 |

- Product name **Inertia** is **fixed in every language** — never translate.
- Tagline localizes. Currency stays **NT$** / TWD.
- First launch detects `navigator.language`, persists `settings.locale` in `inertia.v1`.
- Settings → Language picker; instant re-render; sets `document.documentElement.lang`.
- Implementation: `src/i18n/` (`en`, `zh-TW`, `es`, `ja`, `ko` + `t(key)` / `setLocale`).

## How to run

```bash
cd /workspace/inertia
npm install
npm run dev
```

Open the URL Vite prints (default `http://127.0.0.1:5173/`).

```bash
npm run build    # production bundle → dist/
npm run preview  # serve dist/
```

### See rhythm animations

- Default honesty is **Month pace** — Home shows metronome bars (4 beats, ~2s cycle), live **Pace running** counter, sparkline stroke draw + playhead within ~1s of load.
- **Recording / clearer motion:** open `http://127.0.0.1:5173/?demo=1`  
  Adds `body.demo-rhythm` (taller/faster beats, faster playhead & counter).
- Standalone full-bleed demo: `http://127.0.0.1:5173/rhythm-demo.html` (auto-cycles lock → home).
- Motion proof GIF: [`docs/rhythm-demo.gif`](docs/rhythm-demo.gif) (code-generated, same motion language). Regenerate: `npm run rhythm:gif`.
- `prefers-reduced-motion: reduce` disables all rhythm motion.

Browsing Home / buckets / widget previews **never** triggers ads.


## E2E tests (Playwright)

Fast Chromium-only regression for core user flows (home, locale, browse vs edit ads, buyout, persist, demo rhythm).

```bash
# First time only — install browser binary
npx playwright install chromium

npm run test:e2e          # headless
npm run test:e2e:headed   # headed Chromium
npm run test:e2e:ui       # Playwright UI mode
npm run test:unit         # node:test (widget snapshot builder)
```

Config: `playwright.config.ts` — `baseURL` `http://127.0.0.1:5173`, `webServer: npm run dev` with `reuseExistingServer`. Tests live in `e2e/`.

**Add Firefox / WebKit:** in `playwright.config.ts` projects, uncomment/add Desktop Firefox and Desktop Safari device entries, then `npx playwright install firefox webkit`.

## What’s in this build

| Area | Status |
|------|--------|
| App Home / 4 categories with user-defined lists / add · edit · delete · reorder / Settings | Working (schema v2, see PRD §7) |
| Multi-currency | Per-item currency, base currency + editable FX table (Settings → Currency & FX) |
| UI i18n (zh-TW / en / es / ja / ko) | Working — Inertia name fixed |
| Rhythm motion (metronome, live counter, spark playhead) | Working — Home + lock widget preview |
| Quiet-day math | `dailyPrincipal + dailyTdInterest + dailyPassivePace` |
| Persistence | `localStorage` key `inertia.v1`, `schemaVersion: 2` (schema-1 saves migrate automatically; raw copy kept in `inertia.v1.backup-schema1`) |
| Ad gate | Only on saving a new item or a changed amount / rate / currency, when not bought out |
| Buyout | Settings “Buyout unlock (mock)” |
| Quotes | `src/quotes.js` provider hook only (no UI button); prices are user-entered |
| Widget pages | Static **preview** (lock + home medium); **no ads** |
| Capacitor | Scaffold (`capacitor.config.json`); see Native steps |
| LLM | None |

## Screenshots (v0.3)

`docs/shots/v3-home.png`, `v3-housing.png`, `v3-stocks.png`, `v3-cash.png`, `v3-passive.png`,
`v3-sheet-{property,account,holding,cash,passive}.png`, `v3-fx.png`, `v3-home-en.png`, `v3-stocks-en.png`.
Emulator run: `validation/2026-09-27-v3/REPORT.md`.

Android: the app theme sets `windowBackground` to the app's paper colour (`@color/inertia_window_bg`),
so the display-cutout band in landscape is no longer white. Widget details: `docs/ANDROID_WIDGET.md`.

## Ad rule (locked)

- **NEVER** on widgets / widget preview.
- **NEVER** on mere browse of Home or bucket detail.
- **ONLY** when the user saves a new item, or saves a changed money amount / rate / currency.
- **NEVER** on opening a form, rename-only saves, reorder, delete, or FX-table / base-currency edits.
- If buyout is on, never show.
- Implementation: `src/adGate.js` → mock interstitial; Skip available immediately or after 1s.

## Capacitor next steps

```bash
npm run build
npx cap sync
npx cap add android   # Linux/Mac + Android SDK
npx cap add ios       # macOS + Xcode only
npx cap open android  # or ios
```

Details: [`docs/NATIVE_ROADMAP.md`](docs/NATIVE_ROADMAP.md) — WidgetKit, AdMob edit-only, IAP buyout, thin quote backend.

## Mock vs future

| Today (web) | Later (native / store) |
|-------------|-------------------------|
| Widget **preview** screens | Android App Widgets **done** ([`docs/ANDROID_WIDGET.md`](docs/ANDROID_WIDGET.md)) · iOS WidgetKit next |
| Buyout toggle in Settings | StoreKit / Play Billing one-time IAP |
| Mock interstitial in `adGate.js` | AdMob edit interstitial only |
| `fetchDelayedQuotes()` canned offline | Thin `GET /api/quotes?symbols=` delayed backend |
| localStorage | Same local-first; optional soft sync |
| Capacitor scaffold | Store builds |

## Key files

```
PRD.md                 Lean product + GTM + ad/architecture rules
README.md              This file
docs/NATIVE_ROADMAP.md Native / Capacitor roadmap
docs/rhythm-demo.gif   Motion proof (metronome + ticker + spark)
index.html
public/rhythm-demo.html Standalone auto-playing rhythm demo
vite.config.js
capacitor.config.json  Capacitor (webDir: dist, appId: app.inertia.wealth)
src/main.js            Screens, rhythm wiring, edit sheet, routing
src/styles.css         Design tokens + rhythm animations
src/math.js            derive(): net worth / quiet-day math in the base currency
src/portfolio.js       Schema v2 lists, normalizers, demo data, v1 → v2 migration, aggregate()
src/currency.js        FX table (base, rates, anchor), conversion, symbols
src/format.js          Money formatting in the display currency (萬 only for TWD)
src/assetUI.js         Category lists + item sheets (forms, validation)
src/store.js           localStorage load/save + seed + legacy migrate
src/adGate.js          Edit-only ad gate
src/quotes.js          Quote provider hook (no UI yet)
scripts/v3-shots.mjs   docs/shots/v3-*.png (npm run shots:v3, dev server on :5173)
scripts/make-rhythm-gif.mjs
```

## Design constraints

Light only · one accent · restrained borders · dense rows · no neon · no emoji chrome · no KPI card grid · explicit button states · realistic NT$ Taiwan amounts · anti–vibe-coding.

## Product decisions (do not reopen)

Free download · one-time buyout removes ads · fully local-first · user-entered quotes primary · ads edit-only · no LLM · categories: Housing / Stocks / Cash / Passive income (user-defined lists inside each) · English product name **Inertia** only (never translate in any locale).
