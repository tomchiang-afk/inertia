# Inertia widget v3 · B3 · Rhythm / 節奏

`index.html` has toggles for appearance (light / dark / tinted iOS 18 / clear iOS 26), the 5 privacy
modes, the home / lock / sheet / renderings views, and time speed (real, ×360, ×1440).
`renders/` holds the 3× PNGs, MP4 and GIF. Regenerate them with
`node design/widget-v3/B3-rhythm/tools/render.mjs png|video`.
B-instrument and B2-pure are unchanged.

## Why B3 (what changed from B2)

Inertia exists so long-term investors stop reacting to short-term volatility. B2 broke that:
"今日 +1,577" and the countdown to midnight trained the eye on today. B3 removes **today's P&L,
countdown timers and daily market moves entirely**. It keeps only things that move smoothly and in
one direction:

1. **Month rhythm** (hero): +NT$51.6k 本月. This is mortgage principal + deposit interest + passive
   income, spread evenly per day (NT$1,720/day).
2. **The dot beat:** the Home LED dot matrix, reduced to its meaning. One dot per day of the month.
   Past days are solid, future days are a faint track, and today's dot brightens through the day and
   breathes on each timeline entry. Every day is the same size because the pace is even. That is the
   calm, honest message.
3. **Net worth:** a quiet secondary line that rolls up smoothly each entry (+NT$36 per 30 min,
   extrapolated from the even pace, never from market prices).
4. **Smooth long-term trend:** 12 months of month-end net worth, smoothed and drawn as a monotone
   curve that only climbs.

## Layout (pt; 430pt-wide iPhone, Pro Max class)

