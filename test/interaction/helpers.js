'use strict';

const { expect } = require('@playwright/test');

async function clearSiteStorage(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(new Error(message.text()));
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
  await expect(page.locator('#infoUpdateType')).toHaveText(/BLS ENGINE HANDOFF/, { timeout: 20000 });
  await expect(page.locator('#horseIntroOverlay')).toHaveCount(0);
}

async function openScenario(page, caseId = 'asthma', mode = 'learning') {
  const selectedMode = mode === 'assessment' ? 'assessment' : 'learning';
  await page.goto(`/vitals/visual-patient.html?case=${encodeURIComponent(caseId)}&training=${selectedMode}&reset=1`);
  await expect(page).toHaveURL(new RegExp(`/vitals/visual-patient\\.html\\?case=${caseId}`));
  if (caseId === 'horse_crush') await completeHorseIntroIfPresent(page);
  await expect(page.locator('#patientImage')).toBeVisible();
  await expect.poll(() => page.locator('#patientImage').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
}

module.exports = { clearSiteStorage, watchPageErrors, openScenario, completeHorseIntroIfPresent };
