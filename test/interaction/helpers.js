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

async function openScenario(page, caseId = 'asthma', mode = 'learning') {
  await page.goto(`/vitals/scenario-launcher.html?case=${encodeURIComponent(caseId)}&open=1`);
  await expect(page.locator('#caseDialog')).toBeVisible();
  await expect(page.locator('#caseDialogImage')).toBeVisible();
  await expect.poll(() => page.locator('#caseDialogImage').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  const selectedMode = mode === 'assessment' ? 'assessment' : 'learning';
  await page.locator(`[data-start-mode="${selectedMode}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/vitals/visual-patient\\.html\\?case=${caseId}`));
  await expect(page.locator('#patientImage')).toBeVisible();
  await expect.poll(() => page.locator('#patientImage').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
}

module.exports = { clearSiteStorage, watchPageErrors, openScenario };
