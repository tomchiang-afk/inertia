# Inertia iOS widget sources

WidgetKit extension for the three v0.4 styles (`rhythm`, `editorial`, `sediment`). It reads the same snapshot JSON the Android widget uses, from the App Group `group.app.inertia.wealth`, key `inertia.widget.snapshot`.

This tree is not the Capacitor iOS platform. `ios/` is created by `npx cap add ios` and is gitignored. On a Mac, add that platform, then copy `InertiaWidget/` in as an extension embedded in the Capacitor app. The extension and the app must both use the App Group. The GitHub Actions workflow only proves these sources compile.

`project.yml` is an [XcodeGen](https://github.com/yonaskolb/XcodeGen) spec. GitHub Actions generates the project and runs `xcodebuild` for the simulator with signing off. It does not archive or upload.

Swift only extrapolates net worth (`live.base + live.perDay × days`, 45-day cap) and the calendar beat. Privacy strings are already formatted in JavaScript.
