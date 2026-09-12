'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('asthma learning load is park respiratory care with no trauma leftovers', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/visual-patient.html?case=asthma&training=learning&reset=1');

  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimAsthmaLearningCase))).toBe(true);
  await expect(page.locator('#caseTitle')).toContainText('I can’t get air');
  await expect(page.locator('#scene')).toContainText('Public park');
  await expect(page.locator('#scene')).toContainText('Audible wheeze');
  await expect(page.locator('#scene')).toContainText('No obvious trauma');
  await expect(page.locator('#patientClockStatus')).toHaveText('Patient clock • severe dyspnea');

  const identity = await page.evaluate(() => window.EMSCodeSimAsthmaLearningCase);
  expect(identity.chiefComplaint).toBe('I can’t get air');
  expect(identity.impressionTag).toBe('severe dyspnea');
  expect(identity.scene.toLowerCase()).toContain('park');
  expect(identity.scene.toLowerCase()).toContain('wheeze');

  await expect(page.locator('#asthmaLearningStart')).toBeVisible();
  await expect(page.locator('#asthmaLearningStart')).toContainText('Anxious, tripod / forward lean, diaphoretic');
  await expect(page.locator('#asthmaLearningStart')).toContainText('Accessory muscles, prolonged expiratory phase');
  await expect(page.locator('#asthmaLearningStart')).toContainText('Pink but sweaty');

  const headerText = await page.locator('.vp-top').innerText();
  expect(headerText.toLowerCase()).not.toContain('severe pain');
  expect(headerText.toLowerCase()).not.toContain('horse');
  expect(headerText.toLowerCase()).not.toContain('crush');
  expect(headerText.toLowerCase()).not.toContain('pelvis');
  expect(headerText.toLowerCase()).not.toContain('bleeding');

  await page.locator('#asthmaFirstLookAction').click();
  await expect(page.locator('#asthmaFirstLookFindings')).toBeVisible();
  await expect(page.locator('#asthmaFirstLookFindings')).toContainText('Tripod position');
  await expect(page.locator('#asthmaFirstLookFindings')).toContainText('Speaks 3–4 word sentences');
  await expect(page.locator('#asthmaFirstLookFindings')).toContainText('Audible expiratory wheeze');
  await expect(page.locator('#asthmaFirstLookFindings')).toContainText('No stridor');
  await expect(page.locator('#asthmaFirstLookFindings')).toContainText('No external trauma');

  await page.evaluate(() => {
    window.EMSCodeSimPatientRecord.setFinding('breath_sounds', 'Expiratory wheeze bilaterally with air movement present in all fields', { source: 'test-auscultation', normality: 'not-normal' });
  });
  await expect(page.locator('#asthmaLungCoach')).toHaveText('Wheeze means air is still moving. A silent chest is worse than a noisy one.');
  await assertNoPageErrors();
});

test('asthma bronchodilator creates a two-minute reassessment gate', async ({ page }) => {
  await page.goto('/vitals/visual-patient.html?case=asthma&training=learning&reset=1');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimAsthmaLearningCase))).toBe(true);
  await page.locator('#asthmaFirstLookAction').click();

  await page.evaluate(() => {
    window.EMSCodeSimPatientRecord.addTreatment({ name: 'Oxygen', description: 'Oxygen by nasal cannula' });
    window.EMSCodeSimPatientRecord.addTreatment({ name: 'Albuterol nebulizer', description: 'First bronchodilator / neb' });
  });

  await expect(page.locator('#asthmaReassessGate')).toBeVisible();
  await expect(page.locator('#asthmaReassessGate')).toContainText('Reassess in');
  await expect(page.locator('#patientClockStatus')).toContainText('Patient clock • reassess in');

  await page.evaluate(() => {
    const api = window.EMSCodeSimPatientRecord;
    api.setFinding('breathing', 'Speaking in longer sentences; accessory muscle use improved', { source: 'post-treatment-reassessment', normality: 'not-normal' });
    api.setFinding('breath_sounds', 'Wheeze persists but air movement improved bilaterally', { source: 'post-treatment-reassessment', normality: 'not-normal' });
    api.setFinding('spo2', '96%', { source: 'post-treatment-reassessment', normality: 'normal' });
    api.setFinding('mental_status', 'Alert and oriented ×4', { source: 'post-treatment-reassessment', normality: 'normal' });
    api.addReassessment({ description: 'Speaking improved; work of breathing improved; lung sounds still wheezy with better air movement; SpO2 96%; mental status alert.' });
  });

  await expect(page.locator('#asthmaReassessGate')).toBeHidden();
  await expect(page.locator('#patientClockStatus')).toHaveText('Patient clock • reassessment complete');
});

test('horse crush retains a crush-mechanism scene', async ({ page }) => {
  await page.goto('/vitals/visual-patient.html?case=horse_crush&training=learning');
  await expect.poll(() => page.locator('#scene').innerText()).toMatch(/horse|barn|crush|smashed/i);
  const scene = (await page.locator('#scene').innerText()).toLowerCase();
  expect(scene).toMatch(/horse|barn|crush|smashed/);
});
