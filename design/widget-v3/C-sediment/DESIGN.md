# Inertia widget v3 · Direction C · Sediment / 沉積 (iOS first)

> Revision 3, 2026-09-27. It follows two corrections from the user:
> (1) The product targets iPhone, so it has to feel clean, minimal and Apple-native. The texture stays very quiet.
> (2) The app's founding intent is to stop long-term investors from worrying about short-term volatility.
>     So the widget centers on the **month rhythm (月節奏)**: mortgage principal + TD interest + passive
>     income, spread **evenly per day** (`quietDay` in `src/math.js`, ≈ NT$1,721/day). It also shows a
>     **smoothed long-term trend**. There are no market moves, no "today" P&L and no countdowns anywhere.
>
> WidgetKit is primary. Android is a secondary note (§10).

Files: `index.html` (interactive mock: privacy modes, dark/light/tinted, home/lock, timeline play/step),
`render.mjs` (Playwright @3x + ffmpeg), `fonts/` (OFL subsets), `renders/`.

---

## 1. Concept

Wealth settles; it doesn't flash. The widget is still water with one clear number resting in it.
Underneath are two things, both made of the same fine grains:

- **The month rhythm (the beat).** This is a 30 × 4 grain matrix, one column per day of the month.
  It carries over the app Home's dot-matrix metronome, but calmer. Grains settle at a perfectly even
  pace: four a day, one every six hours, filling bottom-up and left to right. The next grain hangs
  just above its slot and sinks a little with every timeline entry until it lands. How far along the
  month is (27 Sep 22:07 → 107 of 120) reads at a glance, and it never jumps, because the rhythm is
  contractual (principal, interest, passive), not market-driven.
- **The sediment (the long view).** This is a very low-contrast field of grains under a smoothed
  36-month trend line. It rises gently left to right and never dips, because a 12-month moving average
  plus a monotone clamp removes volatility before it reaches the widget. Inside the field are faint
  strata by share: housing at the bottom, then stocks, cash, and passive (ochre) on top.

The number itself rolls forward by the even quiet pace (≈ NT$18 every 15 minutes). You won't see it
move, but whenever you look, it's a little further along. The grain placement is seeded from your own
data and today's date, so the texture belongs to your household and shifts slightly each day.

## 2. What's wrong with the current widget (Pixel 7 screenshot, `validation/2026-09-27/52-final-home-widgets.png`)

- **Empty space with no purpose.** The top ~45% of both cards is blank. All content is packed into the
  bottom half, so the cards look unfinished rather than calm.
- **No material.** It's a flat #FCFBF8 card with default Roboto and one grey for every label. It doesn't feel premium or personal.
- **The rhythm bar looks like a loading indicator.** Uniform ticks whose shape carries no meaning.
  Between updates only text changes, so there's nothing to discover.
- **The 4×2 is a KPI table.** It uses a label/value column with a divider and abbreviated values (`NT$14M`)
  that clash with the exact hero. Brand plus "Updated 21:54" take the top row.
- **No character.** Every user's widget looks the same. There's no single idea to remember.

## 3. Layout (pt; iPhone 6.7"/6.9" class, 430 × 932 pt)

| Family | Size | Content (exact mode) |
|---|---|---|
| systemSmall | 170×170 | `淨資產 NT$` (top-left) · hero `16,470,215` · `月節奏 +NT$51.6k` · 30×4 month-rhythm matrix (138 pt wide) · sediment field under trend |
| systemMedium | 364×170 | Same left block (hero 34 pt) + `≈ 1,721 / 日` · matrix 176 pt · quiet 4-row list 房產/股票/現金/被動 + `換屋頭期款 82%` · field rises to the right under the list |
| accessoryRectangular | 172×76 | `淨資產 NT$` · number 23 pt · 30×3 mini matrix · `月 +51.6k` |
| accessoryCircular ×2 | 76×76 | (a) month rhythm: 30-grain ring, 27 + filled, `51.6k 本月`; (b) goal: 40-grain ring, `82% 頭期` |
| accessoryInline | 1 line | `月節奏 +NT$51.6k` beside the lock-screen date |

System content margins are 16 pt. The matrix sits on the bottom margin (baseline y = 150). The text line
is 12 pt above the matrix, and the hero is directly above that. The top ~40% is calm on purpose: only a
few suspended grains drift there. The small widget has three text elements and one matrix.

Other phone widths: Apple's 393-pt phones get 158×158 / 338×158. Every measurement here scales
proportionally (the matrix is always 30 columns across the left text column).

## 4. Typography

| Role | iOS (device) | Mock / Android (OFL) | Size / weight |
|---|---|---|---|
| Hero number | SF Pro `.monospacedDigit()` | Inter 600 `tnum` | 34 pt (≤7 chars) / 27 pt (small, exact) · tracking −2.5% |
| Hero suffix `萬` | PingFang TC | Noto Sans TC 500 | 14 pt |
| Label / rhythm line | SF Pro + PingFang TC | Inter 500 + Noto Sans TC | 12 pt; value in the line 600 |
| List (medium) | same | same | 12 pt 500; label 30% ink, value 50% ink (quieter than the hero) |
| Hint (`輕觸顯示`) | same | same | 10 pt |
| Lock rect number | SF Pro semibold | Inter 600 | 23 pt |

