# Inertia — Native roadmap (Capacitor)

Local-first Taiwan household app. Web MVP lives in this repo; native shells wrap `dist/`.

## Capacitor scaffold (done)

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/app`
- `capacitor.config.json` — `appId: app.inertia.wealth`, `appName: Inertia`, `webDir: dist`
- After `npm run build`, sync with `npx cap sync`

### Platforms

| Platform | Command | Notes |
|----------|---------|--------|
| Android | `npx cap add android` then `npx cap open android` | Works on Linux/Mac with Android SDK |
| iOS | `npx cap add ios` then `npx cap open ios` | **Requires macOS + Xcode** — cannot fully build on this Linux box |

Do not commit generated `ios/` / `android/` until first real store pass unless the team wants them in-repo.

## Track A — WidgetKit / App Widgets

- **iOS**: WidgetKit small (lock / home) + medium (4-bucket). Read App Group shared JSON written by the Capacitor app (same quiet-day math as `src/math.js`).
- **Android**: App Widget provider mirroring lock + medium layouts.
- **Rule**: widgets never show ads. Data is local snapshot only.

## Track B — AdMob (edit-only)

- Interstitial **only** on edit open / save (mirror `src/adGate.js`).
- Never on browse, Home, bucket detail, or widgets.
- Buyout (IAP) permanently disables the gate.

## Track C — IAP buyout

- One-time non-consumable: Buyout unlock.
- StoreKit 2 / Play Billing.
- Persist entitlement locally; restore purchases on Settings.

## Track D — Thin quote backend

- Optional `GET /api/quotes?symbols=0050,2330` — delayed (~15 min) TW prices.
- Client never auto-overwrites user numbers; confirm → edit path (may show ad if not bought out).
- Keep offline mock in `src/quotes.js` for demos.

## Non-goals

- No LLM. No dark mode. No social. No auto-trading. Ads are never the product.

## Suggested order

1. `npm run build` + `npx cap add android` (CI smoke)
2. Shared quiet-day snapshot for widgets
3. AdMob edit interstitial behind feature flag
4. IAP buyout
5. iOS widgets on Mac
6. Thin quotes API
