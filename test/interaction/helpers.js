'use strict';

const { expect } = require('@playwright/test');

async function clearSiteStorage(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

function isIgnorableConsoleError(message) {
  const text = String(message || '');
  // Third-party signed media (Runway/CloudFront) can expire or fail to fetch
  // without affecting clinical UI contracts. Chromium often omits the URL from
  // these console messages, leaving only status / net::ERR_* text.
  if (/Failed to load resource: the server responded with a status of (401|403|404)\b/i.test(text)) return true;
  if (/Failed to load resource: net::ERR_[A-Z0-9_]+/i.test(text)) return true;
  if (/cloudfront\.net|runway|dnznrvs05pmza/i.test(text) && /\b(401|403|404|net::ERR_)/i.test(text)) return true;
  return false;
}

function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (isIgnorableConsoleError(text)) return;
    errors.push(new Error(text));
  });
  return async () => {
    expect(errors.map(error => error.message || String(error))).toEqual([]);
  };
}

async function completeHorseIntroIfPresent(page) {
  const skip = page.locator('#horseIntroSkip');
  try {
    await skip.waitFor({ state: 'visible', timeout: 2500 });
  } catch {
    return;
  }
  await skip.click();
  await expect(page.locator('#horseIntroOverlay')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('#infoUpdateType')).toHaveText(/DISPATCH/, { timeout: 8000 });
  await expect(page.locator('#infoUpdateType')).toHaveText(/AMBULANCE POSITION/, { timeout: 20000 });
  await expect.poll(() => page.evaluate(() => document.body.dataset.horseIntro), { timeout: 15000 }).toBe('arrived');
  await expect(page.locator('#infoUpdateType')).toHaveText(/BLS ENGINE HANDOFF/, { timeout: 8000 });
  await expect(page.locator('#horseIntroOverlay')).toHaveCount(0);
}

async function completeAsthmaIntroIfPresent(page) {
  const intro = page.locator('#scenarioIntroVideo');
  try {
    await intro.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    return;
  }

  const skip = page.locator('#scenarioIntroSkip');
  if (await skip.isVisible().catch(() => false)) await skip.click();

  // Like the horse-crush case, Continue must reveal a usable patient workspace.
  await expect(page.locator('.patient-stage')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#scenarioIntroVideo')).toBeHidden();
  await expect(page.locator('#patientImage')).toBeVisible();
}

async function openScenario(page, caseId = 'asthma', mode = 'learning') {
  const selectedMode = mode === 'assessment' ? 'assessment' : 'learning';
  await page.goto(`/vitals/visual-patient.html?case=${encodeURIComponent(caseId)}&training=${selectedMode}&reset=1`);
  await expect(page).toHaveURL(new RegExp(`/vitals/visual-patient\\.html\\?case=${caseId}`));

  if (caseId === 'horse_crush') {
    await completeHorseIntroIfPresent(page);
    await expect(page.locator('#patientImage')).toBeVisible();
    await expect.poll(() => page.locator('#patientImage').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    return;
  }

  if (caseId === 'asthma' || caseId === 'respiratory') {
    await completeAsthmaIntroIfPresent(page);
    await expect(page.locator('.patient-stage')).toBeVisible();
    return;
  }

  await expect(page.locator('#patientImage')).toBeVisible();
  await expect.poll(() => page.locator('#patientImage').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
}

module.exports = { clearSiteStorage, watchPageErrors, openScenario, completeHorseIntroIfPresent, completeAsthmaIntroIfPresent };
