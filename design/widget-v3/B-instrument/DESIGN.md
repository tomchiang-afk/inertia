# Inertia widget v3 · Direction B · Instrument / 儀表

`index.html` (open it directly: theme / privacy / sheet toggles; motion runs as it would on device) ·
`renders/` (3× PNGs, MP4, GIF) · `tools/render.mjs` (Playwright renderer: `node design/widget-v3/B-instrument/tools/render.mjs png|video dark`) · `fonts/` (OFL).

## Concept

The widget is a small household chronometer. One dial carries everything that grows on its own.
The outer chapter ring is a tachymeter-style scale engraved in **today's quiet growth** (NT$), and a
**floating index**, a hand with no visible arbor like a mystery clock, creeps along it all day. It
isn't animated by the app. It's the AnalogClock hour hand: growth accrues linearly through the day,
so the time-of-day angle *is* the reading. Inside that ring, a lacquered accent arc shows month
progress (with 30 day notches) and a thin steel arc shows the goal. A single bead on the rim steps
once per second, like an escapement. Below the reading, a small date-window aperture turns over every
six seconds to show where this month's growth came from (房貸還本 → 存款利息 → 股息).
The rhythm comes from the mechanism itself: a slow beat, a hand you never catch moving, and a
window that changes when you look away.

## What's wrong with the current widget

- **Dead space:** the 2×2 spends its top ~35% on the word "Inertia" and a timestamp. The 4×2 leaves
  a blank band above the number and a half-empty rhythm strip. Area isn't tied to information.
- **No material:** a flat off-white card with system Roboto could belong to any finance app. There's
  no surface, no engraving, no depth, nothing that says "made object".
- **The rhythm doesn't read as rhythm:** a static row of bars that only changes every 30 minutes, so
  it never moves while you're looking. Nothing on the widget is live.
- **No hierarchy of time:** today, this month and the goal are three unrelated strips. Nothing ties
  them to a single clock, which is the actual story (money accrues with time).
- **Typography:** one weight and one family, proportional digits, bucket values right-aligned in
  "NT$13M" shorthand. It's dense in the wrong places and vague where precision matters.

## Layout

| | 2×2 (≈180×190dp) | 4×2 (≈380×190dp) |
|---|---|---|
| Dial | Ø171dp (k = 0.955), centred at (90, 98) | Ø171dp, centred at (95, 95) |
| Dial centre | 淨資產 · NT$16,470,000 · 本月 +NT$51.6k · aperture | 今日靜默成長 +1,577 (NT$ · 22:00) · aperture |
| Corners / panel | TL wordmark, TR 更新 20:13, BL 今日 +1,577, BR 換屋 82% | right panel: wordmark + 更新, net worth 27sp, pace + 月 90% · 27/30, 30-day month ruler, 4 category registers (label, sub-label, tabular value, share hairline; passive gets a 12-month tick row), goal line with vernier ticks |

Dial rings, from outside in (designed at R = 86dp):
rim escapement track (60 ticks, r 80–84) → growth scale (r 71–78.6, minor every NT$20, major every
100, label every 200, Barlow Condensed 6.6sp, labels rotate to stay upright) → month arc
(r 57, 2.2dp, accent, day notches) → goal arc (r 52.4, 1.1dp, steel, diamond end marker) → centre.
The scale is non-uniform like a real tachymeter. For NT$1,720/day the PM face reads 860 → 1,720,
with labels at 1,000 / 1,200 / 1,400 / 1,600.

Cell sizes: I took 180×190 / 380×190dp from the brief and the existing `docs/shots` mock (Pixel 7
is 412×915dp, 4-column grid, ≈103dp pitch). The launcher reports the real size through
`OPTION_APPWIDGET_SIZES`, and the renderer must lay out from that. I didn't measure these on a device.

## Typography (all OFL, Google Fonts)

| Role | Font | Size |
|---|---|---|
| Net worth (4×2 / 2×2) | Barlow Semi Condensed Medium, tabular | 27sp / 18sp |
| Today's growth (dial centre 4×2) | Barlow Semi Condensed Medium | 19sp, accent |
| Category values | Barlow Semi Condensed Medium | 11.5sp |
| Pace, corner values | Barlow Semi Condensed Medium | 8–9.5sp |
| Engraved scale numerals, NT$ unit | Barlow Condensed Medium | 6.6sp / 6.6–9sp, +0.6–1 tracking |
| zh-TW labels | Noto Sans TC Regular | 7–7.4sp (+0.8–1.2 tracking); sub-labels 5.6sp |
| Wordmark "Inertia" | Instrument Serif Italic | 13sp (2×2) / 15sp (4×2) |

