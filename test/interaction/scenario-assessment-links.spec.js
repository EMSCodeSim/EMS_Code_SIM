'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('direct vital entry saves and restores the complete pupil finding', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/pupil-scenario.html?mode=scenario&resume=1&case=stroke');

  await expect(page.locator('#simCard')).toBeVisible();
  await expect(page.locator('#leftSize')).toHaveCount(0);
  await expect(page.locator('#rightSize')).toHaveCount(0);
  await expect(page.locator('#leftReactionInput')).toBeVisible();
  await expect(page.locator('#rightReactionInput')).toBeVisible();
  await expect(page.locator('#gazeInput')).toBeVisible();
  await expect(page.locator('#trackingInput')).toBeVisible();

  await page.locator('#lightLeft').click();
  await page.locator('#lightRight').click();
  await page.locator('#trackingTest').click();
  await page.locator('#equalInput').selectOption('equal');
  await page.locator('#leftReactionInput').selectOption('reactive');
  await page.locator('#rightReactionInput').selectOption('reactive');
  await page.locator('#gazeInput').selectOption('midline');
  await page.locator('#trackingInput').selectOption('smooth');
  await page.locator('#submitBtn').click();
  await expect(page.locator('#result')).toContainText('Accuracy will be reviewed at the end of the scenario');

  const saved = await page.evaluate(() => ({
    activeId: localStorage.getItem('emscodesim_active_patient_record'),
    patient: JSON.parse(localStorage.getItem('emscodesim_patient_record_stroke')),
    scenario: JSON.parse(localStorage.getItem('emscodesim_scenario_stroke'))
  }));
  expect(saved.activeId).toBe('stroke');
  expect(saved.patient.findings.pupils.gaze).toBe('midline');
  expect(saved.patient.findings.pupils.tracking).toBe('smooth');
  expect(saved.patient.findings.pupils.expectedFinding).toContain('left gaze deviation');
  expect(saved.patient.findings.pupils.accurate).toBe(false);
  expect(saved.patient.findings.pupils.leftReactive).toBe(true);
  expect(saved.patient.findings.pupils.rightReactive).toBe(true);
  expect(saved.scenario.findings.pupils.value).toBe(saved.patient.findings.pupils.value);

  // Record/Log is no longer a permanent desktop control. Verify the simulator
  // restores the complete finding through the patient-record API instead of
  // navigating to the hidden Record panel.
  await page.goto('/vitals/visual-patient.html?case=stroke');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord?.active()?.findings?.pupils))).toBe(true);
  const restored = await page.evaluate(() => window.EMSCodeSimPatientRecord.active().findings.pupils);
  expect(restored.value).toBe(saved.patient.findings.pupils.value);
  expect(restored.gaze).toBe('midline');
  expect(restored.tracking).toBe('smooth');
  expect(restored.expectedFinding).toContain('left gaze deviation');
  expect(restored.leftReactive).toBe(true);
  expect(restored.rightReactive).toBe(true);
  await assertNoPageErrors();
});

test('skin comparison, complete assessment tools, and assessment return paths remain connected', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/skin-scenario.html?mode=scenario&resume=1&case=hypoglycemia');
  await expect(page.locator('.sv-skin-compare figure')).toHaveCount(2);
  await expect(page.locator('.sv-skin-compare')).toContainText('Normal reference');
  await expect(page.locator('.sv-skin-compare')).toContainText('Patient sample');
  await expect(page.locator('.sv-skin-compare')).toContainText('Pink, warm, and dry');
  await page.locator('#touchSkin').click();
  await expect(page.locator('#observations')).toContainText('cool and wet');
  await page.locator('#moistureSkin').click();
  await expect(page.locator('#observations')).toContainText('visible sweat or moisture');

  await page.goto('/vitals/visual-patient.html?case=stroke&training=learning&reset=1');
  await page.evaluate(() => {
    const session = window.EMSCodeSimScenarioSession;
    session.sync('stroke');
    session.saveFinding('scene_size_up', 'Scene size-up completed for assessment-link test', {
      label: 'Scene size-up and first impression', source: 'browser-test', classification: 'Complete'
    });
    session.saveFinding('airway', 'Patent; patient speaking', { source: 'browser-test', normality: 'normal', status: 'normal' });
    session.saveFinding('breathing', 'Breathing present and adequate for rapid primary pass', { source: 'browser-test', normality: 'normal', status: 'normal' });
    session.saveFinding('perfusion', 'Radial pulse present; no major external bleeding', { source: 'browser-test', normality: 'normal', status: 'normal' });
  });
  await page.reload();
  await expect(page.locator('.bottom-nav')).not.toHaveClass(/guide-locked/);
  await page.locator('[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentTools')).toContainText('Initial ABC');
  await expect(page.locator('#assessmentTools')).toContainText('Patent; patient speaking');
  await expect(page.locator('#assessmentTools')).toContainText('Glasgow Coma Scale');
  await expect(page.locator('#assessmentTools')).toContainText('Rule of Nines');
  await expect(page.locator('#assessmentTools')).toContainText('Pupils, light, and gaze');
  await expect(page.locator('#assessmentTools')).toContainText('More assessments');
  expect(await page.locator('#assessmentTools button, #assessmentTools a').count()).toBeGreaterThanOrEqual(8);

  await page.goto('/vitals/airway-assessment.html?mode=scenario&resume=1&case=stroke');
  await expect(page.locator('#practicePanel')).toBeVisible();
  await expect(page.locator('#findingBox')).toBeVisible();
  await page.evaluate(() => {
    const input = document.querySelector('input[name="normality"][value="normal"]');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page).toHaveURL(/visual-patient\.html\?case=stroke/);
  await expect(page.locator('#patientImage')).toBeVisible();
  await assertNoPageErrors();
});

test('abnormal airway decision records care and returns to the patient', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/airway-assessment.html?mode=scenario&resume=1&case=stroke');
  await expect(page.locator('#practicePanel')).toBeVisible();
  await expect(page.locator('#findingBox')).toBeVisible();

  await page.locator('input[name="normality"][value="abnormal"]').check();
  await expect(page.locator('#problemSelect')).toBeVisible();
  await expect(page.locator('#actionSelect')).toBeVisible();
  await page.locator('#problemSelect').selectOption('soft-tissue');
  await page.locator('#actionSelect').selectOption('position');
  await page.locator('.scenario-assessment-actions .continue-patient').click();

  await expect(page).toHaveURL(/visual-patient\.html\?case=stroke/);
  const saved = await page.evaluate(() => window.EMSCodeSimPatientRecord.active());
  expect(saved?.findings?.airway).toBeTruthy();
  expect((saved?.treatments || []).some(entry => /airway|head-tilt|chin-lift/i.test(`${entry.treatment || ''} ${entry.description || ''}`))).toBe(true);
  await expect(page.locator('#patientImage')).toBeVisible();
  await assertNoPageErrors();
});
