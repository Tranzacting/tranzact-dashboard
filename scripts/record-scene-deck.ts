/**
 * Records a "scene-deck" style animated HTML file (see .claude/skills/scene-deck-video/)
 * in real time via Playwright — these decks are built on real-time timers
 * (setTimeout/requestAnimationFrame), not a seekable API, so we capture playback
 * as-is rather than using render-html.ts's frame-by-frame seek approach — then
 * muxes in a music track with ffmpeg (same volume/fade-out treatment as
 * render-html.ts's encode() step).
 *
 * The deck must expose `window.__deckDuration` (total ms of one full loop through
 * its SCENES array) so duration can be auto-detected — see the skill's template.html.
 *
 * Playwright's video recorder does not capture page audio at all, so any VO
 * playing live in the deck (e.g. for preview sync) never makes it into the
 * recording — pass --vo to mux real VO clips in at specific timestamps, with
 * the music automatically ducking under them (deterministic volume dip over
 * each VO's known start/end window, not sidechain compression — compression
 * was tried first but a quiet/conversational VO track never pushed the
 * sidechain's input level past its threshold enough to trigger a real duck).
 *
 * Usage:
 *   npx tsx scripts/record-scene-deck.ts --input "Launch video/deck.html" [--music <track.mp3>|none] [--vo "path@delayMs,path@delayMs"] [--output <path.mp4>] [--duration <ms>] [--width 1920] [--height 1080]
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve, dirname, basename, extname } from "node:path";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const input = get("--input");
  if (!input) {
    console.error(
      'Usage: --input <path/to/deck.html> [--music <track.mp3>|none] [--vo "path@delayMs,path@delayMs"] [--output <path.mp4>] [--duration <ms>] [--width 1920] [--height 1080]'
    );
    process.exit(1);
  }
  const musicArg = get("--music");
  const voArg = get("--vo");
  const vo = voArg
    ? voArg.split(",").map((pair) => {
        const [file, delay] = pair.split("@");
        return { path: resolve(file), delayMs: parseInt(delay, 10) };
      })
    : [];
  return {
    input: resolve(input),
    output: get("--output") ? resolve(get("--output")!) : undefined,
    // no default track — music is a taste call, not something to silently
    // pick. Pass --music none explicitly for a silent/video-only render.
    music: musicArg === "none" ? null : musicArg ?? null,
    vo,
    durationMs: get("--duration") ? parseInt(get("--duration")!, 10) : undefined,
    width: parseInt(get("--width") ?? "1920", 10),
    height: parseInt(get("--height") ?? "1080", 10),
  };
}

const AUDIO_DIR = resolve("Ads/remotion/public/audio");

async function main() {
  const { input, output, music, vo, durationMs: argDuration, width, height } = parseArgs();

  if (!existsSync(input)) {
    console.error(`❌  HTML not found: ${input}`);
    process.exit(1);
  }
  const musicPath = music ? resolve(AUDIO_DIR, music) : null;
  if (musicPath && !existsSync(musicPath)) {
    console.error(`❌  Music not found: ${musicPath}`);
    console.error(`    Available: ${AUDIO_DIR}`);
    process.exit(1);
  }
  if (!musicPath) {
    console.log("🔇  No music — rendering silent/video-only (pass --music <track.mp3> to add one)");
  }
  const voWithDuration = vo.map((clip) => {
    if (!existsSync(clip.path)) {
      console.error(`❌  VO clip not found: ${clip.path}`);
      process.exit(1);
    }
    const durationSec = parseFloat(
      execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${clip.path}"`
      )
        .toString()
        .trim()
    );
    return { ...clip, durationSec };
  });
  if (vo.length) {
    console.log(`🎙  ${vo.length} VO clip(s) — music will duck under them automatically`);
  }

  const outMp4 = output ?? resolve(dirname(input), `${basename(input, extname(input))}.mp4`);
  const tmpDir = resolve(dirname(input), `_record_tmp_${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  console.log(`🌐  Loading ${input}...`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: tmpDir, size: { width, height } },
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.error("  [pageerror]", err.message));

  await page.goto(`file://${input}`, { waitUntil: "networkidle" });

  // some decks start paused (to satisfy the browser's audio-autoplay policy
  // in interactive preview — the first Play click doubles as the user
  // gesture that unlocks audio). Recording doesn't capture page audio at
  // all, so that safeguard is irrelevant here, but the deck still won't
  // advance past scene 1 unless something clicks Play — so click it.
  const playBtn = await page.$("#btn-play");
  if (playBtn) await playBtn.click();

  // hide the scrubber UI (prev/play/next, progress bar) from the recording —
  // the skill's template ids these #controls / #progress
  await page.addStyleTag({ content: "#controls,#progress{display:none!important}" });

  let durationMs = argDuration;
  if (!durationMs) {
    durationMs = await page.evaluate(() => (window as any).__deckDuration);
    if (!durationMs) {
      console.error(
        "❌  Could not auto-detect duration — deck must set window.__deckDuration, or pass --duration <ms> explicitly."
      );
      await context.close();
      await browser.close();
      rmSync(tmpDir, { recursive: true, force: true });
      process.exit(1);
    }
    console.log(`⏱  Auto-detected duration: ${durationMs}ms`);
  }

  console.log(`🔴  Recording ${(durationMs / 1000).toFixed(1)}s at ${width}x${height}...`);
  await page.waitForTimeout(durationMs);

  await context.close();
  await browser.close();

  const webm = readdirSync(tmpDir).find((f) => f.endsWith(".webm"));
  if (!webm) {
    console.error("❌  No recording produced");
    process.exit(1);
  }
  const webmPath = resolve(tmpDir, webm);

  const durationSec = durationMs / 1000;
  const fadeStart = Math.max(0, durationSec - 1.5);

  let cmd: string;
  if (vo.length && musicPath) {
    // music + VO, with the music dipping under each VO clip's known window.
    // (deterministic volume:enable duck, not sidechain compression — the
    // conversational VO tracks here never sit loud/dense enough to reliably
    // trip a compressor's threshold, so the duck needs to be driven off the
    // clips' own timing rather than their live signal level.)
    console.log(`🔧  Muxing music (${music}) + ${vo.length} VO clip(s), ducked, encoding → ${outMp4}`);
    const inputs = [`-i "${webmPath}"`, `-i "${musicPath}"`, ...vo.map((c) => `-i "${c.path}"`)];
    const voLabels = vo.map((c, i) => {
      const idx = i + 2; // 0=video, 1=music, 2..=vo clips
      return `[${idx}:a]adelay=${c.delayMs}:all=1,aformat=channel_layouts=stereo[vo${i}]`;
    });
    const voMixInputs = vo.map((_, i) => `[vo${i}]`).join("");
    // duck window per clip: 0.3s lead-in before the VO starts, 0.5s release
    // after it ends, clamped to the render's bounds.
    const LEAD_IN = 0.3;
    const RELEASE = 0.5;
    const duckWindows = voWithDuration.map((c) => {
      const start = Math.max(0, c.delayMs / 1000 - LEAD_IN);
      const end = Math.min(durationSec, c.delayMs / 1000 + c.durationSec + RELEASE);
      return `between(t,${start.toFixed(3)},${end.toFixed(3)})`;
    });
    const duckEnable = duckWindows.join("+");
    const filter = [
      ...voLabels,
      // apad — safety net so the VO submix always spans the full render even
      // if the last VO clip ends well before the video does.
      `${voMixInputs}amix=inputs=${vo.length}:duration=longest:dropout_transition=0,volume=${vo.length},apad[voall]`,
      `[1:a]aloop=loop=-1:size=2e9,atrim=0:${durationSec},asetpts=PTS-STARTPTS,volume=0.55,aformat=channel_layouts=stereo,volume=0.25:enable='${duckEnable}'[musduck]`,
      `[musduck][voall]amix=inputs=2:duration=first:dropout_transition=0:weights='1 1.4'[amixed]`,
      `[amixed]afade=t=out:st=${fadeStart}:d=1.5[a]`,
      `[0:v]fade=t=out:st=${fadeStart}:d=1.5[v]`,
    ].join(";");
    cmd = [
      "ffmpeg -y",
      ...inputs,
      `-filter_complex "${filter}"`,
      `-map "[v]" -map "[a]"`,
      `-t ${durationSec}`,
      `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p`,
      `-c:a aac -b:a 160k`,
      `-movflags +faststart`,
      `"${outMp4}"`,
    ].join(" ");
  } else if (vo.length) {
    // VO only, no music to duck
    console.log(`🔧  Muxing ${vo.length} VO clip(s) (no music), encoding → ${outMp4}`);
    const inputs = [`-i "${webmPath}"`, ...vo.map((c) => `-i "${c.path}"`)];
    const voLabels = vo.map((c, i) => {
      const idx = i + 1;
      return `[${idx}:a]adelay=${c.delayMs}:all=1,aformat=channel_layouts=stereo[vo${i}]`;
    });
    const voMixInputs = vo.map((_, i) => `[vo${i}]`).join("");
    const filter = [
      ...voLabels,
      `${voMixInputs}amix=inputs=${vo.length}:duration=longest:dropout_transition=0,volume=${vo.length},afade=t=out:st=${fadeStart}:d=1.5[a]`,
      `[0:v]fade=t=out:st=${fadeStart}:d=1.5[v]`,
    ].join(";");
    cmd = [
      "ffmpeg -y",
      ...inputs,
      `-filter_complex "${filter}"`,
      `-map "[v]" -map "[a]"`,
      `-t ${durationSec}`,
      `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p`,
      `-c:a aac -b:a 160k`,
      `-movflags +faststart`,
      `"${outMp4}"`,
    ].join(" ");
  } else if (musicPath) {
    console.log(`🔧  Muxing music (${music}) and encoding → ${outMp4}`);
    cmd = [
      "ffmpeg -y",
      `-i "${webmPath}"`,
      `-i "${musicPath}"`,
      `-filter_complex "[0:v]fade=t=out:st=${fadeStart}:d=1.5[v];[1:a]aformat=fltp:44100:stereo,volume=0.65,afade=t=out:st=${fadeStart}:d=1.5[a]"`,
      `-map "[v]" -map "[a]"`,
      `-t ${durationSec}`,
      `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p`,
      `-c:a aac -b:a 128k`,
      `-movflags +faststart`,
      `"${outMp4}"`,
    ].join(" ");
  } else {
    console.log(`🔧  Encoding (no audio) → ${outMp4}`);
    cmd = [
      "ffmpeg -y",
      `-i "${webmPath}"`,
      `-filter_complex "[0:v]fade=t=out:st=${fadeStart}:d=1.5[v]"`,
      `-map "[v]"`,
      `-t ${durationSec}`,
      `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p`,
      `-movflags +faststart`,
      `"${outMp4}"`,
    ].join(" ");
  }
  execSync(cmd, { stdio: "inherit" });

  rmSync(tmpDir, { recursive: true, force: true });
  console.log(`\n✅  Done: ${outMp4}`);
}

main().catch((e) => {
  console.error("❌ ", e);
  process.exit(1);
});
