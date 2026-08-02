'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-01T10:00:00-06:00') });
  await clearSiteStorage(page);
});

test('visual patient keeps scene size-up manual and guides it without blocking a missed decision', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/visual-patient.html?case=asthma&mode=scenario&resume=1');
  await expect(page.locator('#patientImage')).toBeVisible();
  await expect(page.locator('#sceneGuide')).toBeHidden();
  await page.locator('[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentTools .scene-size-card')).toBeVisible();
  await expect(page.locator('#assessmentTools .sequence-card').nth(0)).toContainText('Scene size-up');
  await expect(page.locator('#assessmentTools .sequence-card').nth(1)).toContainText('Airway');
  await expect(page.locator('#assessmentTools .sequence-card').nth(2)).toContainText('Breathing');
  await expect(page.locator('#assessmentTools .sequence-card').nth(3)).toContainText('Circulation');
  await page.locator('.scene-guide-card-button').click();
  await expect(page.locator('#sceneGuide')).toBeVisible();
  await expect(page.locator('#sceneGuideQuestion')).toContainText('What PPE should you use?');

  for (let index = 0; index < 9; index += 1) {
    await page.locator('input[name="sceneGuideAnswer"]').first().check();
    await page.locator('#sceneGuideNext').click();
    await expect(page.locator('#sceneGuideFeedback')).toBeVisible();
    await page.locator('#sceneGuideNext').click();
  }

  await expect(page.locator('#sceneGuideComplete')).toBeVisible();
  const saved = await page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem('emscodesim_patient_record_asthma'));
    const state = JSON.parse(localStorage.getItem('emscodesim_scenario_asthma'));
    return { finding: record.findings.scene_size_up, done: state.done };
  });
  expect(saved.finding.answers).toHaveLength(9);
  expect(saved.finding.score).toBeLessThan(9);
  expect(saved.done).toContain(0);

  await page.goto('/vitals/scenario-debrief.html');
  const sceneCard = page.locator('.finding-card', { hasText: 'Scene Size Up' });
  await expect(sceneCard).toContainText('Review guided scene decisions');
  await expect(sceneCard).toContainText('Preferred choice');
  await assertNoPageErrors();
});

test('picture-first scenario launches, records a timed respiratory rate, and restores progress', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await openScenario(page, 'asthma');

  await expect(page.locator('#caseTitle')).toHaveText('Respiratory Distress');
  await expect(page.locator('#progressLabel')).toHaveText('0 of 12 complete');
  await expect(page.locator('#scenarioPatientImage')).toBeVisible();
  await expect.poll(() => page.locator('#scenarioPatientImage').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);

  await page.locator('#steps a[href^="/vitals/respiratory-rate-scenario.html"]').click();
  await expect(page).toHaveURL(/respiratory-rate-scenario\.html/);
  await expect(page.locator('#patientStrip')).toBeVisible();

  await page.locator('#startMeasure').click();
  await expect(page.locator('#timer')).toHaveText('15');
  await page.clock.runFor(16_000);
  await expect(page.locator('#timer')).toHaveText('0');
  await expect(page.locator('#submitBtn')).toBeEnabled();

  await page.locator('#rrInput').fill('20');
  await page.locator('#effortInput').selectOption('unlabored');
  await page.locator('#submitBtn').click();
  await expect(page.locator('#result')).toContainText('Accuracy will be reviewed at the end of the scenario');
  await expect(page.locator('#returnBtn')).toBeVisible();

  const savedRespirations = await page.evaluate(() => {
    const id = localStorage.getItem('emscodesim_active_patient_record');
    const record = JSON.parse(localStorage.getItem(`emscodesim_patient_record_${id}`));
    return record.findings.respirations;
  });
  expect(savedRespirations.value).toBe('20/min; unlabored');
  expect(savedRespirations.expectedFinding).toBe('28/min; labored');
  expect(savedRespirations.accurate).toBe(false);
  expect(savedRespirations.normality).toBe('not-normal');


  await page.goto('/vitals/scenario-debrief.html');
  const respiratoryCard = page.locator('.finding-card', { hasText: 'Respiratory Rate' });
  await expect(respiratoryCard).toContainText('Review this finding');
  await expect(respiratoryCard).toContainText('28/min; labored');

  await page.goto('/vitals/scenario-launcher.html?case=asthma&resume=1');
  await expect(page.locator('#progressLabel')).toHaveText('1 of 12 complete');
  const respiratoryStep = page.locator('.step').filter({ hasText: 'Respiratory rate' });
  await expect(respiratoryStep.locator('.step-status')).toHaveText('Recorded');

  await page.reload();
  await expect(page.locator('#progressLabel')).toHaveText('1 of 12 complete');
  await assertNoPageErrors();
});

test('scenario completion blocks incomplete work and persists completed state', async ({ page }) => {
  await openScenario(page, 'asthma');
  await page.locator('#completeScenario').click();
  await expect(page.locator('#completionMessage')).toContainText('Complete each required step');

  await page.evaluate(() => {
    localStorage.setItem('emscodesim_scenario_asthma', JSON.stringify({
      done: Array.from({ length: 12 }, (_, index) => index),
      complete: false
    }));
  });
  await page.reload();
  await expect(page.locator('#progressLabel')).toHaveText('12 of 12 complete');
  await page.locator('#completeScenario').click();
  await expect(page.locator('#completionMessage')).toContainText('Scenario complete');

  const state = await page.evaluate(() => ({
    scenario: JSON.parse(localStorage.getItem('emscodesim_scenario_asthma')),
    mastered: localStorage.getItem('emscodesim_mastered_scenario_asthma')
  }));
  expect(state.scenario.complete).toBe(true);
  expect(state.mastered).toBe('true');
});
