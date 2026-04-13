import { renderMedia } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function render() {
  try {
    console.log("🎬 Starting Remotion render via web server...");

    // Use the built dist/index.html
    const serveUrl = "http://localhost:3000";

    await renderMedia({
      composition: "UsersTeamsVideo",
      serveUrl,
      codec: "h264",
      outputLocation: path.join(__dirname, "../Ads/output-video.mp4"),
      inputProps: {},
    });

    console.log("✅ Video rendered successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Render failed:", err);
    process.exit(1);
  }
}

render();
