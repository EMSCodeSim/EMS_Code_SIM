'use strict';

/**
 * Capture Playwright screenshots + video of Patient Simulator V2 happy path.
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function main() {
  const base = process.env.PSV2_BASE || 'http://127.0.0.1:4173';
  const outDir = '/opt/cursor/artifacts';
  const shotDir = path.join(outDir, 'screenshots');
  fs.mkdirSync(shotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outDir, size: { width: 1440, height: 900 } }
  });
  const page = await context.newPage();

  await page.goto(`${base}/patient-simulator-v2/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(shotDir, 'psv2-01-start-overlay.png'), fullPage: false });

  await page.locator('#psv2StartBtn').click();
  await page.waitForFunction(() => document.getElementById('psv2StartOverlay')?.hidden === true);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(shotDir, 'psv2-02-desktop-live.png'), fullPage: false });

  await page.fill('#psv2ChatInput', 'When did this start?');
  await page.click('#psv2ChatForm button[type="submit"]');
  await page.waitForFunction(() => document.querySelectorAll('#psv2ChatLog .psv2-msg').length >= 2);

  await page.click('#psv2ToolTabs button[data-tab="assess"]');
  await page.click('#psv2AssessGrid button[data-assess="lung_sounds"]');
  await page.waitForSelector('#psv2AssessFinding:not([hidden])');

  await page.click('#psv2MonitorActions button[data-monitor="spo2"]');
  await page.waitForFunction(() => {
    const el = document.querySelector('#psv2Monitor [data-vital="spo2"] .value');
    return el && !el.classList.contains('off') && !el.textContent.includes('—');
  });

  await page.click('#psv2ToolTabs button[data-tab="treat"]');
  await page.click('#psv2TreatPanel button[data-treat="albuterol"]');
  await page.waitForSelector('#psv2TreatNote:not([hidden])');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(shotDir, 'psv2-03-assessment-treatment.png'), fullPage: false });

  // Mobile layout smoke — capture at mobile viewport from a fresh context width
  await context.close();
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${base}/patient-simulator-v2/`, { waitUntil: 'networkidle' });
  await mobilePage.locator('#psv2StartBtn').click();
  await mobilePage.waitForFunction(() => document.getElementById('psv2StartOverlay')?.hidden === true);
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(shotDir, 'psv2-04-mobile-layout.png'), fullPage: false });
  await mobileContext.close();
  await browser.close();

  // Rename playwright video to a stable artifact name
  const videos = fs.readdirSync(outDir).filter(f => f.endsWith('.webm'));
  if (!videos.length) throw new Error('No Playwright video recorded');
  const src = path.join(outDir, videos.sort((a, b) => fs.statSync(path.join(outDir, b)).mtimeMs - fs.statSync(path.join(outDir, a)).mtimeMs)[0]);
  const dest = path.join(outDir, 'psv2-asthma-walkthrough.webm');
  fs.renameSync(src, dest);
  console.log('Artifacts written:');
  console.log(' -', dest);
  for (const f of ['psv2-01-start-overlay.png', 'psv2-02-desktop-live.png', 'psv2-03-assessment-treatment.png', 'psv2-04-mobile-layout.png']) {
    console.log(' -', path.join(shotDir, f));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
