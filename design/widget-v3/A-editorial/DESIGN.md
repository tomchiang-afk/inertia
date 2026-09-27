# Inertia widget v3 · Direction A · Editorial restraint（iOS WidgetKit first, month rhythm）

> Revision 3 (2026-09-27 22:40). History: r1 was an Android letterpress/newspaper widget, rejected as too busy. It's archived in `_superseded-android-letterpress/`. r2 was iOS-minimal, but it showed "today" figures and a day timer bar. r3 follows the founding intent: **long-term investors should not feel short-term volatility.** The widget is built on the **month rhythm（月節奏）** and a **smooth long-term trend**. It never shows daily market moves, a "today" P&L, or countdowns.

## Concept
**One beautiful number that is a little larger every time you look, carried by a calm monthly beat.** The number is net worth on a smoothed anchor. Market-driven legs are revalued on a smoothed monthly anchor, never tick-by-tick. What moves the number is the household's **month rhythm**: mortgage principal NT$22,100 + deposit interest NT$1,000 + passive income NT$28,500 = **NT$51,600／月**, spread evenly as **≈ NT$1,720 per day**. Three quiet things show it:
1. Every 15-minute timeline entry rolls the last digits up with `.contentTransition(.numericText())`.
2. A **30×4 beat matrix**, reinterpreted from the app Home's dot-matrix / metronome, shows the month as dots: one column per day, 4 dots per day (≈ 6 h each, ≈ NT$430 each). The leading dot slowly brightens and lands on its beat.
3. A **24-month smoothed trend line** whose end point advances with the rhythm.
From editorial design I kept only the discipline: one serif numeral (New York on device), generous but intentional hierarchy, one vermilion accent (red = up in Taiwan), and a surface with barely-there grain.

## What's wrong with the current widget (Android v2 screenshot)
- **The space isn't doing anything.** About 40% of each card is a blank band under the header, and the content crowds the bottom edge.
- **No typographic voice.** Label, value and meta are all in Roboto at similar sizes. The net worth isn't a hero; "NT$17,470,003" reads like a form field.
- **Too many equal-weight signals.** Bar strip, progress bar, "Retire · 87% · NT$17M", "Updated 21:54" and four rows all compete. It's a generic KPI card.
- **The rhythm is decoration.** The 30 tick bars look like a loading indicator, carry no meaning and never change on screen.
- **No material or character.** A flat off-white card that could belong to any app.

## Sizes（pt, iPhone 430×932 class: 15 Pro Max / 16 Plus）
| Family | Size | Content |
|---|---|---|
| systemSmall | 170×170, margin 16 | label · hero · month rhythm line · beat matrix |
| systemMedium | 364×170, margin 16 | left: label · hero · month rhythm; right: 24-month smooth trend; bottom: beat matrix · composition + per-day rate |
| accessoryRectangular | 172×76 | `Inertia · 淨資產` · hero (rounded default) · 30-dot month row |
| accessoryCircular | 76×76 | month ring + `+4.6萬 本月` (a second instance can show `90% 月節奏`) |
| accessoryInline | 1 line | `本月節奏 +NT$46,305` |
The 393-pt phones get 158/338×158. Layout uses stacks + `minimumScaleFactor`, so nothing depends on exactly 170.

## Layout specs
**systemSmall**: label `淨資產 · NT$` (12pt, secondary) at y=17. Hero bottom-aligned in y 38–92, auto-fit to 138pt (exact ≈ 30pt; rounded `1,647萬` ≈ 50pt; cap 54). Month line at y=101: `本月` 11pt secondary · `+46,305` 15pt accent · `/ 51,600` 11pt tertiary. Beat matrix at y=130, 140×24pt: 30 cols × 4 rows, dots ≈ 3pt.
**systemMedium**: left column 176pt, same stack (hero cap 56pt). Right column x=206, 142pt: caption `24 個月 · 平滑趨勢` right-aligned; trend 142×62pt: 1.35pt line, end dot r=2.6 accent with a 14% halo, dotted 3-month projection in tertiary. No axes, grid or values. Beat matrix at y=126, 336×20pt, dots ≈ 2.6pt: it reads as 30 little 4-dot "beats", like the app's metronome. Footer at y=151: `房貸本金 · 利息 · 被動收入`（secondary）↔ `每日 ≈ 1,720`（primary）.
There are 3 text elements + 1 matrix (small) and 6 text elements + 1 line + 1 matrix (medium). No icons, cards, borders or daily P&L. The four category totals moved to a future systemLarge. The medium is deliberately about rhythm and trend.

