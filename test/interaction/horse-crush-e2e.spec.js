'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('horse-crush call works from arrival through hospital handoff', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Full horse workflow is protected on the desktop clinical workspace');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'learning');

  await expect.poll(() => page.evaluate(() => window.EMSCodeSimScenarioBootstrapStatus?.ok)).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimHorseCrushUiFix))).toBe(true);

  // Arrival / scene decision.
  const parking = page.locator('[data-horse-parking="south_barn_access"]');
  await expect(parking).toBeVisible();
  await parking.click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.arrival_parking))).toBe(true);
  await expect(page.locator('#patientImage')).toBeVisible();

  // Initial ABC: use the same current-assessment controls a learner clicks.
  async function recordAbc(label) {
    const button = page.locator('#horseCurrentAssessmentBody .horse-current-exam-button', { hasText: label }).first();
    await expect(button).toBeVisible();
    await button.click();
    const select = page.locator('#horseClinicalQuestionBox select').first();
    await expect(select).toBeVisible();
    await select.selectOption({ index: 1 });
    const record = page.locator('#horseClinicalQuestionBox .horse-question-save');
    await expect(record).toBeEnabled();
    await record.click();
  }

  await recordAbc('Airway');
  await recordAbc('Breathing');
  await recordAbc('Circulation');

  await expect.poll(() => page.evaluate(() => {
    const findings = window.EMSCodeSimPatientRecord.active()?.findings || {};
    return ['airway', 'breathing', 'perfusion'].every(key => Boolean(findings[key]));
  })).toBe(true);

  // Focused trauma assessment from the desktop assessment-category menu. This
  // specifically protects the former pelvis/leg routing bug that fell back to ABC.
  await page.locator('.bottom-nav button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentPanel')).toBeVisible();
  await page.locator('[data-assessment-category="abdomen_pelvis"]').click();
  await page.locator('[data-assessment-item="pelvis_hip"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.pelvis_hip))).toBe(true);

  await page.locator('#horseAssessmentBack').click();
  await page.locator('[data-assessment-category="extremities"]').click();
  await page.locator('[data-assessment-item="left_leg"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.left_leg))).toBe(true);
  await page.locator('[data-assessment-item="distal_csm"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.distal_csm))).toBe(true);

  // Stabilize the injured leg through the real treatment workspace.
  await page.locator('.bottom-nav button[data-panel="treatmentPanel"]').click();
  await expect(page.locator('#treatmentPanel')).toBeVisible();
  await page.locator('[data-horse-treatment-group="splinting"]').click();
  await page.locator('[data-horse-workspace-plan="manual_leg_support"]').click();
  await page.locator('#horseTreatmentWorkspaceDetail .horse-treatment-perform').click();
  await expect.poll(() => page.evaluate(() => {
    const treatments = window.EMSCodeSimPatientRecord.active()?.treatments || [];
    return treatments.some(item => item.actionId === 'manual_leg_support');
  })).toBe(true);

  // Use the progress/handoff control to enter the transport workflow. Before a
  // transport decision exists, this link intentionally opens the transport form.
  const closeSheet = page.locator('#closeSheet');
  if (await closeSheet.isVisible()) await closeSheet.click();
  await page.locator('#scenarioMenuButton').click();
  await expect(page.locator('#scenarioControlDialog')).toBeVisible();
  await page.locator('#handoffFromProgress').click();

  const transportForm = page.locator('form.horse-transport-selection-form');
  await expect(transportForm).toBeVisible();
  await transportForm.locator('select[name="impression"]').selectOption({ index: 1 });
  await transportForm.locator('select[name="priority"]').selectOption({ label: 'Prompt trauma transport' });
  await transportForm.locator('select[name="destination"]').selectOption({ index: 1 });
  await transportForm.locator('select[name="notification"]').selectOption({ label: 'No specialty activation' });
  await transportForm.locator('textarea[name="rationale"]').fill('Significant horse-compression mechanism with severe hip pain and inability to safely bear weight.');
  await transportForm.locator('.horse-treatment-perform').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.documentation?.transportDecisionAt))).toBe(true);

  // Once transport is recorded, the same progress link must open the hospital
  // handoff workspace rather than returning to the transport form.
  await page.locator('#scenarioMenuButton').click();
  await expect(page.locator('#scenarioControlDialog')).toBeVisible();
  await page.locator('#handoffFromProgress').click();
  await expect(page.locator('#hospitalHandoffWorkspace')).toBeVisible();

  await page.locator('#hospitalHandoffDraft').fill(
    '64-year-old alert patient compressed between two horses and knocked to the ground. Severe left hip pain with the leg held flexed. Airway, breathing, and perfusion are intact. Pelvis/hip and injured leg were assessed with distal CSM intact. The leg was manually supported in the position of comfort. Prompt trauma transport was selected.'
  );
  await page.locator('#saveHospitalHandoff').click();
  await expect.poll(() => page.evaluate(() => {
    const documentation = window.EMSCodeSimPatientRecord.active()?.documentation || {};
    return Boolean(documentation.handoffSavedAt && documentation.handoff);
  })).toBe(true);

  await assertNoPageErrors();
});
