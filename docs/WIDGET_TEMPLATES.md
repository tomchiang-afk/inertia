# Inertia widget visual templates

Design research and **structural** craft map for selectable lock / home widget materials.
Brand name **Inertia** is fixed in every locale; templates change surface **and layout**, not only color tokens.

> **Honest note:** an earlier revision was too token-only (CSS variables under `data-template`). Templates looked like recolors. This doc describes the structural differences that must read clearly in screenshots.

## Anti–vibe-coding rules

- No neon gradients, glassmorphism-for-its-own-sake chrome, or emoji ornament.
- **One accent** per template; accents mark pace / brand, not decoration.
- High information density remains acceptable — clarity over emptiness-as-style.
- Light-first defaults; **noir** is the single OLED-friendly dark option.
- Materials should read as honest surfaces (paper, ink, glass, charcoal), not skins.
- Rhythm craft is part of the template: `data-rhythm="bars|dots|ink"`.

## Design lineages (cited principles, not quotations)

| Lineage | What we borrow | What we refuse |
| --- | --- | --- |
| **Dieter Rams / Braun product design** | “Less, but better”; honest materials; nothing superfluous on the face of the object. See Rams’ ten principles for good design (as published via Vitsoe). | Skeuomorphic novelty, loud branding bars. |
| **Swiss / International Typographic Style** | Strict hierarchy, asymmetric grid discipline, restrained accent (historically often a single strong red or blue). Lineage via Müller-Brockmann’s grid systems and mid-century Swiss posters. | Decorative illustration, multi-color clutter. |
| **Japanese quiet / *ma*** | Negative space as active structure; ink restraint; surfaces that breathe. *Ma* (間) as interval — silence between beats, not emptiness for lack of content. | Overfilled cards, busy separators. |
| **Apple Human Interface Guidelines — widgets** | Legibility on arbitrary wallpapers; material translucency cues; content-first; system-adjacent craft for Lock Screen / Home Screen. | Heavy chrome that fights the wallpaper; low-contrast ink. |
| **Soft utilitarian finance** | Clarity over decoration; tabular numbers; calm up/down semantics. Household-ledger tone, not trading-terminal adrenaline. | Neon P&amp;L fireworks, gamified badges. |
| **LED / phosphor display** | Dot-matrix pace as signature motion language (點陣圖) — equalizer / marching column for Month pace. | Thin 4-bar chrome as the only rhythm. |

## Rhythm variants

| `data-rhythm` | Templates | Form |
| --- | --- | --- |
| `bars` | paper, swiss | Rounded (paper) or sharp (swiss) bar metronome / equalizer |
| `dots` | glass, noir | LED grid (home hero ~7×20; lock compact ~4×16; medium strip ~3×12) |
| `ink` | sumi | Softer circular ink dots, more spacing (*ma*) |

- **App Home:** hero rhythm block above a secondary sparkline (`?demo=1` amplifies motion).
- **Lock preview / Home medium:** compact / strip sizes.
- CSS-driven; `prefers-reduced-motion: reduce` → static lit pattern (no animation).

## Template catalog — structural diffs

### 1. `paper` — Paper (default)

**Lineage:** Rams honesty + soft utilitarian finance.

**Structure (must differ in screenshots)**

- Soft **16–20px** radius cards; warm paper wash; light soft shadow OK.
- Classic **stacked** label → value → pace.
- Rhythm: **`bars`** with rounded bar caps.

**Palette tokens**

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#F7F6F3` | Warm paper wash |
| `--surface` | `#FFFFFF` | Cards / widgets |
| `--ink` | `#1A1A1A` | Primary type |
| `--accent` | `#2F5D4A` | Single sage-green accent |

---

### 2. `swiss` — Swiss

**Lineage:** International Typographic Style — grid, hierarchy, one sharp accent.

**Structure**

- **0–2px** radius; hairline border; **left 3px accent rule**.
- Uppercase micro-labels; tighter tracking; denser row padding.
- **No soft shadow.**
- Rhythm: **`bars`** with `border-radius: 0`.

**Palette tokens**

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#F0F0F2` | Cool gray field |
| `--accent` | `#9B1B2E` | Crimson — used sparingly |
| `--ink` | `#0A0A0A` | Near-black type |

---

### 3. `sumi` — Sumi

**Lineage:** Japanese quiet / *ma* — soft ink, warm gray-green wash, interval.

**Structure**

- **Asymmetric lock layout:** large value left; brand / label / pace quiet on the right.
- More padding (*ma*); quieter / softer row dividers on medium widget.
- Rhythm: **`ink`** — circular soft dots.

**Palette tokens**

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#E6EAE4` | Warm gray-green wash |
| `--accent` | `#3F4F42` | Restrained ink-green |

---

### 4. `glass` — Glass

**Lineage:** Apple HIG widget craft — translucency, wallpaper legibility, system material cues.

**Structure**

- Extra translucency + **inner top highlight** (`::before` hairline).
- Slightly **larger radius** (~22px); thinner type weights on amounts.
- Rhythm: **`dots`** (frosted LED).

**Palette tokens**

| Token | Value | Role |
| --- | --- | --- |
| `--widget-surface` | `rgba(255,255,255,0.55)` | Frosted tile |
| `--widget-blur` | `28px` | System blur cue |
| `--accent` | `#2C5F6E` | Slate-teal |

---

### 5. `noir` — Noir

**Lineage:** OLED lock screens + phosphor pace display.

**Structure**

- Dark OLED charcoal; **minimal chrome**.
- **Dot-matrix is primary** (bright phosphor-green / sage LEDs on charcoal); sparkline de-emphasized.
- Monospace / tabular figures on net-worth amounts.
- Rhythm: **`dots`** (required).

**Palette tokens**

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#1C1C1E` | Charcoal shell |
| `--accent` | `#8FA896` | Muted sage |
| LED on | `#C5E0CC` + glow | Phosphor pace |

---

## Implementation map

| Concern | Mechanism |
| --- | --- |
| Persistence | `settings.widgetTemplate` in `inertia.v1` (default `paper`) |
| DOM | `data-template="{id}"` on `#app`, `.shell`, widgets; `data-rhythm` + `tpl-*` class on widgets |
| Tokens | CSS variables under `[data-template="…"]` |
| Structure | Template-scoped CSS for radius, border, accent rule, type-transform, padding, shadows, asymmetric lock grid |
| Rhythm | `rhythmHTML(size)` → bars / dots / ink; hero on App Home; compact/strip on widgets |
| Settings UI | Swatch picker; instant apply to chrome + widget previews |
| Ads / buyout | Unchanged; ads remain edit-only |

## IDs (stable)

`paper` · `swiss` · `sumi` · `glass` · `noir`
