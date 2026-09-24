'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, gotoVisualPatient, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('asthma startup advances timer and always exposes a usable patient workspace', async ({ page }, testInfo) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.route('**/*.mp4*', route => route.abort());
  await gotoVisualPatient(page, '/vitals/visual-patient.html?case=asthma&training=learning&reset=1');

  await expect(page.locator('#scenarioIntroVideoElement')).toHaveCount(1, { timeout: 10000 });
  await expect(page.locator('#timer')).toBeVisible();
  await expect.poll(async () => page.locator('#timer').innerText(), { timeout: 5000 }).not.toBe('00:00');

  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimAsthmaStartupGuard)), { timeout: 7000 }).toBe(true);

  await expect(page.locator('#scenarioIntroVideo')).toBeHidden({ timeout: 5000 });
  await expect(page.locator('#patientImage')).toBeVisible();
  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.locator('#patientFirstMobileNav')).toBeVisible();
  } else {
    await expect(page.locator('#assessmentPanel button:visible').first()).toBeVisible();
  }
  await assertNoPageErrors();
});
