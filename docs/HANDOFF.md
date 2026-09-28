# Inertia: engineering handoff

Last updated 2026-09-28 (Asia/Taipei). Current version is **0.4.1** (Android versionCode 6).
Read this first, then [`PRD.md`](../PRD.md) (product rules, data model §7, smooth accrual §7b),
[`docs/ANDROID_WIDGET.md`](ANDROID_WIDGET.md) (native widget) and the widget-v3 design specs
listed under "Next plan".

---

## 1. Product intent (why it exists)

- **Founding intent（初衷）:** long-term investors shouldn't feel anxious about short-term volatility.
  Everything the app shows is the smooth **month rhythm（月節奏）**: mortgage principal paydown +
  deposit interest + passive income, spread evenly per day (`quietDay`). There is no "today actual"
  mode, no daily market P&L on Home or widgets, and no countdowns.
- **Taiwan-first:** TWD base by default, zh-TW copy first, and 萬 rounding for TWD. The app also
  ships en / es / ja / ko. The product name **Inertia** is never translated.
- **Local-first:** all data stays in the device's `localStorage`. There are no accounts, no server
  and no LLM.
- **Widget-first:** the widget *is* the product; the app is for setup and depth.
- **iPhone users are the primary target.** Design should be clean, minimal and Apple-native (SF Pro /
  PingFang TC on device, restrained colour). Android has a working native widget today; iOS
  WidgetKit is the P0 next step.

## 2. Monetization rules (locked)

- Free download. A **one-time buyout（買斷）** removes ads. It is mocked today by a Settings
  toggle.
- **Ads never appear on widgets and never while browsing** Home, category lists or settings.
- An ad shows **only when the user saves a new item or a changed amount / rate / currency**.
  Opening a form, renaming, reordering, deleting, editing the FX table and changing the base
  currency never show ads. The gate is `src/adGate.js` (a mock interstitial) and the decision is
  `numbersChanged()` in `src/assetUI.js`.

## 3. Current state: features

| Area | State |
|---|---|
| 4 customizable categories（房產 / 股票 / 現金 / 被動收入） | Lists with add / edit / delete (two-tap confirm) / reorder. Stocks = brokerage accounts → holdings. Cash accounts are checking, savings or time deposit. Passive items can be monthly, quarterly, semiannual or yearly. |
| Multi-currency | Each item has its own currency. Base currency and a **user-editable FX table** are in Settings → 幣別與匯率. Defaults are dated 2026-09-27 and never fetched. A currency with no rate is excluded from totals and flagged. Base switches re-derive from the anchor table, so rates don't drift. |
| Month rhythm only（v0.3.1） | Net worth between edits = entered + quietDay × days since the last numeric edit, capped at 45 days, after which Home shows a note asking for an update. Home counters tick live. The 30-day line is a smooth trend. The "today actual" switch and the `todayActual` privacy field were removed and migrated. |
| Goals | Up to 3. Each aligns to net worth, housing, cash or monthly passive. One goal can be pinned to the widget. |
| Widget privacy | 5 display modes: exact / rounded（萬 for TWD, k/M otherwise）/ relative / rhythm / masked. Field toggles: net worth, month pace, the 4 category rows, goal. |
| In-app widget templates (legacy) | 6: paper, swiss, sumi, glass, noir, matrix. They drive the in-app previews and the Android widget theme. The widget-v3 styles below will replace them. |
| Native Android widget | 2×2 "Inertia · Small" and 4×2 "Inertia · Wide", resizable. Uses the privacy-formatted snapshot and extrapolates growth from the same anchor as the app. |
| i18n | zh-TW, en, es, ja, ko: 257 keys each, all in sync. |
| iOS | Not started (no Capacitor iOS platform yet). |

## 4. Architecture

- **Web app:** Vite 5 + vanilla JS (no framework), `src/main.js` renders HTML strings per route.
  Node 20.
- **Native shell:** Capacitor 6 (`capacitor.config.json`, appId `app.inertia.wealth`, webDir
  `dist`). Android only. minSdk 22, target/compile 34, Gradle 8.2.1.
- **Persistence:** `localStorage["inertia.v1"]`, `schemaVersion: 2`, plus a top-level `paceAnchorAt`.
  - Schema 1 (fixed buckets) → 2 (lists) migrates on load; the raw copy is kept once in
    `inertia.v1.backup-schema1`.
  - Retired settings (`honesty`, `todayActual`) are dropped and the save is rewritten once.
  - The legacy key `jingchang.v1` is also migrated.