## Typography
| Role | iOS (ship) | Mock stand-in (OFL) | Size |
|---|---|---|---|
| Hero numeral | **New York**: `.font(.system(size: 54, design: .serif))`, `.monospacedDigit()`, `.minimumScaleFactor(0.5)`, `lineLimit(1)` | Newsreader opsz 72, wght 380, `lnum tnum`, −2% tracking | 30–56pt |
| Rhythm figures | New York `.monospacedDigit()` | Newsreader opsz 16, wght 450 | 15pt (accent) / 11pt |
| Labels zh-TW | SF Pro + PingFang TC (`.caption`, `.caption2`) | Inter + Noto Sans TC | 11–12pt, +0.04em |
| Rhythm-only phrase `靜靜增長` | `.system(design: .serif)` (Songti TC fallback) or bundled Noto Serif TC subset (OFL, ~7 KB) | Noto Serif TC | 26–30pt, +0.1em |
iOS needs no bundled fonts. The mock ships subset WOFF2s in `fonts/` (all OFL). Minimum size is 11pt.

## Color & material
| Token | Light | Dark | Tinted / clear (accented) |
|---|---|---|---|
| background | `#F7F4EE` + grain | `#161513` + grain | system material (container background removed) |
| text primary / lit dots / trend | `#1D1B18` (dots 82%) | `#F3EFE7` | tint; hero, trend and lit dots `.widgetAccentable()` |
| secondary | `#8B857A` | `#8F897E` | tint ~58% |
| tertiary / unlit dots | `#B9B2A6` / `#E6E0D6` | `#5E5951` / `#2C2A26` | tint 35% / 22% |
| accent (rhythm figure, leading dot, trend head) | `#C3402A` vermilion | `#F0775E` | merges into the tint (the design still works) |
Grain: tileable 128² noise at 2–2.5% luminance, plus a soft top light. It goes in `containerBackground(for: .widget)`, so tinted/clear/StandBy drop it automatically.

## Motion: WidgetKit-native only
| Motion | What you see | Exact mechanism |
|---|---|---|
| **Quiet roll** | Every entry, the changed trailing digits of the net worth and the month figure slide up with a soft blur-fade (~0.5s): `…,382 → …,400`, `+46,305 → +46,323` | `TimelineProvider` precomputes **96 entries/day** (every 15 min to midnight) from the local rhythm model. Value = anchor + 1,720/day × elapsed, so each entry adds ≈ NT$18. `Text(v, format: .number).contentTransition(.numericText(value: v))`. On iOS 17+ the system animates between entries while the widget is visible. Precomputed entries **use no reload budget**. Policy `.after(nextMidnight)`. |
| **Beat matrix** | The month as 120 dots. Lit = elapsed month. The leading dot (accent) brightens a little each entry (opacity 0.22 → 1 over its 6 h) and lands on its beat at 00/06/12/18h. At midnight a new day column starts. | Static SwiftUI per entry: `Grid`/`HStack` of `Circle()`s, lit count = ⌊120 × monthFraction⌋, leading opacity = the fraction remainder. The change between entries animates with the default entry transition (opacity crossfade). No timers. |
| **Trend grows** | 24-month smoothed curve; the end dot advances with the rhythm; the dotted projection hangs ahead | `Path` built per entry from monthly smoothed anchors + the current accrued point. It visibly extends day by day. On the monthly re-anchor the app calls `WidgetCenter.shared.reloadTimelines(ofKind:)`. |
| **Lock month ring** | Ring fills across the month | `ProgressView(timerInterval: monthStart...monthEnd, countsDown: false)` + `.progressViewStyle(.circular)`. It's live with no reloads. It's a month fill, not a countdown, and shows no label/time text. Center text rolls per entry. |
| **Privacy tap** (optional) | Tap cycles exact → rounded → masked; values shimmer briefly | iOS 17 `Button(intent: CyclePrivacyIntent())`, values `.invalidatableContent()`. |
| **Lock redaction** | Amounts become placeholders when locked (if the user opts in) | `.privacySensitive()` on amounts. It's free, native privacy on top of the 5 modes. |
Deliberately excluded: `Text(.timer)`/`.relative` countdowns, a day progress bar, any "today" P&L, daily market deltas.
**About the video:** it's a time-lapse. 1 entry (15 device minutes) = 1.25 s, starting 22:37, so 10 s ≈ 2 h. You see 8 rolls, the leading dot charging, and **midnight crossing at ~7.5 s**: the last dot of 27 Sep lands and the 28 Sep column begins. The roll itself plays at real speed.

