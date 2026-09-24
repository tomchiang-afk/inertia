# Inertia widget visual templates

Design research and token map for selectable lock / home widget materials.
Brand name **Inertia** is fixed in every locale; templates change surface craft only.

## Anti–vibe-coding rules

- No neon gradients, glassmorphism-for-its-own-sake chrome, or emoji ornament.
- **One accent** per template; accents mark pace / brand, not decoration.
- High information density remains acceptable — clarity over emptiness-as-style.
- Light-first defaults; **noir** is the single OLED-friendly dark option.
- Materials should read as honest surfaces (paper, ink, glass, charcoal), not skins.

## Design lineages (cited principles, not quotations)

| Lineage | What we borrow | What we refuse |
| --- | --- | --- |
| **Dieter Rams / Braun product design** | “Less, but better”; honest materials; nothing superfluous on the face of the object. See Rams’ ten principles for good design (as published via Vitsoe). | Skeuomorphic novelty, loud branding bars. |
| **Swiss / International Typographic Style** | Strict hierarchy, asymmetric grid discipline, restrained accent (historically often a single strong red or blue). Lineage via Müller-Brockmann’s grid systems and mid-century Swiss posters. | Decorative illustration, multi-color clutter. |
| **Japanese quiet / *ma*** | Negative space as active structure; ink restraint; surfaces that breathe. *Ma* (間) as interval — silence between beats, not emptiness for lack of content. | Overfilled cards, busy separators. |
| **Apple Human Interface Guidelines — widgets** | Legibility on arbitrary wallpapers; material translucency cues; content-first; system-adjacent craft for Lock Screen / Home Screen. | Heavy chrome that fights the wallpaper; low-contrast ink. |
| **Soft utilitarian finance** | Clarity over decoration; tabular numbers; calm up/down semantics. Household-ledger tone, not trading-terminal adrenaline. | Neon P&amp;L fireworks, gamified badges. |

## Template catalog

### 1. `paper` — Paper (default)

**Lineage:** Rams honesty + soft utilitarian finance.

**When to use:** Everyday household glance; matches the current Inertia app chrome users already trust. Default for first launch.

**Palette tokens**

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#F7F6F3` | Warm paper wash |
| `--bg-page` | `#EDEBE6` | Page behind shell |
| `--surface` | `#FFFFFF` | Cards / widgets |
| `--ink` | `#1A1A1A` | Primary type |
| `--muted` / `--faint` | `#5C5C5C` / `#8A8A8A` | Secondary |
| `--line` / `--line-soft` | `#E8E8E8` / `#F0EFEC` | Hairlines |
| `--accent` | `#2F5D4A` | Single sage-green accent |
| `--accent-soft` | `#E8F0EC` | Accent wash |
| `--down` | `#8B3A32` | Loss / mortgage semantic |

**Typography:** Regular / medium for labels; semibold (600) for net worth and amounts. No display faces.

**Lock widget:** Warm near-opaque paper tile; brand in accent; metronome beats use `--accent`.

**Home medium:** Same paper surface; row hairlines soft; period label faint; accent only on brand + positive pace deltas.

---

### 2. `swiss` — Swiss

**Lineage:** International Typographic Style — grid, hierarchy, one sharp accent.

**When to use:** Users who want cooler, more editorial clarity; strong figure/ground for numbers.

**Palette tokens**

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#F0F0F2` | Cool gray field |
| `--bg-page` | `#E4E4E8` | Page |
| `--surface` | `#FAFAFB` | Cards |
| `--ink` | `#0A0A0A` | Near-black type |
| `--muted` / `--faint` | `#4A4A4E` / `#7A7A80` | Secondary |
| `--line` / `--line-soft` | `#D8D8DE` / `#ECECEF` | Grid lines |
| `--accent` | `#9B1B2E` | Crimson — used sparingly |
| `--accent-soft` | `#F5E8EB` | Accent wash |
| `--down` | `#9B1B2E` | Aligns with accent (honest, not decorative) |

**Typography:** Slightly tighter tracking on labels; bold hierarchy on amounts; accent reserved for brand wordmark and metronome — not full-row fills.

