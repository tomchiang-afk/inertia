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
```

Config: `playwright.config.ts` — `baseURL` `http://127.0.0.1:5173`, `webServer: npm run dev` with `reuseExistingServer`. Tests live in `e2e/`.

**Add Firefox / WebKit:** in `playwright.config.ts` projects, uncomment/add Desktop Firefox and Desktop Safari device entries, then `npx playwright install firefox webkit`.

## What’s in this build

| Area | Status |
|------|--------|
| App Home / 4 buckets / Edit / Settings | Working |
| UI i18n (zh-TW / en / es / ja / ko) | Working — Inertia name fixed |
| Rhythm motion (metronome, live counter, spark playhead) | Working — Home + lock widget preview |
| Quiet-day math | `dailyPrincipal + dailyTdInterest + dailyPassivePace` |
| Persistence | `localStorage` key `inertia.v1` (migrates from `jingchang.v1`) |
| Ad gate | **Edit only** — open Edit or Save when not bought out |
| Buyout | Settings “Buyout unlock (mock)” |
| Quotes | `src/quotes.js` mock delayed prices |
| Widget pages | Static **preview** (lock + home medium); **no ads** |
| Capacitor | Scaffold (`capacitor.config.json`); see Native steps |
| LLM | None |

## Ad rule (locked)

- **NEVER** on widgets / widget preview.
- **NEVER** on mere browse of Home or bucket detail.
- **ONLY** when user taps Edit or Save (and delayed-quote confirm → save).
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
| Widget **preview** screens | iOS WidgetKit / Android App Widgets |
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
src/math.js            Quiet-day / net worth / TWD format
src/store.js           localStorage load/save + seed + legacy migrate
src/adGate.js          Edit-only ad gate
src/quotes.js          Delayed quotes stub
scripts/make-rhythm-gif.mjs
```

## Design constraints

Light only · one accent · restrained borders · dense rows · no neon · no emoji chrome · no KPI card grid · explicit button states · realistic NT$ Taiwan amounts · anti–vibe-coding.

## Product decisions (do not reopen)

Free download · one-time buyout removes ads · fully local-first · user-entered quotes primary · ads edit-only · no LLM · buckets: Housing / TWSE / Cash / Passive income · English product name **Inertia** only (never translate in any locale).
