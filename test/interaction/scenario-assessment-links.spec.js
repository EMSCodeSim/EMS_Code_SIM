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
  await page.locator('#gazeInput').selectOption('left-deviation');
  await page.locator('#trackingInput').selectOption('impaired');
  await page.locator('#submitBtn').click();
  await expect(page.locator('#result')).toContainText('recorded in the patient findings');

  const saved = await page.evaluate(() => ({
    activeId: localStorage.getItem('emscodesim_active_patient_record'),
    patient: JSON.parse(localStorage.getItem('emscodesim_patient_record_stroke')),
    scenario: JSON.parse(localStorage.getItem('emscodesim_scenario_stroke'))
  }));
  expect(saved.activeId).toBe('stroke');
  expect(saved.patient.findings.pupils.gaze).toBe('left-deviation');
  expect(saved.patient.findings.pupils.tracking).toBe('impaired');
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
  await page.goto('/vitals/skin-scenario.html?mode=scenario&resume=1&case=stroke');
  await expect(page.locator('.sv-skin-compare figure')).toHaveCount(2);
  await expect(page.locator('.sv-skin-compare')).toContainText('Normal reference');
  await expect(page.locator('.sv-skin-compare')).toContainText('Patient sample');
  await expect(page.locator('.sv-skin-compare')).toContainText('Pink, warm, and dry');

  await page.goto('/vitals/visual-patient.html?case=stroke');
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
  await page.locator('#pcrText').fill('Patient alert and speaking clearly with an unobstructed airway and no secretions or abnormal airway sounds. Airway patent and continuously monitored with reassessment planned.');
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
