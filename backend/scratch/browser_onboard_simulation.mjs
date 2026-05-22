import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACT_DIR = 'C:\\Users\\labuser\\.gemini\\antigravity\\brain\\ec2b14a5-a8d1-48c8-b724-738c95a2ef28';

async function run() {
  console.log("Starting E2E Browser-Driven ISO-17025 Laboratory Onboarding Wizard Simulation...");

  // Locate Chrome
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

  // Launch browser
  const browser = await puppeteer.launch({
    executablePath,
    headless: true, // Run headless so it executes smoothly in the background
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Log browser console messages
  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[BROWSER EXCEPTION] ${err.toString()}`));

  try {
    // 1. Navigate to Register
    console.log("Navigating to http://localhost:5173/register...");
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // wait for fade-in animations

    // 2. Select "Industrial Entity" Persona Card
    console.log("Selecting 'Industrial Entity' (Manufacturing/Labs) Persona...");
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('h3'));
      const industrialCard = cards.find(c => c.textContent.includes('Industrial Entity'));
      if (industrialCard) {
        industrialCard.click();
      } else {
        throw new Error("Could not find Industrial Entity card");
      }
    });

    await new Promise(r => setTimeout(r, 1000));

    // 3. Click "Establish Identity Protocol"
    console.log("Clicking 'Establish Identity Protocol' to transition to credentials entry...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Establish Identity Protocol'));
      if (nextBtn) {
        nextBtn.click();
      } else {
        throw new Error("Could not find Establish Identity Protocol button");
      }
    });

    // 4. Fill credentials & Select "Analytical Laboratory"
    console.log("Waiting for credentials inputs...");
    await page.waitForSelector('input[placeholder="name@institution.com"]', { timeout: 5000 });

    const timestamp = Date.now();
    const email = `automated.lab.${timestamp}@sovereignlabs.com`;
    console.log(`Registering as Lab with Email: ${email}`);

    await page.type('input[placeholder="name@institution.com"]', email);
    await page.type('input[placeholder="••••••••"]', 'ControlQuality2026!');
    await page.select('select', 'lab');

    // Click Finalize Registration
    console.log("Submitting Register Form...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(b => b.textContent.includes('Finalize Registration'));
      if (submitBtn) {
        submitBtn.click();
      } else {
        throw new Error("Could not find Finalize Registration button");
      }
    });

    // 5. Wait for onboarding redirect
    console.log("Waiting for onboarding redirect to '/complete-lab-profile'...");
    await page.waitForFunction(() => window.location.href.includes('/complete-lab-profile'), { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000)); // let layout settle

    // --- STEP 1 ---
    console.log("Executing Step 1 Onboarding: Institutional Profile & Address...");
    await page.waitForSelector('input[placeholder*="Apex"]', { timeout: 5000 });

    // Official Registered Lab Name
    await page.type('input[placeholder*="Apex"]', 'Sovereign Lab Diagnostics');
    // Organization Category dropdown
    await page.select('select', 'private');
    // Country
    await page.type('input[placeholder*="Kenya"]', 'Kenya');
    // City
    await page.type('input[placeholder*="Nairobi"]', 'Nairobi');
    // Physical Address
    await page.type('input[placeholder*="Building"]', '1024 Biotech Way, Science Center Complex');
    // Primary Contact Person
    await page.type('input[placeholder*="Sarah Jenkins"]', 'Dr. Catherine Vance');
    // Accredited Intake Email
    await page.type('input[placeholder*="intake@apexlab.com"]', 'intake@sovereigndiag.com');
    // Accredited Intake Phone
    await page.type('input[placeholder*="+254 700"]', '+254 711 000123');

    // Take screenshot of Step 1
    const s1Path = path.join(ARTIFACT_DIR, 'browser_step1.png');
    await page.screenshot({ path: s1Path });
    console.log(`Saved Step 1 screenshot: ${s1Path}`);

    // Click Next Component
    console.log("Advancing to Step 2...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Next Component'));
      if (nextBtn) nextBtn.click();
      else throw new Error("Next Component button not found");
    });
    await new Promise(r => setTimeout(r, 1500));

    // --- STEP 2 ---
    console.log("Executing Step 2 Onboarding: ISO standards & signatories...");
    await page.waitForSelector('input[placeholder*="Arthur Pendelton"]', { timeout: 5000 });

    // Authorized Technical Signatory
    await page.type('input[placeholder*="Arthur Pendelton"]', 'Dr. Catherine Vance, Lead QA Director');
    // Primary Accreditation Level
    await page.select('select', 'ISO/IEC 17025');
    // Accreditation Body
    await page.type('input[placeholder*="KENAS"]', 'KENAS (Kenya National Accreditation Service)');
    // Accreditation Number
    await page.type('input[placeholder*="ISO-17025-KEN"]', 'ISO-17025-KEN-99238');
    // Date
    await page.evaluate(() => {
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        dateInput.value = '2028-12-31';
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Take screenshot of Step 2
    const s2Path = path.join(ARTIFACT_DIR, 'browser_step2.png');
    await page.screenshot({ path: s2Path });
    console.log(`Saved Step 2 screenshot: ${s2Path}`);

    // Click Next Component
    console.log("Advancing to Step 3...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Next Component'));
      if (nextBtn) nextBtn.click();
      else throw new Error("Next Component button not found");
    });
    await new Promise(r => setTimeout(r, 1500));

    // --- STEP 3 ---
    console.log("Executing Step 3 Onboarding: Logistics, turnarounds & switches...");
    await page.waitForSelector('input[placeholder*="3-5 Business Days"]', { timeout: 5000 });

    // Turnaround Time
    await page.type('input[placeholder*="3-5 Business Days"]', '2-4 Business Days');
    // Operating hours
    await page.type('input[placeholder*="Mon-Fri"]', 'Mon-Sat, 07:30 - 18:00');
    // Scope
    await page.type('textarea[placeholder*="State technical categories"]', 'Microbiological verification, HPLC trace metals extraction, pathogen validation under standard protocol.');
    // Equipment
    await page.type('textarea[placeholder*="Summary of critical infrastructure"]', 'Thermo Scientific Orbitrap GC-MS, Agilent Infinity II HPLC, Biosafety Cabinets Class II A2.');

    // Toggle Logistics switches
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const pickupDiv = divs.find(d => d.textContent.includes('Courier Sample Pickup') && d.textContent.includes('Our team provides'));
      if (pickupDiv) pickupDiv.click();
      
      const emergencyDiv = divs.find(d => d.textContent.includes('Emergency Rapid Protocol') && d.textContent.includes('We expedite priority'));
      if (emergencyDiv) emergencyDiv.click();
    });

    // Take screenshot of Step 3
    const s3Path = path.join(ARTIFACT_DIR, 'browser_step3.png');
    await page.screenshot({ path: s3Path });
    console.log(`Saved Step 3 screenshot: ${s3Path}`);

    // Submit Dossier
    console.log("Submitting laboratory profile technical dossier...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(b => b.textContent.includes('Submit Technical Dossier'));
      if (submitBtn) submitBtn.click();
      else throw new Error("Submit Technical Dossier button not found");
    });

    // 6. Wait for redirect to /lab-capabilities
    console.log("Waiting for redirection to '/lab-capabilities'...");
    await page.waitForFunction(() => window.location.href.includes('/lab-capabilities'), { timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000)); // wait for capabilities animation

    // Take final screenshot
    const sDonePath = path.join(ARTIFACT_DIR, 'browser_completed.png');
    await page.screenshot({ path: sDonePath });
    console.log(`Saved Completed page screenshot: ${sDonePath}`);

    console.log("E2E Simulation completed successfully!");
  } catch (err) {
    console.error("AN ERROR OCCURRED DURING SIMULATION:", err);
    try {
      const errorScreenshot = path.join(ARTIFACT_DIR, 'browser_error.png');
      await page.screenshot({ path: errorScreenshot });
      console.log(`Saved error snapshot: ${errorScreenshot}`);
    } catch (ssErr) {
      console.error("Failed to capture error snapshot:", ssErr);
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
