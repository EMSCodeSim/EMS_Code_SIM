'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('Blood pressure scenario opens in the overlay with discovery-locked documentation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop BP overlay');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'learning');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimMiniSimOverlay))).toBe(true);

  const opened = await page.evaluate(() => window.EMSCodeSimMiniSimOverlay.openOverlay('/vitals/bp-scenario.html', 'Blood pressure'));
  expect(opened).toBe(true);
  await expect(page.locator('#embeddedSimWorkspace')).toBeVisible();

  const sim = page.frameLocator('#embeddedSimFrame');
  await expect(sim.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(sim.locator('.bp-scenario-answer')).toHaveClass(/ems-discovery-locked/);
  await expect(sim.locator('#submitBtn')).toBeDisabled();
  await expect(sim.locator('#gauge-container')).toBeVisible();

  await assertNoPageErrors();
});