Every glyph is painted into the bitmap with bundled `res/font` files. That's what makes the micro
sizes and tracking possible (RemoteViews TextView can't switch typeface at runtime; see ANDROID_WIDGET.md).
Minimum text is 5.6sp for sub-labels, which is engraving scale and deliberately secondary. The
information you actually read is 7sp and up.

## Colour: one accent

| Token | Dark · lacquer dial | Light · porcelain dial |
|---|---|---|
| Case (brushed) | `#202327 → #121416`, 1px horizontal brushing α 0.014 / 0.03 | `#EBE7DF → #D6D0C5`, brushing α 0.12 |
| Dial | `#121417 → #090A0C` + sunburst (conic 0.45°/1.2°, α 0.028) + top-left sheen | `#F8F5EE → #ECE6DB` enamel + sheen |
| Ink / ink-2 / ink-3 | `#ECE6D8` / `#A29E94` / `#6B6861` | `#17191B` / `#5F5B53` / `#8F897E` |
| Hairline | `rgba(236,230,216,.16)` | `rgba(23,25,27,.16)` |
| **Accent** (index, month arc, growth values) | `#9CC3A8` sage lume | `#2F5D4A` Inertia green (same as app `--accent`) |
| Accent track | `rgba(156,195,168,.22)` | `rgba(47,93,74,.18)` |

No borders. The dial edge is a 0.6dp bevel plus a 2.2dp seat shadow, which reads as material. A fine
fractal grain (soft-light, α 0.35) sits over both. Gains stay green; there's no red anywhere.

## Motion: every piece is native RemoteViews

| Motion | What you see | Android mechanism |
|---|---|---|
| **Escapement bead** | A bead on the rim steps once per second, one lap per minute | `AnalogClock` inside the widget layout, `android:hand_second` = vector drawable that's transparent except a Ø3.1dp bead at r 82.6. Hour/minute hands set as below. Ticks live in the launcher (API 31+). On API < 31 there's no second hand, so the bead is simply absent. |
| **Floating growth index** | The accent lance creeps round the growth scale all day. You never see it move, but it's always somewhere new | Same `AnalogClock`, `android:hand_hour` = vector that paints only the lance (r 60–79.4) with no hub. `hand_minute` = transparent drawable. Works on every API level. From API 31 hands and dial can also be swapped at runtime with `RemoteViews.setIcon(id, "setHourHand", Icon)`. |
| **Scale swap at 12:00 / 00:00** | The engraved scale switches AM (0→½·day) to PM (½·day→day) | The dial bitmap is re-rendered by periodic work and additionally by a one-shot `AlarmManager.setWindow(RTC, 12:00/00:00, 5 min)` (no exact-alarm permission needed). Worst case, the scale lags by a few minutes. |
| **Aperture (date window)** | Every 6s the window rolls up to the next growth source: 房貸還本 +NT$32.4k → 存款利息 +NT$2.1k → 股息 +NT$17.1k | `ViewFlipper` `android:autoStart="true"` `android:flipInterval="6000"`, `inAnimation` = translateY 100%→0 + alpha 0→1, `outAnimation` = 0→-100% + alpha 1→0, 600ms, `@android:interpolator/decelerate_quad`. Children are 3 `ImageView`s with small pre-rendered bitmaps (keeps the fonts). The launcher pauses it when the widget isn't visible. |
| **Month arc / today value / ruler** | The arc advances, and "+1,577 · 22:00" refreshes | Bitmap re-render every 30 min (`updatePeriodMillis` / WorkManager) and on every app `persist()`, same pipeline as today. |
| **Reveal on update** (optional, not in mock) | When new data arrives, the face crossfades rather than snapping | Face `ImageView`s live in a 2-child `ViewFlipper` (no autoStart). Put the new bitmap in the hidden child, then `RemoteViews.showNext()` with 450ms fade in/out. |

There's no continuous app-driven animation anywhere. The mock's JS mirrors exactly the three native
behaviours (1Hz step with no easing, continuous hour-hand angle, flipper 6000/600ms decelerate).
The MP4/GIF are rendered frame-by-frame from that same code at true speed. That's why the index
visibly moves only a fraction of a degree in 10s, which is the point.

## Privacy modes (see `renders/privacy-sheet-*.png`)

| Mode | Centre / net worth | Growth scale on dial | Aperture | 4×2 panel |
|---|---|---|---|---|
| **exact** | NT$16,470,000 · 本月 +NT$51.6k | NT$ labels 1,000…1,600 | +NT$32.4k etc. | exact values, share hairlines |
| **rounded** | 1,647 萬 · +NT$5.2 萬 | labels 1.0k…1.6k | +3.2 萬 | 1,238 萬 / 254 萬 / 155 萬 / 2.9 萬/月; today 約 +1,600 |
| **relative** | 本月進度 90% · 淨值 +0.31% | scale becomes % of the day (60%…90%) | share of month's growth (63%) | shares 75.2 / 15.4 / 9.4%, passive "—" |
| **rhythm-only** | 本月節奏 · 27 / 30 · 持續中 | unlabeled uniform ticks | source names only | "第 27 日 / 30", categories replaced by a 30-day beat band (no amounts, no shares); goal ring only |
| **masked** | NT$•••••• · +•••• | labels "••" | +•••• | NT$••••••, goal ring and bar empty, ••% |

In every mode the index and bead keep moving, so the widget stays alive even with zero numbers.

## Android build notes

- **Layout:** `FrameLayout` root → `ImageView` (full-widget face bitmap: case, dial, all text) → a
  square `FrameLayout` exactly over the dial holding `AnalogClock` (transparent `android:dial` with
  intrinsic size = dial size, so all hands scale together) and the aperture `ViewFlipper` (margins in dp).
  Use Android 12 responsive `RemoteViews(Map<SizeF, RemoteViews>)` for 2×2 / 4×2 (+ a 4×1 strip: dial
  shrunk to a sub-dial at the left, net worth + pace to the right).
- **Bitmap size:** a 4×2 face at 2.625× is ≈998×499 px ≈ 2 MB ARGB. That's over the ~1 MB binder
  budget if sent with `setImageViewBitmap`. Write a PNG to app storage and use `setImageViewUri` through a
  read-only `FileProvider` with `grantUriPermission` to the launcher package, or split the face into
  dial + panel bitmaps. The 2×2 (≈473×499 px) fits either way.
- **Renderer:** port `dialSVG()` / `widget2x2()` / `widget4x2()` to a Kotlin `Canvas` renderer (arcs,
  ticks and rotated text are all plain Canvas calls). Privacy strings keep coming from the JS
  snapshot (`widgetPrivacy.js`). Native code only needs `perDay`, `monthFrac` and the goal fraction.

## Effort and risk (honest)

- **Effort:** ~8–10 dev-days. Kotlin face renderer + fonts 3–4 d. Layouts, AnalogClock overlay and
  flipper 2 d. Privacy parity + JVM/snapshot tests 1–2 d. Device QA (Pixel 7, Samsung One UI, small
  4×1) 2 d.
- **Medium risk: AnalogClock hand scaling and alignment.** AnalogClock sizes hands from the dial
  drawable's intrinsic size and centres them in the view. The overlay square must match the bitmap's
  dial centre within ~0.5dp or the index will float off-scale. It needs on-device checks across
  resize steps. The fallback is to render the dial slightly smaller than the clock view.
- **Medium risk: second-hand behaviour in launchers.** It's documented (`hand_second`, API 31+) and
  used by Google's own clock widgets, but OEM launchers may throttle it. Offer a settings toggle
  (擒縱秒珠) and accept silent absence below API 31.
- **Low risk:** ViewFlipper autoStart is long-standing RemoteViews behaviour. Bitmap-painted text
  loses system font scaling. Mitigate by reading `fontScale` and re-rendering, and by putting a full
  `contentDescription` on the root for TalkBack.
- **Design risk:** 5.6–6.6sp engravings are at the limit on a 420dpi screen. They're meant to be
  texture, and nothing critical lives only there. The primary values (7sp+) all appear in plain type.
