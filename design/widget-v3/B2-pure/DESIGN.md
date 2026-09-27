# Inertia widget v3 · B2 · Pure / 極簡原生

`index.html` has toggles for appearance (light / dark / tinted iOS 18 / clear iOS 26), the 5 privacy
modes, the home / lock / sheet / renderings views, and time speed (real, ×60, ×360).
`renders/` holds the 3× PNGs, MP4 and GIF. Regenerate them with
`node design/widget-v3/B2-pure/tools/render.mjs png|video`.
B-instrument is untouched. This direction replaces it.

## Concept

The widget should look like Apple made it: one number, one green, and one hairline. The hero is net
worth. Under it is the month's pace. At the bottom sits a 2pt line that fills across the day on its
own: the day passing, and with it the day's quiet growth. The mystery is small and real. Every 15
minutes the last digits of the net worth roll up by about NT$18 (`numericText`) without the app
running. The day line keeps creeping forward between entries, and 今日結算 counts down to midnight
second by second. The content sits at the top and bottom edges like Weather and Stocks do. The
middle is breathing room, not a leftover gap.

## Layout (pt; iPhone 16 Pro Max class, 430pt wide)

| Family | Size | Content (top → bottom) |
|---|---|---|
| systemSmall | 170×170 (158×158 on 393pt phones) | glyph + 淨資產 NT$ · hero **16,470,000** · +NT$51.6k 本月 · spacer · 今日 +1,577 ⟷ 1:52:40 (timer) · day line with 6/12/18h ticks |
| systemMedium | 364×170 (338×158) | left 1.35fr: same label, hero, pace · 0.5pt separator · right 1fr: 4 category rows (房產 12,380,000 / 股票 2,540,000 / 現金 1,550,000 / 被動 28,500/月) · full-width footer: 今日靜默成長 +NT$1,577 ⟷ 今日結算 1:52:40 · day line |
| accessoryRectangular | ≈172×76 | glyph Inertia 淨資產 · NT$16,470,000 · 今日 +1,577 ⟷ timer · day line |
| accessoryCircular | 76×76 | ① month capacity ring 90%, centre 本月 / 51.6k ② goal ring 換屋 / 82% |
| accessoryInline | one line | glyph 今日 +NT$1,577 (next to the system date) |

Padding: the system `contentMargins` (≈16pt). Corners: `ContainerRelativeShape`. The Inertia glyph
is a 12pt circle with a quarter arc in front of the label, standing in for a custom SF Symbol
(`.symbolRenderingMode(.hierarchical)`).

## Typography (SF Pro, system; the mock uses Inter as an OFL stand-in, CJK = PingFang TC / Noto Sans TC)

| Role | Spec |
|---|---|
| Hero, small / medium | `.system(size: 24 / 30, weight: .semibold)` `.monospacedDigit()`, tracking −0.6, `minimumScaleFactor(0.8)` |
| Hero, relative mode | 30 / 34pt (the string is short) |
| Label (淨資產) | 13pt semibold, `.secondary`, NT$ in `.tertiary` |
| Pace | 13pt semibold, accent; "本月" 13pt medium, secondary |
| Footer | 12pt semibold primary; keys 12pt medium secondary; timer `.monospacedDigit()` secondary |
| Category rows | label 13pt medium secondary; value 15pt semibold, `.monospacedDigit()`, unit 11pt |
| Lock rectangular hero | 20pt semibold (NT$ 13pt) |
| Circular centre | 17pt bold (13pt when > 4 chars); caption 10pt semibold |

## Colour and material

| Token | Light | Dark | Tinted (iOS 18, `.accented`) | Clear (iOS 26) |
|---|---|---|---|---|
| Background | `#FFFFFF → #F4F5F3` vertical, barely visible | `#232325 → #161618` | system tinted material | system glass |
| Primary | `#000000` | `#FFFFFF` | tint colour (full) | white |
| Secondary / tertiary | `rgba(60,60,67,.60 / .30)` (`.secondary`/`.tertiary`) | `rgba(235,235,245,.60 / .30)` | tint ~58% / 30% | white 66% / 36% |
| Track | `rgba(60,60,67,.12)` | `rgba(235,235,245,.14)` | tint 16% | white 22% |
| **Accent** (one) | `#2E7D5B` | `#5DC596` | = tint (`.widgetAccentable()`) | white |

The only colour is the green on the pace text and the day line. There's no red: negative days show
in `.secondary`. The only material is the system background (`containerBackground(for: .widget)`),
with a gradient of just 4% luminance. In tinted and clear modes the system drops the background.
Only the hero and the day line are marked `.widgetAccentable()`, so they take the full tint and
everything else renders at secondary opacity.