## Market handling (why the number is calm)
Stocks and FX are real, but the widget never shows their daily moves. The app keeps a **smoothed anchor**: market legs are revalued at the monthly anchor, or with an EMA of ≥ 30 days. Between anchors only the rhythm accrues. If the anchor steps (up or down), the app pushes one reload and the number rolls once to the new level. There's no red day, no arrow, and the trend stays smooth by construction. This matches the app's "honesty = pace" setting.

## Privacy modes
| Mode | Hero | Month line | Medium extras | Lock |
|---|---|---|---|---|
| exact | `16,470,382` (label `淨資產 · NT$`) | `本月 +46,305 / 51,600` | trend, matrix, `每日 ≈ 1,720` | `NT$16,470,382`, ring `+4.6萬` |
| rounded | `1,647萬` | `本月 +4.6萬 / 5.2萬` | `每日 約 1,700` | `1,647萬`, ring `+4.6萬` (**recommended lock default**) |
| relative | `+0.281%` (label `本月已累積`) | `月節奏完成 90%` | `月節奏 ≈ 0.31%` | `+0.281%`, ring `90%` |
| rhythm-only | phrase `靜靜增長` | `九月 · 第 27 日` | trend + matrix as pure shape, `平穩` | `靜靜增長`, ring with a dot glyph |
| masked | `NT$` label + six dots | `本月 +••• / •••` | trend + matrix (shape only, no scale) | `NT$••••••`, ring `•••`; the second ring is hidden |
In rounded/relative/rhythm modes the hero rarely changes, so it rarely rolls. The beat matrix and trend still carry the rhythm. Nothing moves unless something meaningful changed.

## Tinted / clear / StandBy
`@Environment(\.widgetRenderingMode) == .accented`: hero, trend and lit dots get `.widgetAccentable()`, and everything else renders secondary. The grain drops with the container background. It works because the design is typography + dots + one line. iOS 26 clear/Liquid Glass uses the same accented path. StandBy: the hero scales up, and the trend and footer drop. See `renders/A-ios_home_tinted.png`.

## Android (secondary)
Same layout, palette and data model in RemoteViews/Glance. Bundle **Newsreader** (OFL) instead of New York, plus Noto Sans TC. RemoteViews has no numeric roll, so each ≤30-min update does one `ViewFlipper.setDisplayedChild` crossfade (400ms alpha). The beat matrix and trend are one app-rendered bitmap per update. No TextClock or timers. The earlier Android-only exploration is in `_superseded-android-letterpress/`.

## Effort & risk (honest)
- **Effort ≈ 6–8 dev days (iOS).** Capacitor → App Group bridge plugin (snapshot JSON: anchor, rhythm components, month start, privacy mode; plus `reloadTimelines`) 1d. Swift rhythm model + 96-entry provider 1.5d (it must match the web app's numbers; share fixtures). Small/medium/3 accessories × 5 privacy modes 2d. Tinted/dark/Dynamic Type/StandBy/393-pt QA 1.5d. Optional interactive privacy intent 0.5–1d.
- **Risks.** (1) The numericText roll only plays when the system animates the entry change (the widget must be on screen). Sometimes users just see the new value, and the layout is complete without motion. (2) Anchor drift: the widget must use exactly the app's smoothed anchor, or the two will disagree. Re-anchor on each app refresh and keep the formula in shared tests. (3) The leading-dot brightening is subtle by design (≈ 4% per entry). If QA finds it invisible, use 30×8 dots (3 h each) on medium. (4) Exact mode in small caps the hero at ~30pt (10 glyphs), so I recommend **rounded** as the small/lock default and exact on medium. (5) ~120 `Circle()` views per widget is fine for WidgetKit's render budget, but draw them with a single `Canvas` if profiling shows otherwise.

## Files
- `index.html` (+ `style.css`, `widget.js`, `fonts/`): interactive mock. Home / lock, 5 privacy modes, light / dark / tinted. Query: `?capture&theme=light|dark|tinted&mode=exact|rounded|relative|rhythm|masked&view=home|lock|sheet&start=<min offset>`.
- `renders/` (PNG @3×): `A-ios_home_{light,dark,tinted}.png`, `A-ios_home_{light,dark}_rounded.png`, `A-ios_{small,medium}_{light,dark}.png`, `A-ios_lockscreen_rounded.png`, `A-ios_privacy-modes_sheet.png`, `A-ios_numericText-roll_sequence.png`. Video: `A-ios_home_light_exact_timeline.mp4` + `_widgets.gif`, `A-ios_home_dark_rounded_timeline.mp4` + `_widgets.gif`.
- `tools/render.cjs`, `tools/video.cjs`, `tools/shot.cjs`: Playwright scripts that regenerate everything.
