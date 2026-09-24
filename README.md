# Inertia — Web MVP

Taiwan household asset app · local-first · English UI · TWD.  
Tagline: **Your assets keep moving.**  
Design tokens from `/workspace/quiet-wealth-prototype/` (light `#F7F6F3`, accent `#2F5D4A`, dense rows).

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

## What’s in this build

| Area | Status |
|------|--------|
| App Home / 4 buckets / Edit / Settings | Working |
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

Free download · one-time buyout removes ads · fully local-first · user-entered quotes primary · ads edit-only · no LLM · buckets: Housing / TWSE / Cash / Passive income · English product name **Inertia** only.
