# Emulator validation: v0.3.1 (month rhythm only)

- Date: 2026-09-27, 22:41–22:46 (Asia/Taipei).
- Device: emulator-5554, AVD `inertia34` (Pixel 7 profile, API 34), on the owner's laptop.
- Build: `Inertia-debug.apk`, versionCode 4, versionName 0.3.1 (commit `6aced28`).
- The build was installed over the v0.3.0 data from `validation/2026-09-27-v3/`. That save still had
  `settings.honesty` and the `todayActual` widget privacy field, so this run also tested the
  settings migration.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Upgrade keeps totals (no jump) | ✅ widgets showed NT$22,739,695 before the upgrade and the app showed the same after | 00, 01, 05 |
| 2 | Home has no 月節奏 / 今日實況 switch | ✅ 月節奏 is a static badge; no stocks-today line | 01 |
| 3 | No daily market P&L on Home | ✅ the stocks row reads 不計入節奏; the 30日 pill is +NT$60,768 (pace × 30), not P&L | 01 |
| 4 | No P&L in the stocks list summary | ✅ counts only | 02 |
| 5 | Settings: honesty block gone, month-rhythm explainer shown | ✅ | 03 |
| 6 | Widget privacy fields: no 今日實況 toggle | ✅ 淨資產 / 月節奏 / 房產 / 股票 / 現金 … | 04 |
| 7 | Saved settings migrated | ✅ the latest `inertia.v1` record in the WebView leveldb has no `honesty`, no `todayActual`, no `dayPnL`/`periodPnL`, and `paceAnchorAt` 1790520095497 (22:41:35) | leveldb dump (not committed) |
| 8 | Widget snapshot anchored, no P&L | ✅ both pushes carry `live.base` 22,739,695 and the same `live.at` anchor, with no P&L keys | `snapshot-pushes.txt` |
| 9 | Net worth grows only by the smooth pace between opens | ✅ widgets NT$22,739,695 → NT$22,739,701 after ~4 min, and Home NT$22,739,702 after ~5 min (pace NT$2,025.59/day ≈ 1.4/min). 今日節奏已累積 went from NT$1,915 to NT$1,922 | 00 → 07, 01 → 08 |
| 10 | Smooth 30-day trend line (no market wiggle) | ✅ | 01, 08 |
| 11 | No crash | ✅ logcat has no FATAL, E/AndroidRuntime or Uncaught entries | logcat (not committed) |

## Notes
- The FX table on this device still shows the 6-decimal drift recorded in the v3 report
  (e.g. EUR 35.5999). That drift affects only this test device, and v0.3.1 does not cause it.
- Holdings still show the long-term gain against cost basis (e.g. +60.7%). That is a cumulative
  number, not daily noise, so it was kept.