## Motion: what WidgetKit renders by itself

| Motion | Mechanism | Notes |
|---|---|---|
| **Net-worth / today number rolls up** | Timeline of 96 entries per day (every 15 min, `policy: .atEnd`). Growth is deterministic (mortgage principal, interest and dividend accrual per day), so one reload precomputes the whole day. `Text(nw, format: .number).contentTransition(.numericText(value: nw))` (iOS 17+). The system animates the change when each entry becomes current. Only the changed digits roll: 16,470,0**00** → 16,470,0**18**. | Entries don't count against the reload budget. The app calls `WidgetCenter.shared.reloadAllTimelines()` only when data changes. |
| **Day line fills continuously** | `ProgressView(timerInterval: startOfDay...endOfDay, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }` with `.progressViewStyle(.linear)` and `.tint(accent)` (iOS 16+). The system redraws it live, with no entries needed. | Risk: the system linear bar is about 4pt, and a custom `ProgressViewStyle` doesn't keep the timer-driven value. The 2pt hairline has to come from `.scaleEffect(y: 0.5)` or a clipped frame, which needs checking on device. The fallback is to accept the native thickness. |
| **今日結算 countdown** | `Text(endOfDay, style: .timer)` + `.monospacedDigit()` + fixed trailing frame | Ticks every second, system-driven. Must sit inside a fixed width so it doesn't jitter. |
| **Lock-screen line / timer** | Same two views in `accessoryRectangular` | Vibrant rendering handles the colour. |
| **Circular ring** | `Gauge(value:) {…} currentValueLabel: {…}` with `.gaugeStyle(.accessoryCircularCapacity)` | Changes per entry. |

No custom continuous animation anywhere. The MP4/GIF run at **×360** (1s = 6 min, labelled
"時間加速 ×360" in the frame), so four 15-minute entries land in 10s. At real speed the line moves
about 1pt every 7 minutes and a roll happens every 15 minutes.

## Privacy modes (`renders/privacy-sheet-*.png`)

| Mode | Hero | Pace / today | Medium right column | Lock screen |
|---|---|---|---|---|
| exact | 16,470,000 (NT$ in label) | +NT$51.6k · +1,577 | exact values | NT$16,470,000, ring 51.6k |
| rounded | 1,647 萬 | +5.2 萬 · 約 +1,600 (rolls only when the rounding changes) | 1,238 萬 … 2.9 萬/月 | 1,647 萬, ring 5 萬 |
| relative | +0.31% (label 本月淨值) | 本月進度 90% · +0.010% | shares 75.2 / 15.4 / 9.4%, passive — | +0.31%, ring 0.31% |
| rhythm-only | 靜默成長中 + 30-day capsule row | today label only; line and timer keep moving | 本月 27/30 + capsules + goal name | 靜默成長中; month ring shows 27; goal ring with no number |
| masked | •••••• | +NT$•••• | •••• | ••, goal ring empty |

The line and timer carry no amounts, so they keep running in every mode and the widget still feels
alive at zero disclosure. Also mark money views `.privacySensitive()`, so iOS shows placeholders on a
locked device when the user turns off "Allow access when locked".

## Build notes

- A WidgetKit extension (SwiftUI) in the Capacitor iOS project. The JS snapshot (display strings for
  all five modes, plus `perDay`, `monthFrac` and `goalPct`) is written to App Group `UserDefaults`
  through a small Capacitor plugin, mirroring the Android `InertiaWidget.update` plugin. Privacy stays
  in JS. Swift only extrapolates `nw + perDay × t` for exact/rounded, the same rule as Android's
  `snapshot.live`.
- `@Environment(\.widgetRenderingMode)` switches `.fullColor` / `.accented` / `.vibrant`.
  `@Environment(\.widgetFamily)` picks the layout.
- `supportedFamilies`: `.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular,
  .accessoryInline`. An App Intent configuration can offer the goal ring and the circular metric
  (month / goal / today).

## Effort and risk

- **Effort:** ~8–9 dev-days. Extension target + App Group + Capacitor bridge 2d. Five family views 2.5d.
  Privacy and rendering modes 1.5d. Timeline and formatter parity tests 1d. Device QA (Pro Max /
  393pt / lock / tinted / clear, Dynamic Type) 1.5d.
- **Risks:**
  - The hairline thickness of the timer `ProgressView`, see above.
  - The width of the `.timer` text in narrow slots.
  - `numericText` rolls only when the view identity is stable across entries, so keep the same view
    tree.
  - Very large Dynamic Type sizes need `minimumScaleFactor`.
  - iOS 16 lacks `numericText` and just swaps the number.
