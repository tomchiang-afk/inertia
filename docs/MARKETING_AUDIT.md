# Inertia — Marketing & ASO Audit

**Audience:** product / eng / design  
**Scope:** Taiwan-first household asset *pace* app (widget-first, local-first). Free download; one-time buyout removes ads (ads **only** on edit open/save). Delayed quotes optional. Brand name **Inertia** fixed in zh-TW / en / es / ja / ko. No LLM in v1.  
**Date:** 2026-09-24 (Asia/Taipei)  
**Repo:** https://github.com/tomchiang-afk/inertia  

Sources (light): [Apple product page](https://developer.apple.com/app-store/product-page/), [ASO tips 2026](https://appfollow.io/blog/aso-tips), [Fintech ASO / trust](https://appeak.pro/aso-guide/aso-verticals/aso-for-fintech-apps), [Widget ASO impact](https://trysonar.app/blog/ios-widget-extensions-discovery-aso-impact), [CMoney lifetime VIP growth](https://blogs.cmoney.tw/growth-hacker-cmoney), [麻布記帳 Moneybook](https://moneybook.com.tw/), [ONEW App Store](https://apps.apple.com/us/app/onew-%E9%A4%98%E9%A1%8D%E8%A8%98%E5%B8%B3%E8%88%87%E8%B3%87%E7%94%A2%E7%AE%A1%E7%90%86/id1670048788), [RevenueCat State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/), [TW App Store price points](https://galva.io/tools/apple-pricing-tiers/region/tw).

---

## 1. Positioning gaps (vs broker apps, vs net-worth trackers)

### What Inertia is (locked)
Glanceable **household asset pace** on lock/home widgets. Quiet growth (mortgage principal, TD interest, rent/dividends) stays visible on flat/red days. Manual, local-first truth. Not a trading terminal.

### Gap A — Broker / securities apps (富邦、永豐、元大、國泰等)
| They own | Inertia must own |
|----------|------------------|
| Live quotes, order entry, P&L red/green wall | **Pace**, not tick; honesty toggle *Today actual* vs *Month pace* |
| Account login, KYC, custody | **No account**; data on device |
| Push: fills, price alerts, promo | **No spammy push**; widget glance is the loop |
| “開戶 / 下單 / 存股” | “平盤日仍在動” / quiet contribution |

**Risk:** Store searchers for `台股` / `股票` expect brokers. Ranking on those terms without matching intent → bad reviews + Apple scrutiny.  
**Fix:** Compete on *household / widget / net worth / 資產 / 房貸本金 / 定存* — never claim trading, tips, or “beat the market.”

### Gap B — Net-worth / asset trackers (Kubera-class, ONEW, 麻布記帳 asset mode)
| They own | Inertia must own |
|----------|------------------|
| Full balance sheet, multi-account sync, charts deep dive | **Four buckets + glance** (Housing / TWSE / Cash / Passive) |
| Auto bank sync / OCR / iCloud (麻布, ONEW) | **Manual truth as virtue** — speed + privacy, not “we’re incomplete” |
| Net-worth history as hero | **Quiet-day growth** as hero; net worth is supporting |
| Feature lists in screenshots | **Widget-in-context** on a Taiwan home screen as shot #1 |

**Risk:** Looking like a thinner ONEW/麻布.  
**Fix:** One-line wedge: *“Broker apps show today’s noise. Inertia shows today’s quiet progress — on your Lock Screen.”*  
zh-TW gloss: **券商 App 看當日波動；Inertia 看平盤日仍在累積的進度——鎖在桌面。**

### Gap C — Category confusion
Finance utilities sit between **Finance** and **Productivity**. For TW launch, prefer **Finance** primary, **Utilities** secondary (Android) — widgets + calm tools belong there, but trust copy must still read “money app, not advice.”

---

## 2. Store listing essentials missing (screenshots, subtitle, keywords TW+global, privacy nutrition)

*Web MVP has no live App Store / Play listing yet — treat below as launch checklist.*

### Screenshots (conversion-critical; first 1–3 appear in search)
Missing until native widgets ship, but **design now**:

| # | Frame | Caption EN | Caption zh-TW |
|---|--------|------------|---------------|
| 1 | Lock + home widget on realistic iPhone home (TW wallpaper, NT$ amounts) | Quiet growth, at a glance | 平盤日也看得到進度 |
| 2 | App Home — rhythm / month pace (not a KPI grid) | Your assets keep moving | 資產仍在默默前進 |
| 3 | Four buckets row (Housing / TWSE / Cash / Passive) | Household, not day-trading | 家庭資產，不是當沖 |
| 4 | Honesty toggle: Today actual vs Month pace | Never fake market gains | 不假裝市場有賺 |
| 5 | Edit sheet + soft “ads only when you edit” cue | Free to browse; buy out once | 瀏覽免費；編輯才看廣告 |
| 6 | Local-first / no account | Stays on your phone | 資料留在你的手機 |
| 7 | Delayed quotes optional + confirm | You confirm every update | 報價更新需你確認 |

Rules (fintech ASO): illustrative NT$ only; label sample data; no APY guarantees; no fake badges. Prefer dark-mode-free light UI consistent with brand (`#F7F6F3`, accent `#2F5D4A`).

**Also missing:** 15–30s App Preview showing widget add → quiet-day number tick (reuse `docs/rhythm-demo` motion language).

### Subtitle (≤30 chars, searchable)
See § sample options below. Default wedge: pace + widget, not “portfolio tracker.”

### Keywords — App Store (100 chars, comma-separated, no spaces after commas; don’t repeat title/subtitle)

**zh-TW (TW store):**  
`資產,淨值,房貸,本金,定存,股利,租金,小工具,桌面,鎖屏,台股,家庭,記帳,理財,靜態`

**en (global / US-EN localization):**  
`networth,mortgage,principal,widget,lockscreen,household,pace,dividend,deposit,twd,calm,assets`

*Rebuild per locale from local search behavior — do not translate EN keywords word-for-word ([AppFollow ASO 2026](https://appfollow.io/blog/aso-tips)).*

**Google Play short description (80 chars):** lead with widget + quiet progress + local-first.

### Privacy nutrition (App Privacy / Data safety)
Local-first is a **conversion asset** if honest:

| Scenario | Label stance |
|----------|--------------|
| Pure local + IAP only (no AdMob yet) | Aim **Data Not Collected** for financial content; Purchases via Apple/Google as platform |
| AdMob edit interstitial live | Must disclose Ads / Device ID / possibly Usage — **never** claim “we collect nothing” |
| Optional delayed quotes API | Disclose if any identifiers or IP hit your backend; quotes confirm stays an edit path |

**Ship before listing:** public Privacy Policy URL + Support URL (required). Copy must say: no bank login, no account required, financial balances stay on device unless user later opts into sync (out of MVP).

### Other listing gaps
- Custom product page / PPO tests (icon vs screenshot set) once live  
- What’s New template for calm tone  
- Age rating / financial disclaimers in description footer  
- Localized screenshots for zh-TW first; en second; ja/ko/es when store expansion justified  

---

## 3. Onboarding / aha moment gaps

**Target aha (PRD):** widget added → on a quiet day, see today’s quiet contribution without opening a broker.

### Current gaps (web MVP → native)
1. **No forced path to “Add Widget.”** Web only has previews. Native must treat widget install as step 2 of onboarding (after minimal bucket seed), optional but visually primary. Aim ≥60% add rate (PRD).
2. **Empty-state anxiety.** Four empty buckets feel like homework. Seed with soft placeholders + “adjust later” — one screen: Housing equity / TWSE / Cash / Passive monthly.
3. **Honesty mode unexplained.** First run should show *Month pace* as default with one sentence: “We don’t invent TWSE gains.”  
   zh-TW: **我們不會捏造台股漲跌。**
4. **Browse vs edit not taught.** One tip: “Looking around never shows ads.” Builds trust before first edit interstitial.
5. **No day-2 quiet-day nudge in-product** (not push): when `dayPnL ≤ 0` and widget exists, Home headline emphasizes quiet contribution — the retention loop.

### Recommended 60-second flow
1. Language detect → confirm  
2. “Four household buckets” mini-setup (or skip with demo numbers clearly marked)  
3. Show Lock widget preview → **Add to Home Screen** CTA  
4. Land on Home in Month pace with rhythm motion  
5. Soft tip chip: ads only when editing  

Do **not** gate with account, email, or paywall on day 0.

---

## 4. Pricing & conversion (NT$39 early bird vs 90–150; buyout prompt timing)

### Model (locked — good fit)
Free + edit-only ads → **one-time buyout** removes ads forever. Anti-subscription sentiment is strong in TW indie utilities; CMoney’s 簡單記帳 saw lifetime VIP drive ~half of revenue and lift paid penetration ([CMoney growth write-up](https://blogs.cmoney.tw/growth-hacker-cmoney)). RevenueCat 2025 also notes hybrid lifetime offers rising — Inertia’s pure buyout is coherent for a calm utility ([RevenueCat 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)).

### Price bands (TW IAP; Apple TW price points exist around NT$30–50 and higher — verify live tiers in App Store Connect)
| Band | Price | Role |
|------|-------|------|
| Early bird / launch | **NT$39** | Lower friction; collect reviews; “限時買斷” for 4–8 weeks |
| Steady state | **NT$90–120** | Default after early bird; still impulse for frequent editors |
| Premium calm | **NT$150** | Only if buyout + future soft perk (e.g. extra widget sizes) — avoid feature-gating core pace |

**Recommendation:** Launch at **NT$39** with promo text “Early bird buyout”; schedule bump to **NT$90** after N reviews or date. Do not start at 150 — edit-only ads are mild friction; price must feel lighter than the annoyance.

### Buyout prompt timing (do not break calm)
| When | Action |
|------|--------|
| Browse / widget glance | **Never** |
| First edit | Show ad only; no paywall |
| After **3rd–5th** successful edit (N in PRD) | Soft sheet: “Edit often? Buy out once — ads gone forever.” / **常改數字？一次買斷，廣告永久關閉。** |
| Settings | Always available + Restore Purchases |
| After skip | Cool-down ≥7 days or ≥5 more edits |

Paywall before ad (optional A/B later) can raise CVR but feels harsher — default **after** ad skip or post-save soft prompt to stay brand-true.

### Messaging pillars
- Buy once, own forever (anti-subscription)  
- Ads never on widgets / browse  
- Supports a small indie tool, not a bank upsell  

---

## 5. Trust & compliance messaging (not investment advice; delayed quotes)

Money apps convert on credibility before features ([Fintech ASO](https://appeak.pro/aso-guide/aso-verticals/aso-for-fintech-apps)).

### Required statements (store description footer + Settings → About)
- **Not investment advice.** Educational household tracking only.  
  zh-TW: **本 App 非投資建議，僅供家庭資產紀錄與進度檢視。**
- **Not a broker.** No order entry, no custody, no tips.  
- **Quotes delayed / optional.** User-entered numbers are primary; any market figure is delayed and applied only after confirm.  
  zh-TW: **報價為延遲參考，需你確認後才寫入；預設以你手動輸入為準。**
- **No LLM / no AI tips in v1** — say so if competitors lean on “AI理财”; avoid implying smart recommendations.
- **Illustrative screenshots** — sample NT$ data.

### Trust UX in product
- Honesty toggle copy always visible near TWSE  
- Quote confirm = edit path (may show ad if not bought out) — disclose in Settings → Quotes  
- When AdMob ships: Settings line “Ads only when you edit numbers”  
- Privacy Policy linked from Settings and store  

### Apple / Google risk zones
Avoid: guaranteed returns, “safe investment,” live price as primary value, competitor broker names in keywords, misleading balances in screenshots.

---

## 6. Growth loops that fit “calm” brand (no spammy push)

**Principle:** Growth should feel like a glance, a tip from a friend, or a quiet article — not FOMO.

| Loop | Fit | How |
|------|-----|-----|
| Widget retention | Core | Glances ≫ opens; quiet-day Home copy; no badge spam |
| Store SEO | Core | zh-TW keywords + screenshot PPO; category Finance |
| Soft content | High | Short primers: 房貸本金進度、定存日息、平盤日焦慮 — Threads / 小聚落, restrained tone (contrast hype 存股 KOL — [豐存股 case](https://www.vocalmiddle.com/showcases/24-0409) is *not* the template) |
| Widget screenshot UGC | Medium | Ask users to share Lock Screen (privacy: crop numbers); Instagram/Threads aesthetic matches light UI |
| Referral | Low–med | Optional “Share widget setup tip” — no reward spam |
| Cross-promo | Low | Avoid bank/券商 partnerships that reframe as trading |
| Push | **Avoid** for MVP | If ever: user-scheduled “monthly update reminder” only, default off |
| Paid UA | Later | Apple Ads on `widget`, `net worth`, `資產` long-tails — not `股票下單` |

**Anti-patterns:** daily P&L push, red/green emoji creatives, “AI 幫你選股,” countdown timers on buyout, interruptive ATT spam (if ads: explain edit-only before ATT).

---

## 7. Localization marketing notes (zh-TW / en / es / ja / ko)

| Locale | Store priority | Messaging notes |
|--------|----------------|-----------------|
| **zh-TW** | P0 launch | Primary. TWD, 房貸/本金/定存/股利/租金. Name **Inertia** untranslated. Tagline e.g. **資產仍在前進。** Avoid 簡體 phrasing. Soft 您/你: prefer 你 for calm peer tone. |
| **en** | P0 metadata | For expats in TW + global ASO. “Household asset pace,” “quiet growth,” mortgage principal — not FIRE maximalism. Currency display stays NT$. |
| **ja** | P1 later | Japan has strong local-first / widget culture; mortgage + deposit metaphors translate; keep Inertia; avoid implying 証券会社. Keywords rebuilt in Japanese search terms. |
| **ko** | P1 later | Similar utility market; emphasize privacy + widget; don’t mirror Korean brokerage slang. |
| **es** | P2 | Useful for shared UI completeness; TW-first GTM means don’t spend creative budget until organic EN/zh-TW stable. LatAm net-worth terms ≠ TW housing context — rewrite, don’t translate. |

**Universal rules**
- Product name **Inertia** never localized  
- Tagline localizes; currency **NT$ / TWD**  
- Screenshot captions rewritten per market, not machine-translated  
- Legal disclaimer localized with local counsel if expanding beyond TW marketing claims  

---

## 8. Prioritized backlog (P0 / P1 / P2) — max 15

| ID | Pri | Owner | Action |
|----|-----|-------|--------|
| M1 | **P0** | Design | Produce store screenshot set (7 frames) with widget-in-context as #1; sample NT$; light UI; zh-TW + en captions |
| M2 | **P0** | Product | Freeze launch subtitle + promo text (pick 1 EN + 1 zh-TW from samples below); draft 4000-char description with disclaimer footer |
| M3 | **P0** | Eng | Native onboarding: after bucket seed → Add Widget CTA; track widget-add rate |
| M4 | **P0** | Eng / Legal | Privacy Policy + Support URL; App Privacy nutrition plan for local-only vs future AdMob |
| M5 | **P0** | Product | Buyout soft prompt after 3–5 edits; never on browse/widget; Settings restore; early-bird **NT$39** flag |
| M6 | P1 | Design | 15–30s App Preview from rhythm motion (lock → home pace) |
| M7 | P1 | Product | Honesty + “not investment advice” + delayed-quotes copy in Settings and first-run tip |
| M8 | P1 | Eng | ATT / AdMob copy path: explain edit-only before permission; ads never on widgets |
| M9 | P1 | Marketing | zh-TW keyword set live in ASC; EN localization metadata; no broker-brand keywords |
| M10 | P1 | Marketing | 3 calm content pieces (房貸本金 / 定存日息 / 平盤日焦慮) for Threads + store SEO landing |
| M11 | P2 | Design | Localized screenshot captions ja / ko (es deferred) |
| M12 | P2 | Product | Price bump path NT$39 → NT$90 with promo text update (no new binary) |
| M13 | P2 | Eng | Optional in-app “Share Lock Screen tip” sheet (no referral spam) |
| M14 | P2 | Marketing | Apple Ads smoke test on widget + 資產 long-tails after baseline CVR known |
| M15 | P2 | Product | PPO test: Shot1 caption A/B (quiet growth vs local-first) |

---

## Sample App Store subtitle + promo text (5 options × en + zh-TW)

*Subtitle ≤30 characters (count carefully in ASC). Promo text ≤170; updatable without new build.*

### Option A — Widget wedge
- **EN subtitle:** `Quiet growth on your Lock Screen`  
- **EN promo:** `Free household asset pace. Widgets never show ads — buy out once if you edit often.`  
- **zh-TW subtitle:** `鎖屏上看見平盤日進度`  
- **zh-TW promo:** `免費的家庭資產節奏。小工具永不廣告——常改數字再一次買斷。`

### Option B — Anti-broker
- **EN subtitle:** `Household pace, not day-trading`  
- **EN promo:** `Mortgage principal, deposits, dividends — still moving on flat days. Local-first. Not a broker.`  
- **zh-TW subtitle:** `家庭資產節奏，不當沖`  
- **zh-TW promo:** `房貸本金、定存、股利——平盤日也在動。資料在本機。不是券商 App。`

### Option C — Local-first trust
- **EN subtitle:** `Local-first household assets`  
- **EN promo:** `No account. Your numbers stay on device. Optional delayed quotes — you confirm every update.`  
- **zh-TW subtitle:** `本機優先的家庭資產`  
- **zh-TW promo:** `免帳號，數字留在手機。延遲報價可選——每次更新都需你確認。`

### Option D — Buyout clarity
- **EN subtitle:** `Free to glance. Buy out ads.`  
- **EN promo:** `Browse and widgets stay ad-free. Ads only when editing numbers. Early bird buyout NT$39.`  
- **zh-TW subtitle:** `瀏覽免費，買斷去廣告`  
- **zh-TW promo:** `瀏覽與小工具永不廣告。只有改數字才可能看到廣告。早鳥買斷 NT$39。`

### Option E — Brand tagline close
- **EN subtitle:** `Your assets keep moving`  
- **EN promo:** `Inertia makes quiet household progress glanceable — housing, TWSE, cash, passive income.`  
- **zh-TW subtitle:** `資產仍在默默前進`  
- **zh-TW promo:** `Inertia 讓家庭資產的安靜進度一眼可見——房屋、台股、現金、被動收入。`

**Launch pick suggestion:** Option **A** (subtitle) + Option **D** (promo) for conversion clarity; keep **E** as brand line inside description H1.

---

## Appendix — One-line positioning (use everywhere)

**EN:** Inertia is the calm Lock Screen for Taiwan household assets — quiet progress you can trust, not a brokerage P&L wall.  
**zh-TW:** Inertia 是台灣家庭資產的鎖屏節奏——可信的安靜進度，不是券商損益牆。

---

*End of audit. Coordinate store creative with `docs/NATIVE_ROADMAP.md` (WidgetKit before promising widgets in screenshots).*
