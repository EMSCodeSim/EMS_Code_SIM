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

  await page.goto('/vitals/visual-patient.html?case=stroke');
  await page.locator('[data-panel="findingsPanel"]').click();
  await expect(page.locator('#findingList')).toContainText('Pupils');
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

  // The current simulator intentionally locks clinical tabs until the learner
  // completes scene size-up and the initial ABC pass. Seed those prerequisites
  // here because this test is about the assessment tool library, not the guide.
  await page.goto('/vitals/visual-patient.html?case=stroke&training=learning&reset=1');
  await page.evaluate(() => {
    const session = window.EMSCodeSimScenarioSession;
    session.sync('stroke');
    session.saveFinding('scene_size_up', 'Scene size-up completed for assessment-link test', {
      label: 'Scene size-up and first impression',
      source: 'browser-test',
      classification: 'Complete'
    });
    session.saveFinding('airway', 'Patent; patient speaking', { source: 'browser-test', normality: 'normal', status: 'normal' });
    session.saveFinding('breathing', 'Breathing present and adequate for rapid primary pass', { source: 'browser-test', normality: 'normal', status: 'normal' });
    session.saveFinding('perfusion', 'Radial pulse present; no major external bleeding', { source: 'browser-test', normality: 'normal', status: 'normal' });
  });
  await page.reload();
  await expect(page.locator('.bottom-nav')).not.toHaveClass(/guide-locked/);
  await page.locator('[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentTools')).toContainText('Airway assessment');
  await expect(page.locator('#assessmentTools')).toContainText('Glasgow Coma Scale');
  await expect(page.locator('#assessmentTools')).toContainText('Rule of Nines');
  await expect(page.locator('#assessmentTools')).toContainText('Pupils, light, and gaze');
  expect(await page.locator('#assessmentTools .assessment-card').count()).toBeGreaterThanOrEqual(17);

  await page.goto('/vitals/airway-assessment.html?mode=scenario&resume=1&case=stroke');
  await expect(page.locator('#practicePanel')).toBeVisible();
  const respirationsLink = page.locator('#scenarioConnectedTools a', { hasText: 'Respiratory rate' });
  const breathSoundsLink = page.locator('#scenarioConnectedTools a', { hasText: 'Breath sounds' });
  const spo2Link = page.locator('#scenarioConnectedTools a', { hasText: 'SpO₂' });
  await expect(respirationsLink).toBeVisible();
  await expect(breathSoundsLink).toBeVisible();
  await expect(spo2Link).toBeVisible();
  expect(await respirationsLink.getAttribute('href')).toContain('return=%2Fvitals%2Fairway-assessment.html');

  await respirationsLink.click();
  await expect(page).toHaveURL(/respiratory-rate-scenario\.html/);
  await expect(page.locator('#contextReturnLink')).toHaveText('← Return to Airway assessment');
  await expect(page.locator('#patientHomeLink')).toHaveText('Patient home');
  await expect(page.locator('#returnBtn')).toHaveText('Return to Airway assessment');
  await assertNoPageErrors();
});

test('recorded airway finding unlocks treatment choices and returns to the assessment', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/airway-assessment.html?mode=scenario&resume=1&case=stroke');
  await expect(page.locator('#practicePanel')).toBeVisible();
  await expect(page.locator('#scenarioConnectedTools')).toContainText('Record the assessment finding to unlock treatment');

  await page.locator('#assessAirway').click();
  await page.locator('input[name="normality"][value="normal"]').check();
  await page.locator('#problemSelect').selectOption('patent');
  await page.locator('#actionSelect').selectOption('monitor');
  await expect(page.locator('#pcrText')).not.toHaveAttribute('required', '');
  await page.locator('#submitCase').click();

  const treatLink = page.locator('#scenarioConnectedTools a', { hasText: 'Treat recorded airway finding' });
  await expect(treatLink).toBeVisible();
  await treatLink.click();
  await expect(page).toHaveURL(/treatment-reassessment\.html/);
  await expect(page.locator('#activeTreatmentContext')).toContainText('Recorded finding');
  await expect(page.locator('#treatmentReturnNav')).toContainText('Return to Airway assessment');

  for (const value of ['monitor', 'position', 'suction', 'opa', 'npa', 'bvm', 'lma', 'intubation', 'cric']) {
    await expect(page.locator(`#treatmentSelect option[value="${value}"]`)).toHaveCount(1);
  }
  await assertNoPageErrors();
});