### `src/` module map

| File | Role |
|---|---|
| `main.js` | Routes and screens (Home, category lists, Settings, widget previews), sheets, event binding, Home live rhythm loop |
| `store.js` | load / save / hydrate, schema and settings migrations, pace anchor |
| `portfolio.js` | Schema v2 lists, normalizers, demo data, `migrateAssetsV1`, `aggregate()` |
| `math.js` | `derive()`: quiet-day math (`quietDay` = principal + TD interest + passive per day) |
| `pace.js` | Smooth accrual: `withPace`, `paceDays` (45-day cap), `todaySoFar` |
| `currency.js` | FX table (base, rates, anchor), conversion, symbols |
| `format.js` | Money formatting in the display currency (萬 only for TWD) |
| `assetUI.js` | Category lists, item sheets, form validation, `numbersChanged` (ad rule) |
| `goals.js` | Goals (max 3), progress |
| `widgetPrivacy.js` | 5 privacy modes and field toggles, privacy-aware formatting |
| `widgetSnapshot.js` | Builds the **already-formatted** widget snapshot (v2) |
| `nativeWidget.js` | Capacitor bridge: pushes the snapshot to the `InertiaWidget` plugin (300 ms debounce; on start, persist, resume and pause) |
| `adGate.js` | Edit-only ad gate (mock) |
| `quotes.js` | Delayed-quote provider **hook only** (`setQuoteProvider`, `fetchDelayedQuotes`, `diffQuotes`); no UI |
| `i18n/*.js` | 5 locales; `index.js` handles detection and `t()` |

### Widget bridge (Android)

`widgetSnapshot.js` → `nativeWidget.js` → Capacitor plugin `InertiaWidget.update({snapshot})` →
`SharedPreferences("inertia_widget")` → `AppWidgetManager` → `WidgetRenderer` (RemoteViews).

- Java lives in `android/app/src/main/java/app/inertia/wealth/widget/`: `InertiaWidgetPlugin`,
  `InertiaWidgetProvider` (2×2), `InertiaWidgetMediumProvider` (4×2), `WidgetRenderer`,
  `WidgetFormat` (JS formatter parity), `WidgetBitmaps` (rhythm bar), `WidgetTheme`, `WidgetStore`.
- Privacy is applied in JS. Native code only extrapolates `live.base + live.perDay × days since
  live.at` (45-day cap) and reads the calendar for the month beat.
- An iOS extension should consume **the same snapshot JSON** through an App Group.

## 5. Build and test

```bash
npm install
npm run dev                 # http://127.0.0.1:5173
npm run build               # dist/
npm run test:unit           # node --test tests/
npx playwright install chromium   # first time
npm run test:e2e            # Playwright (starts Vite itself)
npm run shots:v3            # docs/shots/v3-*.png (needs the dev server on :5173)
npm run android:widget-shots  # HTML mock of the RemoteViews layouts → docs/shots + picker previews
```

**Android on Linux** (the build box runs Debian trixie):
- JDK: **Temurin 17** from the Adoptium apt repo (trixie has no openjdk-17).
- SDK: cmdline-tools in `~/android-sdk` with platform 34 and build-tools 34.0.0.
- `source scripts/android-env.sh` sets `JAVA_HOME`, `ANDROID_HOME` and `PATH`.
- Build and test:
  ```bash
  source scripts/android-env.sh
  npm run build && npx cap sync android
  cd android && ./gradlew assembleDebug :app:testDebugUnitTest
  # APK: android/app/build/outputs/apk/debug/app-debug.apk  (copied to dist-apk/, gitignored)
  ```
- **Gradle proxy workaround:** the build box's proxy returned flaky 404s from `dl.google.com`. The
  missing artifacts were pre-fetched with `curl` into `~/.m2`, and `~/.gradle/init.d/local-m2.gradle`
  adds `mavenLocal()` to buildscript, project and plugin repositories. A normal network doesn't need
  this.

**Emulator notes** (the box has no KVM, so the emulator runs on a Windows laptop):
- AVD `inertia34` (Pixel 7, API 34 google_apis x86_64, WHPX).
- adb is at `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`, driven from PowerShell 5.1 by a
  small step runner (`install`, `launch`, `tap x y`, `swipe`, `text`, `shot`, `leveldb`, `logcat`, …).
