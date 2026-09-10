'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
  await page.setViewportSize({ width: 390, height: 844 });
});

test('asthma mobile workflow keeps the patient, history, treatment, and quick-response controls usable', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await openScenario(page, 'asthma', 'assessment');

  const intro = page.locator('#scenarioIntroVideo');
  await expect(intro).toBeVisible({ timeout: 10000 });
  const continueButton = page.locator('#scenarioIntroSkip');
  const continueBox = await continueButton.boundingBox();
  expect(continueBox?.height || 0).toBeGreaterThanOrEqual(44);
  await continueButton.click();
  await expect(intro).toBeHidden();

  const patient = page.locator('#patientImage');
  await expect(patient).toBeVisible();
  const patientBox = await patient.boundingBox();
  expect(patientBox?.width || 0).toBeGreaterThan(120);
  expect(patientBox?.height || 0).toBeGreaterThan(120);

  const historyTab = page.locator('.bottom-nav button[data-panel="historyPanel"]');
  const treatmentTab = page.locator('.bottom-nav button[data-panel="treatmentPanel"]');
  for (const tab of [historyTab, treatmentTab]) {
    await expect(tab).toBeVisible();
    const box = await tab.boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    expect(box?.width || 0).toBeGreaterThanOrEqual(44);
  }

  await historyTab.click();
  await expect(page.locator('#historyPanel')).toBeVisible();
  await expect(page.locator('#aiQuickHistory')).toBeVisible({ timeout: 5000 });
  const quickButtons = page.locator('#aiQuickHistoryButtons button');
  await expect(quickButtons.first()).toBeVisible();
  const quickBox = await quickButtons.first().boundingBox();
  expect(quickBox?.height || 0).toBeGreaterThanOrEqual(44);

  await page.locator('#closeSheet').click();
  await treatmentTab.click();
  await expect(page.locator('#treatmentPanel')).toBeVisible();

  await assertNoPageErrors();
});
