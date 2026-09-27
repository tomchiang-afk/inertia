# Inertia Android debug APK: emulator validation, 2026-09-27

Emulator: Windows 11 laptop (LEGION-TOM), AVD `inertia34` (Pixel 7, API 34 google_apis x86_64), WHPX acceleration, Pixel Launcher.

| Check | Result |
| --- | --- |
| install (`adb install -r`) | PASS |
| launch / no crash | PASS: no FATAL or JS errors in logcat |
| Home with default data | PASS (01, 10, 11) |
| Goals: add goal, shown on Home and widget | PASS (05-08, 11) |
| Settings > Widget privacy | PASS (24, 31a-35a) |
| Widget add 2x2 | PASS (16, 17) |
| Widget add 4x2 | FAIL before fix: landed as 3x2 and could not be widened (15, 19, 21, 22). PASS after dc121b8 (50, 51, 52) |
| Widget updates per privacy mode | PASS: all 5 modes match the docs table (31b-35b, 60 montage) |
| Widget updates after a number edit | PASS (47) |
| Tapping a widget opens the app | PASS for 2x2 (23) and 4x2 (53) |
| Rotation | PASS (40, 41). Cosmetic: white strip in the cutout inset in landscape |
| Ads | PASS: shown when opening Edit (43), saving a number (45) and saving a new goal (07). None on browsing (42), opening the goal sheet (05) or widgets |

## Bugs
1. FIXED dc121b8: `maxResizeWidth=540dp` made Launcher3 compute maxSpanX=3, because it uses the min across portrait and landscape profiles. It then ignored `targetCellWidth=4`, so the "4x2" entry landed as 3x2 and could not be widened past 3 columns. Raised to 1200dp / 800dp.
2. Open, minor: both picker entries are named "Inertia" (the picker header reads "Inertia, Inertia"). Sizes are only told apart by the dims text.
3. Open, cosmetic: in landscape the display-cutout inset on the left is white instead of the app background.
4. Open, cosmetic: on Pixel 7 the 2x2 cell is tall, so there is a large empty band between the header and the net worth. This is by design (bottom-aligned), but it looks sparse.
5. Info: rounded mode shows `NT$1,647 萬` even in the English locale. This matches the spec.
6. Info: logcat prints `Capacitor/Console: Line 353 - Msg: undefined` on each pause/resume. This is Capacitor bridge noise and harmless.
7. Info: the mock ad has two "Skip" buttons, and the primary one is enabled right away.

Committed screenshots (to keep repo size down): 10, 11, 22-resize-4wide-blocked-before-fix, 40, 45, 47,
50, 51, 52 and the 60 montage. The other referenced screenshots stay on the validation box only
(see `.gitignore` in this folder).