- Tap coordinates come from replaying the flow in Chromium at 411×838 CSS px @2.625 (WebView top at
  136 px).
- Native `<select>` dialogs need two rounds: open and screenshot, then tap the option.
- `run-as app.inertia.wealth` can read `app_webview/Default/Local Storage/leveldb/*.log` to check
  saved state.

## 6. Test status (2026-09-27, v0.3.1)

| Suite | Result |
|---|---|
| Unit (`npm run test:unit`) | **43 / 43**: snapshot builder, multi-currency snapshots, portfolio/migration/FX, pace/settings migration |
| E2E (`npm run test:e2e`) | **33 / 33**: user flows, native widget, asset categories, month rhythm (5, using the Playwright clock) |
| Gradle (`:app:testDebugUnitTest`) | **8 / 8**: `WidgetFormatTest` 7 (JS parity, anchored extrapolation), `ExampleUnitTest` 1 |
| Build | `npm run build` and `assembleDebug` pass; debug APK is ≈3.9 MB |

## 7. Validation reports (emulator)

- [`validation/2026-09-27/REPORT.md`](../validation/2026-09-27/REPORT.md): v0.2 goals, privacy
  modes, 2×2 / 4×2 widgets, the 4×2 resize fix. A screenshot selection is committed.
- [`validation/2026-09-27-v3/REPORT.md`](../validation/2026-09-27-v3/REPORT.md): v0.3.0 upgrade
  migration, multi-currency adds, USD base on the widget, picker labels, FX round-trip fix.
- [`validation/2026-09-27-v3b/REPORT.md`](../validation/2026-09-27-v3b/REPORT.md): v0.3.1 month
  rhythm only, settings migration, net worth growing only by the pace between opens.

## 8. Known issues and open items

- The in-app widget previews and the Android widget still use the **legacy 6 templates**. The 2×2
  layout has an empty band under the header; this is left to the widget-v3 implementation (P0).
- Ads, IAP buyout, icon/splash and release signing are **mocks or placeholders**. Only a debug APK
  exists.
- `DAYS_IN_MONTH` is a constant 30 for pace math. It is simple and smooth by design; document it if
  it changes.
- Re-anchoring on a numeric edit resets accrued growth to the typed values. This is intended, since
  typed values are the truth, but the number can visibly step to what the user typed.
- Accrual pauses after 45 days without an update, and Home shows a note.
- Holdings still show a cumulative gain versus cost basis (for example +60.7%) in the stocks list.
  That is long-term, not daily, and was kept.
- The widget privacy key `bucketTwse` keeps its old name for saved-state compatibility (its label is
  now Stocks / 股票).
- FX defaults are approximate (2026-09-27) and there is no auto-rate yet.
- The emulator test device has a 5 TWD drift from the pre-fix FX bug. Only that device is affected.
- Repo size: `design/widget-v3` adds about 118 MB of renders (PNG/GIF/MP4). Consider Git LFS before
  pushing to a shared remote.
- Native `<select>` dialogs aren't automated in emulator runs.

## 9. Next plan (priority order)

### P0: v0.4.0, implemented in the working tree (2026-09-28)

Web: `settings.widgetStyle` is `rhythm` | `editorial` | `sediment`. Legacy templates migrate on load (paper/swiss/glass → rhythm, sumi → sediment, noir/matrix → editorial) and `widgetTemplate` is dropped. The bottom tab「小工具」shows small + wide previews, the style picker, and privacy on one page. Widget settings and the old preview routes are gone. Explanatory paragraphs were removed from Home, lists, and Settings (5 languages). Snapshot `v` is 3 and includes `style` plus a monotone 12-point `trend`.

Android: 2×2 and 4×2 fill the cell (no top spacer). Rhythm / editorial / sediment palettes, month-beat and trend bitmaps, editorial numeral as a serif bitmap, sediment category column. Redraw period stays 30 min. versionCode 5.

iOS: WidgetKit sources and an XcodeGen project live in `native/ios-widget/` (the Capacitor `ios/` directory stays gitignored). `.github/workflows/ios-widget.yml` builds the simulator target with signing off. Not run from this Linux box.

Tests on 2026-09-28: unit 47/47, Playwright 32/32, Gradle `:app:testDebugUnitTest` and `assembleDebug` passed. On `inertia34`, both Inertia · Small (2×2) and Inertia · Wide (4×2) are on the home screen. All three styles and the five privacy modes were checked there (`validation/2026-09-28/`). The old debug signature did not match, so that device's previous save was reset to the demo portfolio.

