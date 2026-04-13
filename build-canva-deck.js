const puppeteer = require('puppeteer');
const fs = require('fs');

// Deck content
const SLIDES = [
  {
    name: "Slide 1: Title",
    content: [
      { type: "title", text: "Protect Your Business. Empower Your People.", fontSize: 48 },
      { type: "subtitle", text: "Comprehensive & De-risked POSH Compliance by POSH360", fontSize: 24 },
      { type: "footer", text: "A Proven Framework for Forward-Thinking Leaders", fontSize: 14 }
    ]
  },
  {
    name: "Slide 2: Hidden Liability",
    content: [
      { type: "title", text: "⚠️ One Allegation Away From Crisis", fontSize: 36 },
      { type: "subtitle", text: "Non-compliance isn't a policy gap—it's a legal minefield. Are you prepared for the fallout?", fontSize: 14 },
      { type: "body", text: "🚨 Immediate Financial Exposure\n₹50,000+ fines for first offense. Repeat violations multiply exponentially.\nAverage defense cost: ₹5-10 lakhs+", fontSize: 11 },
      { type: "body", text: "⚠️ License Cancellation & Shutdown Risk\nOne regulatory audit leads to business license cancellation and operational shutdown.\nYour customers won't wait—contracts may be void.", fontSize: 11 },
      { type: "body", text: "👤 Personal Criminal Liability for Directors\nYou're personally liable. Prison time is possible. Directors prosecuted under IPC.\nInsurance won't cover willful non-compliance.", fontSize: 11 },
      { type: "body", text: "💥 Irreparable Reputational Collapse\nOne allegation goes viral. Investors pull funding. Clients terminate contracts. Top talent flees.\nRecovery: 18-24 months minimum.", fontSize: 11 }
    ]
  },
  {
    name: "Slide 3: Why POSH Compliance Matters",
    content: [
      { type: "title", text: "Why POSH Compliance Matters", fontSize: 36 },
      { type: "subtitle", text: "More than a legal mandate—it's a critical corporate safeguard", fontSize: 14 },
      { type: "body", text: "🛡️ Proactive Lawsuit Protection\nA strong framework significantly mitigates costly litigation risks.\n• Documented processes\n• Trained personnel\n• Incident tracking", fontSize: 11 },
      { type: "body", text: "📈 Investor & Partner Readiness\nInstitutional investors mandate strict ESG and POSH compliance during due diligence.\n• Compliance certifications\n• Audited processes\n• Risk mitigation proof", fontSize: 11 },
      { type: "body", text: "👥 High-Performance Culture\nSafe environments boost employee retention and productivity.\n• Better talent acquisition\n• Higher retention rates\n• Positive employer brand", fontSize: 11 }
    ]
  },
  {
    name: "Slide 4: Why POSH360",
    content: [
      { type: "title", text: "Why POSH360? The Smarter Way to Comply", fontSize: 36 },
      { type: "subtitle", text: "We take the headache out of compliance so you can focus on growth", fontSize: 14 },
      { type: "body", text: "✅ Complete Automation & Tracking\nSeamless dashboard to monitor compliance status, complaints, and training completion in real-time.", fontSize: 11 },
      { type: "body", text: "✅ Expert External Members\nHighly experienced legal professionals serve as your mandated IC member.", fontSize: 11 },
      { type: "body", text: "✅ High-Impact Sensitization\nEngaging, scenario-based workshops tailored for employees, managers, and IC.", fontSize: 11 },
      { type: "body", text: "✅ End-to-End Management\nFrom drafting policies to resolving complaints and filing annual returns—we handle it all.", fontSize: 11 }
    ]
  },
  {
    name: "Slide 5: Trusted by 100+ Companies",
    content: [
      { type: "title", text: "Trusted by 100+ Companies", fontSize: 36 },
      { type: "subtitle", text: "Proven excellence across tech, finance, retail, manufacturing, healthcare & legal", fontSize: 14 },
      { type: "highlight", text: "100+", fontSize: 56 },
      { type: "body", text: "⭐⭐⭐⭐⭐ (4.8/5 Rating)\n\"POSH360 transformed our compliance from a stressful annual chore into a seamless, automated process. Their team is exceptionally professional and discreet.\"\n— CEO, Tech Startup", fontSize: 10 },
      { type: "body", text: "⭐⭐⭐⭐⭐ (4.8/5 Rating)\n\"An indispensable partner for our growing organization. They helped us navigate complex inquiries with zero legal friction.\"\n— HR Head, Financial Services", fontSize: 10 },
      { type: "body", text: "🎯 4.8/5 Average Rating | ✅ Zero Cases Escalated | 🏆 98% Compliance Rate", fontSize: 10 }
    ]
  },
  {
    name: "Slide 6: Expert Team",
    content: [
      { type: "title", text: "The Experts Protecting Your Business", fontSize: 36 },
      { type: "subtitle", text: "Legal stalwarts, HR veterans, and compliance specialists", fontSize: 14 },
      { type: "body", text: "⚖️ Founder & Legal Lead\n15+ years in corporate law and workplace compliance\n• Practicing advocate, labor law specialist\n• Board advisor to 3+ multinational companies", fontSize: 11 },
      { type: "body", text: "📋 Legal Advisory Panel\nPracticing advocates with deep expertise in labor laws and POSH Act adjudication", fontSize: 11 },
      { type: "body", text: "🎓 Certified Trainers & Psychologists\nSpecialized in workplace behavioral training and conflict resolution", fontSize: 11 },
      { type: "body", text: "🤝 Dedicated Support Team\nAvailable 24/7 for complaints, guidance, and compliance queries", fontSize: 11 }
    ]
  },
  {
    name: "Slide 7: Call to Action",
    content: [
      { type: "title", text: "Secure Your Organization Today", fontSize: 40 },
      { type: "subtitle", text: "Don't wait for a crisis to expose your vulnerability", fontSize: 16 },
      { type: "body", text: "Step 1: Schedule a 15-minute compliance audit call (15 mins)", fontSize: 12 },
      { type: "body", text: "Step 2: Receive customized gap-analysis report (48 hours)", fontSize: 12 },
      { type: "body", text: "Step 3: Onboard with POSH360 & achieve 100% compliance (30 days)", fontSize: 12 },
      { type: "body", text: "🌐 Website: posh360.in\n📧 Email: sales@posh360.in\n📱 Phone: [Your Phone]\n💬 WhatsApp: [Your WhatsApp]", fontSize: 10 }
    ]
  }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buildCanvaDeck() {
  let browser;
  try {
    console.log("🚀 Launching Canva Automation Script");
    console.log("═══════════════════════════════════════════════════════\n");

    console.log("📱 Starting browser...");
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Prevent detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log("🌐 Navigating to Canva...");
    await page.goto('https://www.canva.com/create/presentation/a4', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log("⏳ Waiting for editor to load...");
    await sleep(5000);

    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="editor"]') ||
             !!document.querySelector('.workbench') ||
             !!document.querySelector('[class*="canvas"]');
    });

    if (!isLoggedIn) {
      console.log("\n🔐 LOGIN REQUIRED");
      console.log("═══════════════════════════════════════════════════════");
      console.log("Please log in to Canva in the browser window that opened.");
      console.log("Once logged in and you see the editor canvas, I'll continue...\n");

      // Wait for editor to appear
      let loginAttempts = 0;
      while (loginAttempts < 180) {
        const editorExists = await page.evaluate(() => {
          return !!document.querySelector('[data-testid="editor"]') ||
                 !!document.querySelector('.workbench') ||
                 document.querySelectorAll('[class*="canvas"]').length > 0;
        });

        if (editorExists) {
          console.log("✅ Logged in successfully! Starting design automation...\n");
          break;
        }

        await sleep(1000);
        loginAttempts++;

        if (loginAttempts % 30 === 0) {
          console.log(`⏳ Still waiting... (${loginAttempts}s elapsed)`);
        }
      }

      if (loginAttempts >= 180) {
        console.log("❌ Login timeout. Please try again.");
        return;
      }
    } else {
      console.log("✅ Already logged in!\n");
    }

    console.log("🎨 Starting Slide Creation");
    console.log("═══════════════════════════════════════════════════════\n");

    // Inject CSS for colors
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.innerHTML = `
        .posh-title { color: #1B3A6B; font-weight: bold; }
        .posh-subtitle { color: #2C3E50; }
        .posh-accent { color: #E63946; }
      `;
      document.head.appendChild(style);
    });

    // For each slide after the first, add a new slide
    for (let i = 1; i < SLIDES.length; i++) {
      console.log(`📄 Adding Slide ${i + 1}: ${SLIDES[i].name}...`);

      try {
        // Find and click "Add slide" button
        const addSlideClicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
          const addBtn = buttons.find(btn =>
            btn.textContent.includes('Add') ||
            btn.textContent.includes('add') ||
            btn.getAttribute('aria-label')?.includes('add')
          );
          if (addBtn) {
            addBtn.click();
            return true;
          }
          return false;
        });

        if (addSlideClicked) {
          console.log(`  ✅ Slide added`);
          await sleep(1000);
        }
      } catch (e) {
        console.log(`  ⚠️ Could not auto-add slide, you may need to add it manually`);
      }
    }

    console.log("\n✨ Automation Complete!");
    console.log("═══════════════════════════════════════════════════════");
    console.log("\n📝 MANUAL STEPS NEEDED:");
    console.log("Due to Canva's complex DOM and dynamic rendering, you'll need to:");
    console.log("1. Manually add text boxes for each slide");
    console.log("2. Apply formatting using the color palette");
    console.log("\n📋 Use these guides for easy copy-paste:");
    console.log("   • QUICK_COPY_PASTE_GUIDE.md");
    console.log("   • CANVA_BUILD_INSTRUCTIONS.md");
    console.log("\n🎨 Color Palette to apply:");
    console.log("   • Primary Blue: #1B3A6B");
    console.log("   • Accent Red: #E63946");
    console.log("   • Text Gray: #2C3E50");
    console.log("   • Gold: #D4AF37\n");
    console.log("Keep the browser open for manual editing.");
    console.log("Browser will close in 30 minutes automatically.\n");

    // Keep browser open for user to manually add content
    console.log("⏱️ Browser staying open for 30 minutes...");
    await sleep(1800000); // 30 minutes

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\nDebugging info:");
    console.log("Make sure:");
    console.log("• You're connected to the internet");
    console.log("• Canva.com is not blocked");
    console.log("• Your Canva account is active\n");
  } finally {
    if (browser) {
      console.log("\n🔒 Closing browser...");
      await browser.close();
      console.log("Done!");
    }
  }
}

// Run the automation
buildCanvaDeck().catch(console.error);
