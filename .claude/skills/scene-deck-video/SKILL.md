---
name: scene-deck-video
description: Builds and renders dark-canvas, scene-based animated HTML product-demo / launch videos for TranZact (the "It knows / It thinks / It acts" chat-mockup style) — from a reusable template through browser preview to a finished MP4 with background music. Use when the user wants a new launch/demo video in this visual style, or wants to render/re-render an existing scene-deck HTML file to video.
---

# Scene-Deck Video — TranZact launch/demo videos

Produces the dark-canvas, orange-accent, chat-mockup style animated video used for
`Launch video/tranzact_launch_video.html` — a single HTML file that autoplays through a
sequence of full-screen "scenes" (statement beats + "type a question → AI responds" concept
demos), previewed live in a browser, then recorded to MP4 with music.

This is a **different system** from `/ad-video` (which builds short 10–15s React/Remotion
ads on a light/cream + green-accent brand for Meta). Don't conflate the two — this skill's
brand is dark `#0E0F0C` canvas + orange `#DA5D37` accent, single 16:9 format, vanilla
HTML/CSS/JS with no `useCanvas()`/responsive-format system.

Canonical source of truth for anything not covered here: `Launch video/Design.md` (brand
tokens) and the working example `Launch video/tranzact_launch_video.html` (most fully-
featured real deck built with this system — read it for precedent before inventing anything new).

---

## Step 0 — Gather requirements

Ask (or infer from the brief) before writing anything:

1. **Narrative arc** — how many "concept" groups (each is a title beat + 1+ mockup demos)?
   The reference deck uses 3: **It knows** (informational lookups), **It thinks**
   (judgment/approval calls), **It acts** (the AI performs an action). A new video doesn't
   need exactly 3 — it needs whatever number of distinct capability groups the brief calls for.
2. **Opening hook** — what's the tension/problem being set up before "what if it could run
   itself"? (S1–S5 in the template are one proven opening arc; reusable almost verbatim with
   new copy, or can be shortened/changed.)
3. **Per-concept demo content** — for each mockup: the typed question, and what the AI
   response should show (which representation from `reference/components.md` fits the data).
4. **Closing statement + tagline** — the two-line closing beat and the logo outro's tagline.
5. **Music track** — see § Music below. Ask for a mood if unclear; don't silently default
   without confirming, since it colors the whole video's feel.

---

## Step 1 — Build the deck

Copy `reference/template.html` to the target location (e.g. `Launch video/<name>.html`) and
customize:

1. Fill in every `[bracketed placeholder]` — S1–S5 opening beats, closing S14, logo tagline S17.
2. For each concept group: rename `s6`/`s6b` → distinct ids, add its `BIG_SCENES`/
   `SMALL_SCENES` entries in `enter()`, add its `SCENES` array entries + durations, add its
   `type()` input text + response reveal in `enter()`/`leave()`. Copy the pattern exactly —
   don't restructure it; consistency across concepts is what makes the deck read as one system.
3. Pick response representations per demo from `reference/components.md` — don't invent a
   6th pattern without a strong reason; the whole point of the catalog is visual consistency.
4. Update the `<title>` and the S17 logo `<img src>` if using a different logo variant
   (`Logo_Dark.svg` for dark backgrounds, `Logo_Light.svg` for light — per Design.md; the
   template defaults to `Logo_Light.svg`, matching what shipped in the reference deck).

### The "concept morph" pattern (don't skip this)

Every concept group gets **one** `#concept-morph` label that:
- Fades in **big and centered** on the concept's title scene (`BIG_SCENES` entry)
- **Shrinks to the top** on its mockup scene(s) without ever fading out (`SMALL_SCENES` entries)
- Stays in the small/top state across every mockup scene in the same group (add more ids to
  `SMALL_SCENES`, same text, for extra examples under one concept — no re-fade between them)
- Fades out crossing into a scene that isn't in either map (e.g. moving to a different concept
  group, or into the closing beats)

This is what makes "It knows" feel like one continuous idea across 3 demo screens instead of
3 separate title cards. Don't build a per-scene `.ctx-label` instead — that was the original
(worse) approach, superseded by this shared morph element. See `template.html`'s `enter()` for
the exact mechanism if unsure.