iOS uses the system font, which ships with the OS (nothing bundled). That's the most native option.
Inter and Noto Sans TC (SIL OFL) are the open stand-ins in the mock, and Android bundles them. Set
`.minimumScaleFactor(0.75)` on the hero for large Dynamic Type.

## 5. Color (one accent: 赭 ochre)

| Token | Dark | Light | Tinted / Clear |
|---|---|---|---|
| background | `#141517` → `#17191B` | `#F7F5F1` → `#F1EEE8` | system glass (`containerBackground` removed) |
| text / secondary / tertiary | `#F2EFEA` / 52% / 32% | `#1C1C1E` / 50% / 30% | tint 95% / 55% / 35% |
| accent (rhythm value, landed grains, goal %) | `#C98A4B` (6.4:1 on bg) | `#9A5B22` (≥4.5:1) | accent group, `.widgetAccentable()` |
| matrix: landed / newest / empty | accent @ 78% / 100% / grain `#E8E1D4` @ 13% | accent @ 78% / 100% / `#5E574C` @ 13% | tint |
| sediment strata passive / cash / stocks / housing | `#C98A4B`@40% · `#D8D0C2`@28% · `#B7AE9F`@22% · `#8F8A82`@16% | `#A8672C` · `#8C8374` · `#766D5F` · `#5F5A52` (×1.1) | white ×0.7, `.widgetAccentedRenderingMode(.desaturated)` |

Paper grain is ±3 (dark) / ±2.5 (light) luminance per pixel. You can't see it as a pattern, but it
keeps flat areas from looking like plastic.

## 6. Generative algorithm (deterministic)

```
seedString = installSalt | localDate | buckets rounded to 萬        (masked: installSalt | localDate | "veil")
seed = FNV-1a-32(seedString) → mulberry32 PRNG  (pure UInt32 math; ports 1:1 to Swift / Kotlin)

TREND (sediment surface)
  history = 36 month-end net-worth snapshots (already stored on device)
  smooth  = centred 13-month moving average, then running max  → never shows a dip
  y(x)    = H − lo − (hi − lo)·ease(smooth(x)) + valueNoise(x, 37pt)·0.4      small lo/hi = 18/66pt, medium 16/54
  strata  = depth fractions by share (floors 6/9/14%), equalised in rhythm/masked
  grains  = jittered grid 1.4pt, keep 50%, r 0.30–0.54pt, alpha per stratum (table above);
            the field thins smoothly (up to 80%) within 10pt of the matrix so the beat stays crisp
MONTH RHYTHM (the beat)
  p       = (day − 1 + timeOfDay) / daysInMonth                           (even pace, no amounts involved)
  landed  = floor(p · 30 · 4)          4 grains/day = one every 6h
  next grain: above its slot by (1 − frac)·10pt, alpha 0.25 → 0.95; lands when frac → 1
PER ENTRY e (15 min)
  suspended grains  y = (y0 + e·1.6pt·k) mod waterHeight   (~W·H/900 grains, alpha 5–15%)
  hero value        = netWorth + quietDay · elapsed          (same rule as today's Android snapshot.live)
```

There are about 1,500 field grains plus 120 matrix grains per widget. That's cheap enough to draw in a
SwiftUI `Canvas` inside the widget view, with no image files. The field is identical for every entry of
a day. Per entry, only the matrix's settling grain and the suspended grains change.

## 7. Motion: exact WidgetKit mechanism

No continuous animation, no timers, and nothing driven by markets.

