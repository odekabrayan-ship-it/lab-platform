import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACT_DIR = 'C:\\Users\\labuser\\.gemini\\antigravity\\brain\\ec2b14a5-a8d1-48c8-b724-738c95a2ef28';

async function run() {
  console.log("=== INITIATING VISIBLE CHROME LIMS DASHBOARD VERIFICATION PROTOCOL ===");

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

  // Launch browser in visible and maximized mode
  const browser = await puppeteer.launch({
    executablePath,
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized'
    ]
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[BROWSER EXCEPTION] ${err.toString()}`));

  try {
    // 1. Navigate to Login Page
    console.log("Navigating to http://localhost:5173/login...");
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // 2. Pre-fill Laboratory Credentials
    console.log("Pre-filling newly verified Laboratory Credentials...");
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'automated.lab.1779396925865@sovereignlabs.com', { delay: 50 });
    await page.type('input[type="password"]', 'ControlQuality2026!', { delay: 50 });
    
    // Click Authorize Entry
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

    // 3. Wait for redirection to LIMS Dashboard
    console.log("Waiting for redirection to '/dashboard'...");
    await page.waitForFunction(() => window.location.href.includes('/dashboard'), { timeout: 15000 });
    await new Promise(r => setTimeout(r, 4000));

    // Capture Dashboard Screen
    const dashboardSnapshotPath = path.join(ARTIFACT_DIR, 'lab_dashboard.png');
    await page.screenshot({ path: dashboardSnapshotPath });
    console.log(`Captured LIMS Dashboard screen at: ${dashboardSnapshotPath}`);

    // 4. Navigate to /equipment
    console.log("Navigating to http://localhost:5173/equipment...");
    await page.goto('http://localhost:5173/equipment', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    const equipmentSnapshotPath = path.join(ARTIFACT_DIR, 'lab_equipment.png');
    await page.screenshot({ path: equipmentSnapshotPath });
    console.log(`Captured LIMS Metrology Assets screen at: ${equipmentSnapshotPath}`);

    // 5. Navigate to /methods
    console.log("Navigating to http://localhost:5173/methods...");
    await page.goto('http://localhost:5173/methods', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    const methodsSnapshotPath = path.join(ARTIFACT_DIR, 'lab_methods.png');
    await page.screenshot({ path: methodsSnapshotPath });
    console.log(`Captured LIMS Authorized Methods screen at: ${methodsSnapshotPath}`);

    // 6. Navigate to /samples
    console.log("Navigating to http://localhost:5173/samples...");
    await page.goto('http://localhost:5173/samples', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    const samplesSnapshotPath = path.join(ARTIFACT_DIR, 'lab_samples.png');
    await page.screenshot({ path: samplesSnapshotPath });
    console.log(`Captured LIMS Ingested Samples screen at: ${samplesSnapshotPath}`);

    console.log("\n=======================================================");
    console.log("SUCCESS: All LIMS modules verified and captured successfully!");
    console.log("=======================================================\n");

    // We can keep the browser active for review, but since we got the screenshots we can close it or keep it open.
    // Let's close it so the script finishes cleanly.
    await browser.close();
  } catch (err) {
    console.error("AN ERROR OCCURRED DURING LAB DASHBOARD VERIFICATION:", err);
    try {
      const errorScreenshot = path.join(ARTIFACT_DIR, 'lab_verification_error.png');
      await page.screenshot({ path: errorScreenshot });
      console.log(`Saved error screenshot at: ${errorScreenshot}`);
    } catch (ssErr) {
      console.error("Failed to capture error screenshot:", ssErr);
    }
    await browser.close();
    process.exit(1);
  }
}

run();
