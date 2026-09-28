'use strict';

/**
 * Headless smoke interaction for Patient Simulator V2 UI.
 * Requires a running static server on PORT (default 4173) serving dist/.
 */
const { chromium } = require('@playwright/test');

async function main() {
  const base = process.env.PSV2_BASE || 'http://127.0.0.1:4173';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));

  await page.goto(`${base}/patient-simulator-v2/`, { waitUntil: 'networkidle' });
  await page.locator('#psv2StartBtn').click();
  await page.waitForFunction(() => document.getElementById('psv2StartOverlay')?.hidden === true);

  const url = page.url();
  if (!url.includes('/patient-simulator-v2')) {
    throw new Error(`Left V2 route: ${url}`);
  }

  // Conversation
  await page.fill('#psv2ChatInput', 'When did this start?');
  await page.click('#psv2ChatForm button[type="submit"]');
  await page.waitForFunction(() => document.querySelectorAll('#psv2ChatLog .psv2-msg').length >= 2, null, { timeout: 5000 });
  const chat = await page.locator('#psv2ChatLog').innerText();
  if (!/20 minutes|walking|breath/i.test(chat)) {
    throw new Error(`Unexpected chat content: ${chat}`);
  }

  // Assessment
  await page.click('#psv2ToolTabs button[data-tab="assess"]');
  await page.click('#psv2AssessGrid button[data-assess="lung_sounds"]');
  await page.waitForSelector('#psv2AssessFinding:not([hidden])');
  const finding = await page.locator('#psv2AssessFinding').innerText();
  if (!/wheez/i.test(finding)) throw new Error(`Lung finding missing wheeze: ${finding}`);

  // Monitor
  await page.click('#psv2MonitorActions button[data-monitor="spo2"]');
  await page.waitForFunction(() => {
    const el = [...document.querySelectorAll('#psv2Monitor .psv2-vital')].find(n => /SpO/i.test(n.innerText));
    return el && !el.innerText.includes('—');
  });

  // Treatment
  await page.click('#psv2ToolTabs button[data-tab="treat"]');
  await page.click('#psv2TreatPanel button[data-treat="albuterol"]');
  await page.waitForSelector('#psv2TreatNote:not([hidden])');

  // Mobile layout smoke
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const actionBar = await page.locator('#psv2ActionBar').boundingBox();
  if (!actionBar || actionBar.width < 300) throw new Error('Mobile action bar missing');

  if (errors.length) {
    console.error('Page errors:', errors);
    throw new Error('Browser page errors present');
  }

  console.log('Patient Simulator V2 Playwright interaction smoke passed.');
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
