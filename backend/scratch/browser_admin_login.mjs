import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACT_DIR = 'C:\\Users\\labuser\\.gemini\\antigravity\\brain\\ec2b14a5-a8d1-48c8-b724-738c95a2ef28';

async function run() {
  console.log("Starting visible Chrome automated Super Admin Nexus dashboard authorization...");

  // Locate Google Chrome executable
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const alternateChromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  let executablePath = '';

  if (fs.existsSync(chromePath)) {
    executablePath = chromePath;
  } else if (fs.existsSync(alternateChromePath)) {
    executablePath = alternateChromePath;
  } else {
    console.error("CRITICAL ERROR: Google Chrome executable was not found on standard paths!");
    process.exit(1);
  }

  console.log(`Using Chrome Executable at: ${executablePath}`);

  // Launch browser with headless: false to make it completely visible and interactive
  const browser = await puppeteer.launch({
    executablePath,
    headless: false, // Visible Mode!
    defaultViewport: null, // Respect window size/resolution
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized' // Open in full screen for maximum visibility
    ]
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  // Log browser console messages
  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[BROWSER EXCEPTION] ${err.toString()}`));

  try {
    // 1. Navigate to Login Page
    console.log("Navigating to http://localhost:5173/login...");
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // Allow animations to complete

    // 2. Pre-fill Admin Credentials
    console.log("Pre-filling Super Admin Credentials...");
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Type credentials
    await page.type('input[type="email"]', 'admin@qualicore.com', { delay: 50 });
    await page.type('input[type="password"]', 'password123', { delay: 50 });
    
    // Take pre-submit screenshot for visual confirmation
    const loginSnapshotPath = path.join(ARTIFACT_DIR, 'admin_login_pre_submit.png');
    await page.screenshot({ path: loginSnapshotPath });
    console.log(`Saved pre-submit login screenshot: ${loginSnapshotPath}`);

    // 3. Click Authorize Entry
    console.log("Clicking 'Authorize Entry'...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const authBtn = buttons.find(b => b.textContent.includes('Authorize Entry'));
      if (authBtn) {
        authBtn.click();
      } else {
        throw new Error("Could not find 'Authorize Entry' button");
      }
    });

    // 4. Wait for redirection to Admin Nexus Dashboard
    console.log("Waiting for redirection to '/admin/nexus'...");
    await page.waitForFunction(() => window.location.href.includes('/admin/nexus'), { timeout: 15000 });
    await new Promise(r => setTimeout(r, 4000)); // Allow list and UI animations to fully load

    // 5. Capture High-Fidelity Screenshot of the Nexus Dashboard
    const dashboardSnapshotPath = path.join(ARTIFACT_DIR, 'admin_nexus.png');
    await page.screenshot({ path: dashboardSnapshotPath, fullPage: false });
    console.log(`Successfully captured Super Admin Nexus Dashboard screenshot: ${dashboardSnapshotPath}`);

    console.log("\n=======================================================");
    console.log("SUCCESS: Automated login completed!");
    console.log("Google Chrome remains active and visible on your screen.");
    console.log("You can now review the newly registered Laboratory profiles.");
    console.log("=======================================================\n");

    // Do NOT call browser.close() so Chrome stays fully active and open!
  } catch (err) {
    console.error("AN ERROR OCCURRED DURING AUTO-LOGIN:", err);
    try {
      const errorScreenshot = path.join(ARTIFACT_DIR, 'admin_login_error.png');
      await page.screenshot({ path: errorScreenshot });
      console.log(`Saved error screenshot at: ${errorScreenshot}`);
    } catch (ssErr) {
      console.error("Failed to capture error screenshot:", ssErr);
    }
    // We close the browser only if an error happens during the login sequence itself
    await browser.close();
    process.exit(1);
  }
}

run();
