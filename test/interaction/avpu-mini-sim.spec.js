'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('AVPU mental status keeps documentation locked until an AVPU choice is made', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop AVPU overlay');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'learning');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimMiniSimOverlay))).toBe(true);

  const opened = await page.evaluate(() => window.EMSCodeSimMiniSimOverlay.openOverlay('/vitals/avpu-scenario.html', 'Mental status / AVPU'));
  expect(opened).toBe(true);
  await expect(page.locator('#embeddedSimWorkspace')).toBeVisible();

  const sim = page.frameLocator('#embeddedSimFrame');
  await expect(sim.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(sim.locator('#answerCard')).toHaveClass(/ems-discovery-locked/);
  await expect(sim.locator('#answerCard')).toBeHidden();

  await sim.locator('#observeBtn').click();
  await expect(sim.locator('#answerCard')).toBeHidden();
  await expect(sim.locator('.ems-mini-flow span[data-step="2"]')).toHaveClass(/active/);

  await sim.locator('#voiceBtn').click();
  await sim.locator('#painBtn').click();
  await expect(sim.locator('#answerCard')).toBeVisible();
  await expect(sim.locator('.ems-mini-flow span[data-step="3"]')).toHaveClass(/active/);

  await sim.locator('#avpuChoices .sv-choice[data-value="A"]').click();

  await sim.locator('#submitBtn').click();
  await expect(page.locator('#embeddedSimWorkspace')).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.mental_status))).toBe(true);

  await assertNoPageErrors();
});
