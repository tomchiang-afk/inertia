# Inertia Android home-screen widget

Native `AppWidget` for the Capacitor Android shell (`app.inertia.wealth`). Always ad-free.

## Data flow

```
localStorage inertia.v1 ─▶ src/widgetSnapshot.js  (derive + widgetPrivacy.js → display strings)
                         ─▶ src/nativeWidget.js    (Capacitor.isNativePlatform guard, 300 ms debounce)
                         ─▶ InertiaWidget.update({ snapshot })            [local Capacitor plugin]
                         ─▶ SharedPreferences "inertia_widget"/"snapshot"  (WidgetStore)
                         ─▶ AppWidgetManager.updateAppWidget → WidgetRenderer (RemoteViews)
```

- Pushed on app start, on every `persist()` (asset edits, goals, privacy mode / field toggles,
  template, locale), and on the app's `resume` / `pause` events.
- Privacy is applied **in JS**. The snapshot holds only display strings. Native code does no
  finance logic, with two small exceptions:
  - **Live quiet growth** (`snapshot.live`, exact / rounded modes only, where the absolute value
    is already visible): `base + perDay × days since snapshot`, capped at 45 days, then formatted
    with `WidgetFormat` using `live.prefix` (the base-currency symbol) and `live.format`
    (`exact`, or `wan` for a TWD base / `round` k/M/B for other bases in rounded mode). Mirrors
    `fmtMoney` / `fmtRounded`, JVM unit-tested. Since v0.3.1 `live.base` / `live.at` are the
    smooth-rhythm **anchor** (net worth as entered, and when), not the push time, so the widget and
    the app's Home (`src/pace.js`) compute the same number and re-pushing never makes it jump.
    There is no market P&L in the snapshot and no "today actual" privacy field any more.
  - **Calendar**: the rhythm bar and the relative-mode "本月進度 N%" use today's date on the device.
- `updatePeriodMillis = 30 min` redraws the widget (extrapolation + calendar); the "更新 HH:mm" label
  always shows when the app last pushed a snapshot (`M/d HH:mm` if not today).

## Snapshot v2 (schema 2 assets)

`buildWidgetSnapshot` emits `version: 2` with a `currency: { code, symbol }` block. All amounts are
already converted to the **base currency** chosen in Settings → Currency & FX (items whose currency
has no rate are left out, same as the app's totals). Buckets: `housing`, `stocks` (label
`widget.stocks`: 股票 / Stocks / 株式 / 주식 / Acciones, formerly 台股), `cash`, `passive`. The privacy
field key stays `bucketTwse` so saved toggles keep working; its label is now "Stocks bucket".
Older native builds ignore the extra fields.

## Privacy modes

Examples below use a TWD base. With another base the symbol follows (`US$745,566`, `€…`), and
rounded mode uses k/M/B (`US$746k`) because 萬 only makes sense for TWD.

| Mode | Net worth | Month pace | Goal strip | Buckets (4×2) | Live growth |
| --- | --- | --- | --- | --- | --- |
| exact | `NT$16,470,000` (compact `NT$16M` only on API < 26) | `+NT$51.6k` | `name · 82% · NT$16M` + bar | compact NT$ | yes |
| rounded | `NT$1,647 萬` | `+NT$5 萬` | `name · 82% · NT$1,647 萬` + bar | 萬 | yes (萬) |
| relative | `本月進度 90%` | `+0.31%` | `name · 82%` + bar | share % (passive hidden) | no |
| rhythm | hidden, label becomes 本月節奏 | hidden | name + bar only | hidden | no |
| masked | `NT$••••••` | `+••••` | `name · ••••`, empty bar | `NT$••••••` | no |

Field toggles: `netWorth`, `monthPace` (also hides the rhythm bar unless mode is rhythm),
`goalProgress`, and `bucket*` all drop their row. The goal strip only shows when a goal has
`onWidget` set.

## Sizes

Two picker entries, both resizable (`horizontal|vertical`). They used to share the label
"Inertia", which is ambiguous in the picker. They now use `@string/widget_label_small` /
`widget_label_medium`: en "Inertia · Small" / "Inertia · Wide", zh-TW/zh "Inertia · 小" / "Inertia · 寬",
ja "Inertia · 小" / "Inertia · ワイド", ko "Inertia · 소형" / "Inertia · 와이드", es "Inertia · Pequeño" /
"Inertia · Ancho" (verified in the Pixel launcher picker, `validation/2026-09-27-v3/28-picker-search.png`):

- `InertiaWidgetProvider`: 2×2 default (`minWidth/Height 110dp`, `targetCell 2×2`)
- `InertiaWidgetMediumProvider`: 4×2 default (`minWidth 250dp`, `targetCell 4×2`)

`maxResizeWidth/Height` are deliberately large (1200dp / 800dp). Launcher3 derives the max span
from the landscape cell size too and drops `targetCellWidth` if it's above that max, so a tight
value (540dp) made the 4×2 entry land as 3×2 on a Pixel 7.

Layout picked by width: < 220dp → `widget_small.xml`, ≥ 220dp → `widget_medium.xml`
(adds the bucket column). Android 12+ gets a responsive `RemoteViews(Map<SizeF, RemoteViews>)`
built from `OPTION_APPWIDGET_SIZES`. Older versions use portrait min-width / max-height from the
widget options. The goal strip hides when the widget is too short (< ~130dp).

## Templates

The in-app template follows through (`WidgetTheme`, `drawable/widget_bg_*.xml`):
paper (default, warm light), swiss (hairline border + 3dp crimson rule, square bars),
sumi (sage paper, ink dots), glass (translucent white, dots), noir (the one dark option, LED dots),
matrix (white with a dark 1.5dp frame, 4-block scan bar). One accent per template. Matrix keeps
the system font (RemoteViews can't switch typefaces at runtime).

## Screenshots

`npm run android:widget-shots` renders `tools/android-widget-mock.html` (an HTML mirror of the
RemoteViews layouts, fed by the real snapshot builder) to `docs/shots/android-widget-*.png` and to the
picker previews `res/drawable-nodpi/widget_preview_{small,medium}.png`.

## Tests

- `npm run test:unit`: node:test for the snapshot builder, covering every privacy mode, field toggles,
  templates and locale.
- `npm run test:e2e`: includes `e2e/native-widget.spec.ts`, which drives Settings → privacy mode, then
  builds the snapshot from saved state, plus the mock layout.
- `cd android && ./gradlew :app:testDebugUnitTest`: `WidgetFormatTest` checks JS/Java formatter parity.

## Limitations

- Home screen only. Stock Android phones have no lock-screen widgets (the `keyguard` category only
  works on Android 4.2–4.4 and some tablets/OEMs).
- Emulator validation (API 34, Pixel 7 AVD) is in `validation/2026-09-27/` (v0.2) and
  `validation/2026-09-27-v3/` (v0.3: upgrade migration, multi-currency adds, USD base on the widget,
  picker labels, landscape).
- The widget only changes when the app pushes a snapshot. Prices and FX are user-entered; nothing
  is fetched in the background (`src/quotes.js` is only a provider hook).
- The 2×2 layout's empty band between header and net worth is left to the widget visual
  redesign (`design/widget-v3/`).
- iOS WidgetKit is not done yet.
