'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

async function completeGuidedStart(page) {
  const guide = page.locator('#sceneGuide');
  await expect(guide).toBeVisible();

  // Assessment Mode intentionally locks the other care tabs until scene size-up
  // and the initial ABC decisions are recorded. Work through both guides using
  // the same select + Record and continue controls a learner sees. Keyboard
  // activation avoids mobile smooth-scroll movement stealing a pointer click.
  for (let step = 0; step < 20; step += 1) {
    if (await guide.isHidden()) break;
    const answer = page.locator('#sceneGuideAnswer');
    await expect(answer).toBeVisible();
    const values = await answer.locator('option').evaluateAll(options => options.map(option => option.value).filter(Boolean));
    expect(values.length).toBeGreaterThan(0);
    await answer.selectOption(values[0]);
    const next = page.locator('#sceneGuideNext');
    await expect(next).toBeEnabled();
    await next.focus();
    await next.press('Enter');
    await page.waitForTimeout(140);
  }

  await expect(guide).toBeHidden();
  await expect(page.locator('.bottom-nav')).not.toHaveClass(/guide-locked/);
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimSceneGuide?.isComplete?.())).toBe(true);
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimSceneGuide?.isPrimaryComplete?.())).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
  await page.setViewportSize({ width: 390, height: 844 });
});

test('asthma mobile workflow keeps the patient, guided assessment, history, treatment, and quick-response controls usable', async ({ page }) => {
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

  await completeGuidedStart(page);

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
  await expect(page.locator('#historyCategoryList .history-question-button[data-history-question]').first()).toBeVisible({ timeout: 5000 });
  await page.evaluate(() => window.EMSCodeSimAIQuestionLayer?.refreshWhenHistoryReady?.());
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