### P0 spec (locked 2026-09-27)

**1. Three selectable widget styles.** These replace the 6 legacy templates everywhere: the in-app
preview, Android and iOS.

| Style id | Name（zh-TW） | Design spec |
|---|---|---|
| `rhythm` (default) | Month Rhythm Minimal（月節奏極簡） | [`design/widget-v3/B3-rhythm/DESIGN.md`](../design/widget-v3/B3-rhythm/DESIGN.md) |
| `editorial` | Editorial（編輯） | [`design/widget-v3/A-editorial/DESIGN.md`](../design/widget-v3/A-editorial/DESIGN.md) |
| `sediment` | Sediment（沉積） | [`design/widget-v3/C-sediment/DESIGN.md`](../design/widget-v3/C-sediment/DESIGN.md) |

- B-instrument and B2-pure are rejected. Keep them as reference only.
- Legacy template migration on load: paper / swiss / glass → `rhythm`; sumi → `sediment`;
  noir / matrix → `editorial`. Anything unknown → `rhythm`.
- All three styles keep the 5 privacy modes and the field toggles as their DESIGN.md defines them,
  and keep the dot-matrix month beat.
- Month rhythm and smooth trend only. No daily P&L, no countdowns.

**2. New bottom tab「小工具」(Widget).** Localized in all 5 languages.
- The tab shows the live widget preview inline on the same page (small + medium, optionally lock
  screen).
- The style picker sits on the same page: tap a style and the preview updates immediately.
- Below it sit the privacy settings: the 5 modes plus the field toggles.
- All widget settings move out of Settings, which keeps only non-widget items.
- There is **no separate preview window, sheet or modal**; the old preview routes are removed.

**3. Copy cleanup（精簡文案）.** Keep only essential information on every screen, in all 5
languages.
- Keep: numbers, category names, necessary field labels, errors, the ad/buyout essentials, and
  privacy mode names (at most one short line each).
- Remove: explanatory paragraphs, redundant labels, helper sentences, marketing-style lines and
  repeated hints.
- Before/after screenshots go in `docs/shots/v4-copy-{before,after}-*.png`.

**4. Android native widget: all 3 styles in 2×2 and 4×2, following the app setting.**
- Layouts must **fill the cell in a balanced, anchored way, with no empty band**. The old widget
  left a large empty area on top in both sizes.
- Reference cell sizes measured on a Pixel: ≈176×222 dp (2×2) and ≈368×222 dp (4×2).
- Use responsive `RemoteViews` size maps on API 31+ and size buckets below that.
- Render the dot matrix, trend line, grain and the Editorial serif numeral (bundled OFL Newsreader)
  as bitmaps, within the RemoteViews bitmap memory limit.
- Redraw every 30 min. Net worth keeps growing by the pace anchor (PRD §7b).

**5. iOS WidgetKit extension sources** for the same 3 styles, reading the shared snapshot from App
Group `group.app.inertia.wealth`.
- Add the Capacitor iOS platform if it can be done on Linux. Otherwise ship `ios/` Swift sources and
  a wiring README.
- Add a **GitHub Actions macOS workflow** that runs `xcodebuild` for the simulator without signing.
  It is committed but not pushed.

**6. Version 0.4.0 (versionCode 5).** Validate on the emulator: all 3 styles on the home screen
(2×2 + 4×2), each privacy mode for the default style, and the new Widget tab.

### P1: Capacitor iOS app shell + TestFlight
App icons and launch screen, bundle id, signing via CI secrets (App Store Connect API key),
TestFlight internal testing, and a pass on the web UI inside WKWebView (safe areas, keyboard,
`prefers-reduced-motion`).

### P1: store readiness
- Real icon and splash (Android adaptive icon, iOS asset catalog).
- Android release signing and an AAB.
- **IAP buyout:** StoreKit 2 and Play Billing, one-time non-consumable, with restore purchases.
  It replaces the mock toggle.
- **AdMob real ads** strictly under the ad rule: an interstitial only after saving a new item or a
  changed amount, never on widgets or browsing, and never after buyout. Add consent (UMP) for EU.
- Privacy policy: no account, on-device data, what the ad SDK collects.
- Store listing per [`docs/MARKETING_AUDIT.md`](MARKETING_AUDIT.md) (zh-TW first, month-rhythm
  positioning).

