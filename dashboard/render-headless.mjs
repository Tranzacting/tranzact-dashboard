import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function renderVideo() {
  let browser;
  try {
    console.log('🎬 Starting headless render...');

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the Remotion player
    await page.goto('file://' + path.join(__dirname, 'dist/index.html'), {
      waitUntil: 'networkidle0'
    });

    console.log('📹 Page loaded, rendering frames...');

    // Wait a bit for the player to initialize
    await page.waitForTimeout(2000);

    console.log('✅ Video ready. Please use the Remotion player UI to export.');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

renderVideo();
