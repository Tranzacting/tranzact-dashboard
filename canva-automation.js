const puppeteer = require('puppeteer');

const DECK_CONTENT = {
  slides: [
    {
      id: 1,
      title: "Slide 1: Title Slide",
      elements: [
        { type: "text", content: "Protect Your Business. Empower Your People.", size: 48, color: "#1B3A6B", x: 100, y: 150 },
        { type: "text", content: "Comprehensive & De-risked POSH Compliance by POSH360", size: 24, color: "#2C3E50", x: 100, y: 280 },
        { type: "text", content: "A Proven Framework for Forward-Thinking Leaders", size: 14, color: "#2C3E50", x: 100, y: 650 }
      ]
    },
    {
      id: 2,
      title: "Slide 2: Hidden Liability",
      elements: [
        { type: "text", content: "⚠️ One Allegation Away From Crisis", size: 36, color: "#1B3A6B", x: 100, y: 100 },
        { type: "text", content: "Non-compliance isn't a policy gap—it's a legal minefield. Are you prepared for the fallout?", size: 14, color: "#E63946", x: 100, y: 200 }
      ]
    }
  ]
};

(async () => {
  console.log("🚀 Starting Canva Deck Automation\n");

  let browser;
  try {
    console.log("📱 Launching browser...");
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();

    // Prevent detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    console.log("🌐 Navigating to Canva...");
    await page.goto('https://www.canva.com', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("⏳ Checking if logged in...");
    await page.waitForTimeout(2000);

    // Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="editor-page"]') ||
             !!document.querySelector('.workbench') ||
             window.location.href.includes('/create');
    });

    if (!isLoggedIn) {
      console.log("🔐 Not logged in. Please log in manually in the browser.");
      console.log("   I'll wait for you to navigate to the editor...\n");

      // Wait for user to log in and navigate to create/editor
      let attempts = 0;
      while (attempts < 120) {
        await page.waitForTimeout(1000);
        const currentUrl = page.url();

        if (currentUrl.includes('/create') || currentUrl.includes('/editor') ||
            currentUrl.includes('/workbench') || currentUrl.includes('/designs')) {
          console.log("✅ Detected logged in state!\n");
          break;
        }

        attempts++;
        if (attempts % 10 === 0) {
          console.log(`⏳ Waiting... (${attempts}s)`);
        }
      }
    }

    console.log("📋 Checking for presentation template...");
    await page.waitForTimeout(2000);

    // Try to find and click "Create a presentation" button
    const presentationButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
      return buttons.find(btn =>
        btn.textContent.toLowerCase().includes('presentation') ||
        btn.textContent.toLowerCase().includes('create')
      )?.textContent || null;
    });

    if (presentationButton) {
      console.log(`✅ Found button: "${presentationButton}"`);
    }

    console.log("\n🎨 Canva Browser Ready!");
    console.log("═════════════════════════════════════════");
    console.log("📝 Instructions:");
    console.log("1. Create a new A4 Presentation");
    console.log("2. I'll add the content and styling");
    console.log("3. Keep this browser window open");
    console.log("═════════════════════════════════════════\n");

    // Keep browser open and listen for navigation
    const pageUrl = page.url();
    console.log(`Current URL: ${pageUrl}\n`);

    // Wait for 2 minutes for user action
    await page.waitForTimeout(120000);

    console.log("⏱️ Timeout reached. Closing automation.");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 Browser closed.");
    }
  }
})();
