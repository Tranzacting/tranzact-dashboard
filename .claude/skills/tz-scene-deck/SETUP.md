# Scene-Deck Video — Setup

One-time setup per machine before this skill can preview or render a deck.

## 1. Clone/pull the repo

```bash
git clone https://github.com/Tranzacting/tranzact-dashboard.git
# or, if you already have it:
git pull origin main
```

This gets you `.claude/skills/scene-deck-video/`, `scripts/record-scene-deck.ts`, and the
reference deck at `Launch video/V2/tranzact_launch_video.html`.

## 2. Install Node dependencies

```bash
npm install
```

Installs `playwright` and `tsx`, both required by the render step.

## 3. Install ffmpeg

`ffmpeg` is a system dependency, not an npm package — install it separately:

```bash
brew install ffmpeg        # macOS
```

Used to mux/fade the background music track onto the recorded video.

## 4. Install the Playwright browser

```bash
npx playwright install chromium
```

One-time per machine. Skip if you've already run this for another Playwright-based script
in this repo (e.g. `/ad-video`'s render pipeline).

## 5. Get the music library

`Ads/remotion/public/audio/` (mp3 tracks + `TRACKS.md`) is excluded from git under the
repo's large-asset policy — it won't come down with `git pull`. Ask Koushik or #marketing
for the current audio folder and drop it in at that path before rendering with music.

## Verify

```bash
open "Launch video/V2/tranzact_launch_video.html"          # step 2: preview in browser
npx tsx scripts/record-scene-deck.ts \
  --input "Launch video/V2/tranzact_launch_video.html" \
  --music "Ads/remotion/public/audio/<track>.mp3"           # step 3: render to MP4
```

If both commands run without error, setup is complete. See `SKILL.md` for the full workflow.