| Motion | Mechanism |
|---|---|
| **The beat**: the next grain sinks toward its slot, and one lands every 6 h | `TimelineProvider` emits 24 entries at 15-min spacing (policy `.atEnd`; pre-computed entries don't use the reload budget). Field + matrix are one `Canvas`, `.id(entry.date).transition(.opacity)`. WidgetKit (iOS 17+) crossfades each entry change (≈0.9 s, under the ~2 s widget animation cap). |
| **Number rolls** by the even pace (+NT$18/entry; `萬`/`%` modes usually stay the same) | `Text(value, format: .number).contentTransition(.numericText(value: Double(value)))`. |
| **Daily shift**: a new column starts; the pattern re-seeds with the date | Explicit entry at local 00:00 → same crossfade. |
| **Month turn**: matrix empties, first grain of the new month falls | Entry at 00:00 on day 1 (and `reloadTimelines` when the app writes a new month snapshot). |
| **Reveal (masked)**: tap → values for ~10 s → re-veil | iOS 17 interactive `Button(intent: RevealIntent())` writes `revealUntil` to the App Group and reloads. The timeline is `[revealed @ now, masked @ now+10 s]`. A tiny `顯示中` label; **no countdown**. |
| Mode / theme change | Full reload; WidgetKit crossfades the content. |

The mock runs a time-lapse: one step every 2.5 s = 90 min (= 6 device entries), so the grain visibly
sinks and lands within the 10 s video. The caption in the video says so.

Honesty: the crossfade only plays if the widget is on screen at the entry boundary. Usually the user
just finds it slightly further along, and that's the intended quiet effect.

## 8. Privacy modes (see `renders/privacy-modes-sheet.png`)

| Mode | Hero | Line / list | Texture |
|---|---|---|---|
| exact | `16,470,215` (rolls with the pace) | `月節奏 +NT$51.6k · ≈ 1,721 / 日`; list NT$ | trend + strata by share; matrix |
| rounded | `1,647` `萬` | `+5.2 萬 · ≈ 0.17 萬 / 日`; list 萬 | same |
| relative | `本月進度` `90%` | `+0.31% · ≈ 0.01% / 日`; list = shares, passive `—` | same |
| rhythm-only | `本月節奏` · `持續累積` · `每天四顆，靜靜落下` | list labels only | **matrix becomes the hero** (larger dots r 1.35, 6 pt rows); trend lowered; strata equalised |
| masked | `••••••` + `輕觸顯示` | `+••••`, list `••••`, goal `••` | seed has no data; flat surface; strata equalised. The matrix stays (it's the calendar, not money). |

All values also get `.privacySensitive()`, so iOS redacts them on a locked device and in StandBy when
"Allow access when locked" is off.

## 9. Rendering modes

- **Light / dark**: as in §5.
- **Tinted (iOS 18) / Clear (iOS 26)**: `widgetRenderingMode == .accented`. Drop the background, draw
  grains white ×0.7, mark hero + landed matrix grains `.widgetAccentable()`, and use
  `.widgetAccentedRenderingMode(.desaturated)` on the Canvas. See `renders/home-tinted.png`.
- **Vibrant (lock screen)**: white at 100/72/22% only; `AccessoryWidgetBackground()` behind the rings.

## 10. Android (secondary)

Same composition in RemoteViews, at the Pixel 7 sizes measured from the screenshot (2×2 ≈ 176×222 dp,
4×2 ≈ 368×222 dp).

- Field + matrix = one `Bitmap` from a `CoroutineWorker` (same seed/PRNG code) via `setImageViewBitmap`.
  Text stays as TextViews.
- The beat: redraw on the existing 30-min periodic update (the grain moves 2 steps per update).
  Optional: a `ViewFlipper` (`autoStart`, `flipInterval` 3000, 900 ms fade in/out) with 3 small
  transparent frames of only the settling grain's column (≈ 8×24 dp each), so it "breathes" in place.
  There's no numeric roll on Android; text swaps on update.
- Bitmap budget (limit 1080×2400×4×1.5 = 15.55 MB per `updateAppWidget`): 4×2 = 966×583×4 = 2.25 MB
  (+ ~20 KB flipper frames) = 15%. 2×2 = 1.08 MB. Send a single-size RemoteViews so the Android 12 size
  map doesn't double-count.

## 11. Effort and risk

| Work (iOS) | Estimate |
|---|---|
| Capacitor → App Group bridge (plugin writes existing snapshot JSON + 36-month history; `WidgetCenter.reloadAllTimelines()`) | 1–1.5 d |
| Seeded Canvas renderer (FNV-1a / mulberry32 / value noise / trend smoothing; parity test against the JS) | 1.5 d |
| Small, medium, rect, 2× circular, inline × 5 privacy modes × light/dark/tinted | 2–2.5 d |
| Timeline (24 × 15 min + midnight + month turn), numericText, transitions | 1 d |
| Interactive reveal (AppIntent) + `privacySensitive` | 0.5–1 d |
| Device QA (2 phone sizes, Dynamic Type, tinted/clear, StandBy) | 1–1.5 d |
| **Total iOS** | **≈ 7–9 dev days** (Android port ≈ 4 d) |

Risks:
1. **Restraint vs. visibility.** At 0.3 pt a grain is 1 px on @3x. Clamp the radius to ≥ 0.35 pt on @2x
   and tune alphas ±20% on a real OLED. This is the main visual risk.
2. **Trend honesty.** The monotone clamp hides real drawdowns by design. The app must keep an honest
   chart one tap away, and the widget never labels the curve with numbers.
3. **Extrapolated hero.** Between app opens the hero grows only by the quiet pace. Market value updates
   when the app pushes a new snapshot. That's intended, but the snapshot age should be visible in-app
   (not on the widget). Cap extrapolation at 45 days, as the Android widget already does.
4. **Entry timing.** iOS may delay or coalesce entries (and the ~10 s re-mask). Values stay correct
   because each entry carries its own state.
5. **Canvas cost.** About 1.6 k arcs × 25 entries, rendered lazily. That should be fine within the
   extension's 30 MB. Fallback: the app pre-renders PNGs into the App Group.
6. **Allocation leak.** Strata thickness reveals shares in exact/rounded/relative, which is intended
   there. They're equalised in rhythm/masked.