---

## Step 2 — Preview and iterate

```bash
open "<path/to/deck.html>"
```

Use the scrubber controls (prev/play-pause/next) to review every scene. **Never** ship without
watching the full loop at least once — timing bugs (stale text flashing before retyping,
responses that never get time to reveal before the scene ends) only show up in playback, not
in the source.

Common pitfalls (all hit and fixed once already — don't reintroduce them):

- **Stale text flash.** If a typing input's `<span>` isn't cleared in `leave()`, replaying
  that scene shows last time's *full* typed text for a beat before it clears and retypes.
  Every `ttN` span needs `document.getElementById('ttN').textContent=''` in `leave()`.
- **Window-size drift.** `.chat-shell.wide` has a shared `min-height:460px` so every mockup
  window renders at the identical size. If a response's content (extra header block, a big
  stat number, bordered/padded rows) pushes total content past ~460px, the box silently grows
  taller than every other frame — inconsistent and easy to miss without a direct comparison.
  Rule of thumb: never use `var(--fs-h)` for anything inside a `.rc` — that token is for full
  headline scenes only. Use `clamp(30px,3.5vw,42px)` for an in-card stat number instead.
- **Overlapping reveals.** Give real reading time between beats — 1.5–2s between a typed
  question finishing and the response appearing, similar gaps between staggered sub-lines.
  The template's timings (1500ms typing→response pause, 220–250ms stagger between rows) are
  tuned defaults; keep them unless the brief calls for a different pace.
- **One-line-only when the content needs to wrap.** If a response row's content doesn't fit
  the 820px shell width on one line at normal padding, don't blow out the shared window size to
  fit it — either shorten the content, or scope a local font-size reduction via a CSS custom
  property override (e.g. `style="--fs-p:11px"` on just that content's wrapper) so only that
  one instance shrinks, not the shared token everywhere else.

---

## Step 3 — Render to MP4 with music

```bash
npx playwright install chromium   # only if not already installed
npx tsx scripts/record-scene-deck.ts --input "<path/to/deck.html>" --music <track.mp3>
```

- `--output <path.mp4>` — defaults to the input path with `.mp4` extension
- `--duration <ms>` — only needed if the deck doesn't set `window.__deckDuration` (the
  template does this automatically; don't remove that line)
- `--width`/`--height` — default `1920x1080`; change only if a different aspect ratio is needed

**Why this script and not `scripts/render-html.ts`:** that pipeline drives HTML via a
`window.__stage.seek(t)` API for frame-by-frame capture — built for the React/Remotion
`useCanvas()` ad system. This scene-deck system is built on real-time `setTimeout`/
`requestAnimationFrame` timers, not a seekable API, so `record-scene-deck.ts` records
real-time playback with Playwright instead (same ffmpeg audio-mux/fade treatment as
`render-html.ts`'s `encode()` step, just without the seek dependency). Don't try to retrofit
a `seek()` API onto this system — it would mean converting every timer-driven reveal into a
pure function of elapsed-time, which is a much larger and riskier rewrite than the real-time-
capture approach buys back.

### Music

Library: `Ads/remotion/public/audio/` (see `TRACKS.md` there for the full mood list — same
library `/ad-video` draws from). Pick to match the **emotional arc**, not the literal topic:
- Problem → resolution narratives (most launch videos): `epic-blockbuster.mp3` (dramatic
  cinematic build) or `patron-saint-of-heists.mp3` (slick, confident, modern)
- Tech/AI-forward product showcase: `chronos.mp3` (electronic, pulsing)
- Fast operational/workflow feel: `city-run.mp3` or `chase-pulse-faster.mp3`

Avoid vocals (they compete with on-screen text) and confirm the pick with the user rather
than silently defaulting — it colors the whole video's feel and is a legitimate taste call,
not a technical one.

---

## Not this skill's job

- Short-form Meta ad videos in 3 canvas sizes (square/vertical/horizontal) — use `/ad-video`
- Editing an already-rendered MP4 (trimming, adding captions, etc.) — use a general video tool
- Choosing whether/when to ship a video, or ad performance analysis — outside scope