### P2
- Optional **delayed quote proxy** through the `src/quotes.js` hook. It never overwrites without
  user confirmation, and applying quotes counts as an edit (ad rule).
- **FX auto-rate opt-in**, which keeps the user table authoritative and shows its source and date.
- **An honest detailed chart one tap away** (not on Home or widgets): an entered-value history, with
  market values clearly labelled, for users who want depth without daily noise.

## 10. Decisions log

| Date (Asia/Taipei) | Decision |
|---|---|
| 2026-09-24 | Product locked: free download, one-time buyout removes ads, ads edit-only (never on widgets or browsing), fully local-first, user-entered values primary, no LLM, English name **Inertia** never translated. |
| 2026-09-24 | 5 UI languages (zh-TW, en, es, ja, ko). Selectable in-app widget templates (paper / swiss / sumi / glass / noir, then matrix). 5 widget privacy display modes. Playwright E2E. |
| 2026-09-27 | Simple goals, max 3, one pinned to the widget. |
| 2026-09-27 | Capacitor Android shell. Native Android widget 2×2 + 4×2 using a JS-formatted snapshot (privacy decided in JS only). |
| 2026-09-27 | 4×2 widget fix: raised `maxResizeWidth/Height` so Pixel Launcher respects `targetCellWidth=4`. |
| 2026-09-27 | Schema v2: 4 fixed categories with user-defined lists; per-item currency; base currency + user FX table (defaults never fetched; unknown rates excluded, never guessed); 萬 only for TWD; goal targets converted on base change; v1 migration keeps a raw backup; migrated holding = 1 share × old market value. |
| 2026-09-27 | Ad rule refined: an ad only on saving a new item or changed amount / rate / currency; the ad on opening Edit was removed. The delayed-quote button was removed in favour of the `quotes.js` hook. |
| 2026-09-27 | Distinct widget picker names ("Inertia · Small / Wide", localized). App window background matches the paper colour (fixes the white cutout band in landscape). |
| 2026-09-27 | FX base switches derive from an anchor table (exact round trips). |
| 2026-09-27 | **Month rhythm only** (v0.3.1): the today-actual switch and daily market P&L were removed from Home and widgets (and dropped from the data model). Net worth between edits grows only by the smooth pace from `paceAnchorAt` (45-day cap). App and widget share the anchor. No hidden advanced option was kept. |
| 2026-09-27 | **iPhone is the primary target**, with a clean, minimal, Apple-native design. Widget-v3 explored 5 directions. **Chosen: B3-rhythm (Month Rhythm Minimal), A-editorial, C-sediment.** B-instrument and B2-pure were rejected (reference only). Widget-v3 work is committed in `design/widget-v3/`. |
| 2026-09-27 | **v0.4.0 spec:** three selectable widget styles (Month Rhythm Minimal/B3 default, Editorial/A, Sediment/C). The 6 legacy templates are retired and migrated (paper/swiss/glass → rhythm, sumi → sediment, noir/matrix → editorial). |
| 2026-09-27 | New bottom tab「小工具」holds the live preview, style picker and privacy settings inline on one page. Widget settings move out of Settings, and the separate preview window is removed. |
| 2026-09-27 | Copy cleanup: only essential information on every screen, in all 5 languages, with no chatter（碎碎念）. |
| 2026-09-27 | Android widget layouts must fill the cell (no empty band), with responsive layouts on API 31+ and bitmaps for the matrix, trend, grain and serif numeral. iOS WidgetKit sources plus a macOS CI compile workflow. Version 0.4.0. |

## 11. Links

- Product: [`PRD.md`](../PRD.md) · [`README.md`](../README.md) · [`docs/MARKETING_AUDIT.md`](MARKETING_AUDIT.md)
- Native: [`docs/ANDROID_WIDGET.md`](ANDROID_WIDGET.md) · [`docs/NATIVE_ROADMAP.md`](NATIVE_ROADMAP.md) · [`docs/WIDGET_TEMPLATES.md`](WIDGET_TEMPLATES.md) (legacy templates)
- Design: `design/widget-v3/{B3-rhythm,A-editorial,C-sediment,B-instrument,B2-pure}/DESIGN.md`
- Screenshots: `docs/shots/v3-*.png` (app), `docs/shots/android-widget-*.png` (widget mock)
