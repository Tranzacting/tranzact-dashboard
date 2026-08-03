# letstranzact.ai (TranZact) — Design.md
## Reference for video / motion content generation

> Source of truth: `.claude/skills/brand-collaterals/references/design-core.md` (colour + type),
> `design-presentation.md` (reduced deck system), `design-system/design-system.yaml` (token seed).
> Figma is canonical for all values below — [Colour Palette](https://www.figma.com/design/iqXbNhkFpTjeVMMQTT1aTN/.com-to-.ai?node-id=441-80) · [Notion Brand Assets](https://app.notion.com/p/tranzact/Brand-Assets-letstranzact-ai-38993296afc081f7bb54eca3390bb3e4).
> If this file and Figma ever disagree, Figma wins — flag the drift.

---

## 1. Brand Identity Brief

**Product:** letstranzact.ai (TranZact AI) — AI-native Factory OS for Indian SME manufacturers. Turns scattered Tally/Excel/WhatsApp data into instant answers and connected control across sales, purchase, inventory, production. 10,000+ manufacturers on platform.

**Visual tone:** Dark-first, high-contrast, minimal. Orange accent (`#DA5D37`) = energy and decisive action. Sits between enterprise-grade trust and modern fintech momentum.

**Key visual signatures (carry these into video):**
- Dark canvas (`#0E0F0C`) with an orange radial glow behind hero headlines/titles
- Particle / subtle motion background on hero-style opens (digital-only signature — this is the one visual motif most transferable to actual video motion)
- Primary CTAs / key on-screen callouts with an orange glow
- Montserrat SemiBold for all titles/headlines — confident, tight tracking
- Outfit for body/lower-thirds/captions — readable, neutral

---

## 2. Color Tokens

**Dark mode is the default and preferred mode for video.** Use light mode only for specific sections that call for it (e.g. an embedded product screenshot that's natively light, or a deliberate light section-break, matching the "pick one mode, deviate only intentionally" rule from the deck system).

### 2.1 Dark Mode (default)

| Token | Hex | Role |
|---|---|---|
| `primary` | `#DA5D37` | Brand orange — CTA, accent, emphasis |
| `primary-light` | `#D7826F` | Soft brand, icon tint |
| `primary-hover` | `#C24E2E` | Hover/active state (interactive UI captures only) |
| `primary-pressed` | `#A8401F` | Pressed state |
| `bg-base` | `#0E0F0C` | Canvas / background plate |
| `bg-page` | `#141414` | Section or alt-dark background |
| `bg-surface` | `#1C1A1A` | Cards, lower-third panels, nav bars |
| `bg-elevated` | `#292A27` | Elevated panels, callout boxes |
| `border` | `#242424` | Default dividers |
| `border-strong` | `#474847` | Prominent dividers/frames |
| `text-primary` | `#F0F0F0` | Titles, body copy on dark |
| `text-secondary` | `#858A8E` | Supporting text, sub-lines |
| `text-muted` | `#AAACA6` | Placeholders, faint labels |
| `surface-light` | `#EAECE5` | Light chip/surface on dark bg |
| `success` | `#34D399` | Positive metric / checkmark |
| `warning` | `#FBBF24` | Caution state |
| `error` | `#F87171` | Negative / error state |
| `info` | `#60A5FA` | Informational callout |
| `overlay-4/8/12` | `rgba(255,255,255,.04/.08/.12)` | Hover/active/pressed tint layers |

### 2.2 Light Mode

| Token | Hex | Role |
|---|---|---|
| `primary` | `#BF4A25` | CTA on white |
| `primary-brand` | `#DA5D37` | Brand colour, 24px+ text only (AA Large) |
| `primary-hover` | `#A84320` | Hover |
| `primary-pressed` | `#8D3619` | Pressed |
| `bg-base` | `#FFFFFF` | Page white |
| `bg-alt` | `#F9F9F8` | Section alternate |
| `bg-surface` | `#F2F3EF` | Cards |
| `bg-elevated` | `#EAECE5` | Elevated surfaces |
| `border` | `#DDDEE0` | Default border |
| `border-strong` | `#AAACA6` | Prominent border |
| `text-primary` | `#0E0F0C` | Body/title text |
| `text-secondary` | `#292A27` | Secondary text |
| `text-muted` | `#595B58` | Subdued/placeholder |
| `surface-dark` | `#1C1A1A` | Dark element on light bg |
| `success` | `#15803D` | Success |
| `warning` | `#A16207` | Warning (amber) |
| `error` | `#DC2626` | Error |
| `info` | `#2563EB` | Info |
| `overlay-4/8/12` | `rgba(0,0,0,.04/.08/.12)` | Hover/active/pressed tint |

### 2.3 Brand Orange Ramp

| Step | Hex | Note |
|---|---|---|
| 50 | `#FEF3EF` | Lightest tint |
| 100 | `#FDDDD0` | |
| 200 | `#FAB898` | |
| 300 | `#F38D63` | |
| 400 | `#E87649` | |
| **500** | **`#DA5D37`** | Base brand orange |
| 600 | `#BF4A25` | CTA on white (AA) |
| 700 | `#9B3819` | |
| 800 | `#732A12` | |
| 900 | `#4A1A0A` | Darkest shade |

### 2.4 Color Rules for Video

- Default every scene to dark-mode tokens unless the shot requires light (e.g. a native product screenshot).
- Don't mix a dark-mode text colour on a light-mode background or vice versa — the pairs above are matched sets.
- Status colors (success/warning/error/info) are mode-specific — don't reuse the dark-mode hex on a light-mode plate.
- Orange (`primary`/brand-500) is an accent, not a fill — reserve it for one emphasis element per frame (a stat, a CTA, a highlighted word/icon), same rule decks follow.
- These are **digital/RGB hex values** — correct for on-screen video, exports, and streaming. Do not use `design-print.md` values here; those are for physical print only.

---

## 3. Typography System

### 3.1 Families

| Family | Role | Weights used |
|---|---|---|
| **Montserrat** | Display + all headline levels | SemiBold (600), Medium |
| **Inter** | Sub-heading (H6) + labels/overlines/lower-thirds | SemiBold, Medium |
| **Outfit** | All body copy, captions, subtitles | Regular, Medium, SemiBold |

All three are free Google Fonts. No `font-weight: bold` (700) anywhere — heaviest weight in the system is SemiBold (600).

### 3.2 Heading / Title Scale

| Token | Size | Family | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| `/Display` | 96px | Montserrat | SemiBold | 120% | +0.04em |
| `/H1` | 68px | Montserrat | SemiBold | 120% | -0.015em |
| `/H2` | 48px | Montserrat | SemiBold | 120% | -0.015em |
| `/H3` | 40px | Montserrat | SemiBold | 120% | -0.015em |
| `/H4` | 30px | Montserrat | SemiBold | 120% | -0.015em |
| `/H5` | 24px | Montserrat | SemiBold | 160% | -0.2% |
| `/H6` | 22px | Inter | SemiBold | 140% | -2% |

`/Display` (96px) is for single-word hero statements ("Simplify."); use `/H1` for multi-word titles. Display is the one token with *positive* tracking — deliberate, don't copy that looseness onto other headings.

### 3.3 Body / Caption Scale

All body text is **Outfit**, 160% line-height across sizes.

| Token | Size | Weight | Use |
|---|---|---|---|
| `/Body/24` | 24px | SemiBold / Regular | Large callouts, feature intros |
| `/Body/20` | 20px | SemiBold / Medium / Regular | |
| `/Body/18` | 18px | Medium / Regular | Default body — most common |
| `/Body/16` | 16px | SemiBold / Medium / Regular | Secondary UI text |
| `/Body/14` | 14px | SemiBold / Medium / Regular | Captions, tags |
| `/Body/Caption` | 12px | Regular | Smallest — timestamps, legal, source lines |

### 3.4 Labels / Overlines / Lower-Thirds

| Token | Size | Family | Weight | Tracking | Case |
|---|---|---|---|---|---|
| `/Label` | 11px | Inter | Medium | +0.08em | UPPERCASE |

This is the token to use for name/title lower-thirds, section eyebrows, and tag chips — the only two approved uses of Inter are `/H6` and `/Label`.

### 3.5 Typography Rules for Video

- Titles/headlines: Montserrat SemiBold only. Never substitute Outfit or Inter at a headline role.
- Lower-thirds, name/title cards, eyebrow tags: Inter Medium, uppercase, tracked (`/Label`).
- Subtitles/captions/on-screen body copy: Outfit, 18–24px depending on frame size (scale up from the 18px web default for video legibility — see §5).
- Never use bold (700) — the heaviest weight anywhere in this system is SemiBold (600).
- Keep negative tracking on H1–H4; don't loosen it for "readability" — legibility at video scale should come from size/contrast, not tracking.
- If Montserrat/Outfit aren't available in the render pipeline, approved substitutes: Montserrat → Poppins or Arial Bold; Outfit → Segoe UI or Helvetica Neue. Preserve the same size/weight relationships when substituting.
- Enable tabular figures (`font-variant-numeric: tabular-nums`) for any stacked/animated numbers (counters, stat tickers, dashboards) so digits don't jitter in width as they animate.

---

## 4. Effects & Motion

- **CTA / emphasis glow:** `box-shadow: 0 0 12px 2px rgba(217, 92, 54, 0.64)` — apply to orange CTAs and key hero titles. This is a digital-only effect; translate it in video as a soft orange glow/bloom behind the emphasized element, not a hard drop shadow.
- **Particle / motion background:** the brand's signature hero treatment — subtle floating particles or ambient motion behind title cards on the dark canvas. This is the strongest visual cue to carry from web into video opens/title cards.
- No other standardized elevation or motion tokens are defined in the source system — animation timing/easing is currently handled per-project, not tokenized. Default to smooth, minimal, confident motion (short eases, no bounce/overshoot) consistent with the brand's "enterprise trust + fintech momentum" tone; don't invent glow/shadow styles beyond the one above.

---

## 5. Logo

| Variant | Local file | S3 (PNG) | S3 (SVG) | Usage |
|---|---|---|---|---|
| `Logo_Dark` | `.claude/skills/brand-collaterals/assets/logos/Logo_Dark.svg` | [Logo_Dark.png](https://tranzact-data.s3.ap-south-1.amazonaws.com/Logo_Dark.png) | [Logo_Dark.svg](https://tranzact-data.s3.ap-south-1.amazonaws.com/Logo_Dark.svg) | On dark backgrounds |
| `Logo_Light` | `.claude/skills/brand-collaterals/assets/logos/Logo_Light.svg` | [Logo_Light.png](https://tranzact-data.s3.ap-south-1.amazonaws.com/Logo_Light.png) | [Logo_Light.svg](https://tranzact-data.s3.ap-south-1.amazonaws.com/Logo_Light.svg) | On light backgrounds |
| `Logoface` | `.claude/skills/brand-collaterals/assets/logos/Logoface.svg` | [Logoface.png](https://tranzact-data.s3.ap-south-1.amazonaws.com/Logoface.png) | [Logoface.svg](https://tranzact-data.s3.ap-south-1.amazonaws.com/Logoface.svg) | Icon-only mark — watermark corner bug, outro, small contexts |

Use the SVGs for anything that needs to scale (title cards, outros); PNGs are fine for quick previews/lower-res composites. Prefer SVG in the final render pipeline where the tool supports it.

- Never stretch, recolor, or add effects (glow, drop shadow, outline) to the logo itself.
- Keep clear space around the logo equal to the height of the icon mark, on all sides.
- For a persistent on-screen watermark/bug, use `Logoface` corner-anchored (bottom-right convention) at small scale — matches the deck-system rule of not letting the logo compete with content.
- Use the full lockup (`Logo_Dark`/`Logo_Light`) only on title and closing/outro cards.

---

## 6. Layout & Framing

- **Aspect ratio:** default to 16:9 for landscape video. If producing for social/vertical, treat 9:16 as a distinct reflow, not a crop — re-center safe areas, don't just letterbox.
- **Safe margins:** keep a consistent margin (~5% of frame width/height) so titles, lower-thirds, and the logo bug never run to the edge — matters for platform overscan/cropping.
- **One idea per frame/scene:** if a scene needs more than ~2 heading-level statements, split it into two scenes (same rule the deck system uses for slides).
- **Mode consistency:** pick dark or light for a given scene/sequence and hold it; use a deliberate mode-switch only for an intentional section break (e.g. dark open → light product-demo insert → dark close).

---

## 7. Do's and Don'ts (video-specific)

### Do
- Open on the dark canvas (`#0E0F0C`) with the particle/glow hero treatment for title cards
- Use Montserrat SemiBold for every on-screen title/headline, no exceptions
- Use the orange CTA glow for the one emphasized element per scene (stat, CTA, keyword)
- Use semantic tokens (by name) when briefing designers/render tools — never hand off a raw hex without its role
- Reserve `primary-brand` (`#DA5D37`) for large text (24px+ equivalent) only

### Don't
- Don't put small captions/body text in `primary` orange on a light frame — contrast fails; use `#BF4A25` (600) instead
- Don't mix Montserrat and Outfit at the same hierarchy level (e.g. don't make a sub-headline in Outfit sit visually equal to a Montserrat H3)
- Don't use font-weight 700 anywhere
- Don't carry print-adjusted hex values (`design-print.md`) into video — those are for physical print gamut only
- Don't swap status colors across modes (dark success ≠ light success hex)
- Don't use Inter outside its two roles (H6, `/Label`)
- Don't stretch, recolor, or add effects to the logo

---

## 8. Open Questions for a Video-Creation Agent

The source design system (`design-core.md`) is built for web/print/decks and doesn't yet define motion natively. Flag these to a human before finalizing video work — don't invent standardized values silently:

1. **No motion/animation tokens exist.** Easing curves, standard animation durations, and transition styles between scenes are undefined in the source system — the note above ("smooth, minimal, confident") is a tone guideline, not a spec. Confirm actual keyframe/easing values with design before locking a template.
2. **No voice/audio branding defined** (VO tone, music mood/BPM, sound-effect palette) — not covered by any existing brand doc.
3. **No safe-area spec for vertical (9:16) or square (1:1) formats** — only 16:9 is referenced (via the deck system), and only for slides, not video.
4. **No defined watermark opacity/size ratio for `Logoface`** as a persistent video bug — only "small, corner-anchored" is specified for decks.
5. **Particle background implementation is undocumented** — it's named as a signature but no reference asset, density, or speed spec exists yet; treat as "ask design for the reference file/video" rather than approximating from scratch.