| Family | Size | Content |
|---|---|---|
| systemSmall | 170×170 (158 on 393pt phones) | ••• 本月節奏 · 9月 / hero **+NT$51.6k** (25pt, accent) / 淨資產 16,470,000 (12pt, rolls) / spacer / **10×3 dot matrix** (30 days, Ø8pt, gaps 5.3 × 5pt), anchored to the bottom |
| systemMedium | 364×170 (338×158) | left: 本月節奏 / **+NT$51.6k** 30pt / 房貸還本 · 存款利息 · 被動收入 (11pt) / 淨資產 NT$16,470,000 (rolls). Right (150pt): 近 12 個月 · +8.4%, monotone trend 150×62 with a soft area fill (16% → 0), end dot, 10月 … 9月. Bottom full width: **30-dot row** (Ø7pt, 4.2pt gap) |
| accessoryRectangular | ≈172×76 | ••• 本月節奏 / +NT$51.6k 21pt / 30-dot row (Ø3.8pt) |
| accessoryCircular ① | 76×76 | **dot ring**: 30 dots round the rim (one per day, starting at 12 o'clock); centre 本月 / 51.6k |
| accessoryCircular ② | 76×76 | 12-month monotone trend glyph + "12 個月" |
| accessoryInline | 1 line | ••• 本月 +NT$51.6k |

The Inertia glyph is three dots with the last one dim (the beat), standing in for a custom SF Symbol.
Padding comes from the system `contentMargins`, and corners from `ContainerRelativeShape`.

## Typography (SF Pro, system. The mock uses Inter as an OFL stand-in; CJK = PingFang TC / Noto Sans TC)

| Role | Spec |
|---|---|
| Hero pace | `.system(size: 25 small / 30 medium / 21 lock, weight: .semibold)` `.monospacedDigit()`, tracking −0.6, accent |
| Label 本月節奏 | 13pt semibold, `.secondary` |
| Net-worth line | 12pt: label medium `.secondary`, value semibold `.primary`, `.monospacedDigit()` |
| Source line / trend captions | 11pt medium `.tertiary`; month ticks 10pt |
| Circular centre | 16pt bold (13pt when > 4 chars), caption 10pt semibold |

## Colour and material

Same system as B2. Light `#FFFFFF → #F4F5F3`, dark `#232325 → #161618`, system label colours. The
**one accent** is `#2E7D5B` (light) / `#5DC596` (dark), used for the hero, lit dots and the trend.
Track: `rgba(60,60,67,.12)` light / `rgba(235,235,245,.14)` dark. There's no red anywhere and no
up/down arrows. In tinted and clear modes, the hero, dots and trend are `.widgetAccentable()` and
everything else goes to secondary. On the lock screen, vibrant rendering turns the dots white, with
future days at 24%.

## Motion: WidgetKit only, no custom continuous animation

| Motion | Mechanism |
|---|---|
| **Net worth rolls up** | Timeline of 48 entries per day (every 30 min, `policy: .atEnd`), precomputed in one reload: `nw(t) = nw₀ + perDay × Δt`. `Text(nw, format: .number).contentTransition(.numericText(value: nw))` (iOS 17+). Only the last digits roll (…1**07** → …1**43**). Rounded mode rolls only when the 萬 value changes. |
| **Today's dot advances** | Each entry carries `dayFraction`. Today's dot fill = `accent.opacity(0.28 + 0.72 × fraction)`, animated between entries with `.animation(.easeInOut(duration: 1.2), value: entry.date)` (WWDC23 widget animations). |
| **Today's dot breathes** | Entries alternate `breath = index % 2`, so the halo goes 4pt → 1.2pt → 4pt (a `Circle().stroke` at 22% accent, scaled). The 1.2s transition makes one slow inhale or exhale per entry: a 60-minute breath in real time. |
| **Next day lights** | The 00:00 entry moves `today` to the next dot. Yesterday's settles to solid and the new one fades in (`.transition(.scale(0.6).combined(with: .opacity))`). This is the only "event" of the day. |
| **Trend** | Swift Charts `LineMark` + `AreaMark`, `.interpolationMethod(.monotone)`, `.chartXAxis(.hidden)`, `.chartYAxis(.hidden)`, end `PointMark`. The data is month-end values after a 3-month moving average, then clamped so it never goes down. It's static between reloads and redrawn by the app's daily reload. |
| Not used, on purpose | `Text(.timer)`, `Text(.relative)`, `ProgressView(timerInterval:)`, market-price refresh. Nothing ticks by the second, and nothing counts down. |

The MP4/GIF run at **×1440** (1s = 24 min, labelled "時間加速 ×1440" in the frame). Between 22:07
and 02:07 you see the net worth roll on each entry and today's dot brighten and breathe. At ≈4.7s,
midnight moves the beat to day 28. At real speed a roll happens every 30 minutes, which you'd barely
notice unless you look for it.

## Privacy modes (`renders/privacy-sheet-*.png`)

| Mode | Hero | Net-worth line | Trend | Lock |
|---|---|---|---|---|
| exact | +NT$51.6k | 淨資產 16,470,000 (rolls) | caption +8.4% | ring 51.6k, rect +NT$51.6k |
| rounded | +5.2 萬 | 1,647 萬 | caption +127 萬 | 5 萬 |
| relative | +0.31% | 近 12 個月 +8.4% | caption +8.4% | 0.31% |
| rhythm-only | 穩定前進 | 第 27 天 · 共 30 天 | shape only, no caption number | ring centre = 27 (day), rect 穩定前進 |
| masked | +NT$•••• | 淨資產 •••••• | shape only | ••, today's dot neutral grey |

The dots and the trend shape carry no amounts, so the beat keeps running in every mode. If masked
should hide even the shape, flatten the trend to a straight line (one flag). Mark money views
`.privacySensitive()` so a locked device shows placeholders.

## Build notes

- WidgetKit extension + App Group `UserDefaults`, fed by a small Capacitor plugin (the iOS twin of
  `InertiaWidget.update`). The JS snapshot provides display strings for every mode, plus `perDay`,
  `daysInMonth`, `trend[12]` (already smoothed and monotone, computed in JS) and the goal. Swift only
  extrapolates `nw` for exact/rounded, the same rule as Android's `snapshot.live`.
- `supportedFamilies`: systemSmall, systemMedium, accessoryCircular (dot ring / trend, chosen with an
  App Intent), accessoryRectangular, accessoryInline. `@Environment(\.widgetRenderingMode)` handles
  fullColor / accented / vibrant.
- Dot matrix: a `Grid` of 30 `Circle()`s (small: 10×3, medium: 1×30). The lock ring is 30 circles
  placed with `.offset` + `.rotationEffect`, or a `Canvas`.

## Effort and risk

- **Effort:** ~8 dev-days. Extension + App Group + Capacitor bridge 2d. Five families + dot views
  2.5d. Charts trend + smoothing parity with the app 1d. Privacy and rendering modes 1d. Device QA
  (sizes, lock, tinted, clear, Dynamic Type) 1.5d.
- **Risks:**
  - Widget animations can be dropped when the system is under pressure or Low Power Mode is on.
    The static state is still complete, so nothing is lost.
  - The breath depends on stable view identity across entries (`.id` per dot).
  - Timeline length is 48 entries per day. That's fine, but reload once a day after 00:00
    (`.after(midnight)`) so month rollover and trend refresh happen.
  - iOS 16 lock screen: no numericText and no animations. The number and dots just swap.
