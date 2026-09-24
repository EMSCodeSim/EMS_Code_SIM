'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, gotoVisualPatient, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only regression');
  await clearSiteStorage(page);
});

test('breathing problem desktop centers the patient encounter and keeps tools on the right', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await gotoVisualPatient(page, '/vitals/visual-patient.html?case=asthma&training=learning&reset=1');

  await expect(page.locator('#scenarioIntroVideo')).toHaveCount(1, { timeout: 10000 });
  if (await page.locator('#scenarioIntroVideo').isVisible().catch(() => false)) await page.locator('#scenarioIntroSkip').click();
  await expect(page.locator('#desktopPatientHub')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#desktopPatientActions button')).toHaveCount(4);
  await expect(page.locator('#desktopPatientStream')).toBeVisible();

  const widths = await page.evaluate(() => ({
    patient: document.querySelector('.patient-stage')?.getBoundingClientRect().width || 0,
    center: document.querySelector('#clinicalInteractionColumn')?.getBoundingClientRect().width || 0,
    tools: document.querySelector('.patient-control-column')?.getBoundingClientRect().width || 0
  }));
  expect(widths.center).toBeGreaterThan(widths.patient);
  expect(widths.center).toBeGreaterThan(widths.tools);

  await page.locator('#desktopPatientActions button[data-panel="historyPanel"]').click();
  await expect(page.locator('#historyPanel')).toBeVisible();
  // Domain rail lives in the center clinical interaction column on desktop.
  await expect(page.locator('#clinicalInteractionColumn .bottom-nav, .bottom-nav.clinical-domain-rail')).toBeVisible();
  await assertNoPageErrors();
});
