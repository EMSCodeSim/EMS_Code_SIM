'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-09T18:00:00-06:00') });
  await clearSiteStorage(page);
});

test('asthma patient worsens after delay without respiratory treatment, then improves after bronchodilator', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await openScenario(page, 'asthma', 'assessment');

  const overlay = page.locator('#scenarioIntroVideo');
  await expect(overlay).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#patientImage')).toBeHidden();
  await page.locator('#scenarioIntroSkip').click();
  await expect(overlay).toHaveClass(/resting/);
  await expect(page.locator('#scenarioIntroVideoElement')).toBeVisible();

  // Three minutes without oxygen/bronchodilator should trigger the worsening video update.
  await page.clock.runFor(181_000);
  await page.evaluate(() => window.EMSCodeSimScenarioIntroVideo?.evaluate?.());
  await expect(overlay).toBeVisible();
  await expect(overlay).not.toHaveClass(/resting/);
  await expect(page.locator('#scenarioVideoEyebrow')).toContainText('RESPIRATORY DISTRESS');
  await expect(page.locator('#scenarioVideoCopy')).toContainText(/more fatigued|increased work of breathing/i);
  await page.locator('#scenarioIntroSkip').click();
  await expect(overlay).toHaveClass(/resting/);

  // Recording a bronchodilator should move the visual state to improvement and still require reassessment.
  await page.evaluate(() => {
    window.EMSCodeSimScenarioSession?.addTreatment?.({
      actionId: 'albuterol-nebulizer',
      treatment: 'Albuterol bronchodilator',
      description: 'Albuterol nebulizer administered for asthma',
      targetKeys: ['breathing', 'lung_sounds', 'spo2'],
      reassessmentRequired: true
    });
    window.EMSCodeSimScenarioIntroVideo?.evaluate?.();
  });
  await expect(overlay).toBeVisible();
  await expect(overlay).not.toHaveClass(/resting/);
  await expect(page.locator('#scenarioVideoEyebrow')).toContainText('AFTER BRONCHODILATOR');
  await expect(page.locator('#scenarioVideoCopy')).toContainText(/improving/i);
  await expect(page.locator('#patientImage')).toBeHidden();

  const record = await page.evaluate(() => window.EMSCodeSimPatientRecord.active());
  expect(record.scenarioId).toBe('asthma');
  expect(record.treatments.some(item => /albuterol|bronchodilator/i.test(JSON.stringify(item)))).toBe(true);
  await assertNoPageErrors();
});