**Lock / home:** Cool gray tile; crimson only on `Inertia` brand + pace beat; hairlines read as grid, not ornament.

---

### 3. `sumi` — Sumi

**Lineage:** Japanese quiet / *ma* — soft ink, warm gray-green wash, interval.

**When to use:** Calm lock-screen presence; users who prefer softer contrast without going dark.

**Palette tokens**

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#E6EAE4` | Warm gray-green wash |
| `--bg-page` | `#D8DED4` | Page |
| `--surface` | `#F3F5F1` | Soft paper-ink surface |
| `--ink` | `#1C1C1A` | Soft ink black |
| `--muted` / `--faint` | `#555850` / `#7E8378` | Secondary |
| `--line` / `--line-soft` | `#D0D6CC` / `#E4E8E0` | Quiet rules |
| `--accent` | `#3F4F42` | Restrained ink-green |
| `--accent-soft` | `#DFE6DF` | Accent wash |
| `--down` | `#7A453C` | Muted down |

**Typography:** Slightly lighter label weight sensation (color, not thin fonts); more padding air where the grid allows — *ma* as spacing, not missing data.

**Lock / home:** Wash behind stage; widget surface soft; accent ink for brand and metronome only.

---

### 4. `glass` — Glass

**Lineage:** Apple HIG widget craft — translucency, wallpaper legibility, system material cues.

**When to use:** Previewing how Inertia should sit on Lock / Home wallpapers; when the user wants a more “system widget” feel.

**Palette tokens**

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#F4F5F7` | Cool light shell |
| `--bg-page` | `#E8EAEE` | Page |
| `--surface` | `rgba(255,255,255,0.72)` | Translucent card cue (widgets raise blur) |
| `--ink` | `#1B1D21` | High-legibility ink |
| `--muted` / `--faint` | `#5A5E66` / `#8B9099` | Secondary |
| `--line` / `--line-soft` | `rgba(0,0,0,0.08)` / `rgba(0,0,0,0.04)` | Soft edges |
| `--accent` | `#2C5F6E` | Single slate-teal accent |
| `--accent-soft` | `#E2EEF1` | Accent wash |
| `--down` | `#8B3A32` | Semantic down |

**Typography:** Same weights as paper; contrast prioritized for wallpaper survival.

**Lock / home:** Higher `backdrop-filter` blur; frosted tile; brand accent; metronome remains solid (readable) on frosted glass.

---

### 5. `noir` — Noir

**Lineage:** OLED lock screens + soft utilitarian finance in the dark.

**When to use:** Dark wallpapers / Always-On displays; users who want charcoal, not pure black marketing “OLED black” gimmicks.

**Palette tokens**

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#1C1C1E` | Charcoal shell |
| `--bg-page` | `#0E0E10` | Page |
| `--surface` | `#2C2C2E` | Raised surface |
| `--ink` | `#F2F2F0` | Primary type |
| `--muted` / `--faint` | `#A1A19C` / `#6E6E6A` | Secondary |
| `--line` / `--line-soft` | `#3A3A3C` / `#323234` | Hairlines |
| `--accent` | `#8FA896` | Muted sage (single accent) |
| `--accent-soft` | `#2A332C` | Accent wash |
| `--down` | `#C48B84` | Soft down on dark |

**Typography:** Semibold amounts stay; avoid pure `#000` fills (OLED smearing / crushing). Sage accent on brand + metronome / playhead only.

**Lock / home:** Charcoal tiles on dark stage; sage pace marks; no neon up-arrows.

---

## Implementation map

| Concern | Mechanism |
| --- | --- |
| Persistence | `settings.widgetTemplate` in `inertia.v1` (default `paper`) |
| DOM | `data-template="{id}"` on `#app`, `.shell`, `.lock-widget`, `.medium-widget` |
| Tokens | CSS variables overridden under `[data-template="…"]` |
| Settings UI | Swatch picker; instant apply to chrome + widget previews |
| Rhythm | Metronome / playhead use `var(--accent)` — auto-adapts |
| Ads / buyout | Unchanged; ads remain edit-only |

## IDs (stable)

`paper` · `swiss` · `sumi` · `glass` · `noir`
