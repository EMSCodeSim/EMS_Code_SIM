'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('GCS mini sim assesses E/V/M domains and records the score', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop GCS overlay');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'learning');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimMiniSimOverlay))).toBe(true);

  const opened = await page.evaluate(() => window.EMSCodeSimMiniSimOverlay.openOverlay('/vitals/gcs.html', 'Glasgow Coma Scale'));
  expect(opened).toBe(true);
  await expect(page.locator('#embeddedSimWorkspace')).toBeVisible();

  const sim = page.frameLocator('#embeddedSimFrame');
  await expect(sim.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(sim.locator('#showResults')).toBeDisabled();

  await sim.locator('#btnEyes').click();
  await sim.locator('#btnVerbal').click();
  await sim.locator('#btnMotor').click();
  await expect(sim.locator('#showResults')).toBeEnabled();

  await sim.locator('#selE').selectOption('4');
  await sim.locator('#selV').selectOption('5');
  await sim.locator('#selM').selectOption('6');
  await sim.locator('#showResults').click();

  await expect(page.locator('#embeddedSimWorkspace')).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.gcs))).toBe(true);

  await assertNoPageErrors();
});
