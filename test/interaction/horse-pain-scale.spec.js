'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('horse-crush pain scale records 8/10 left hip as a not-normal finding', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Pain scale is verified on the desktop clinical workspace');
  test.setTimeout(80_000);
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'assessment');
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimScenarioBootstrapStatus?.ok)).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimHorseCrush?.painScaleState))).toBe(true);

  await page.locator('.bottom-nav button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentPanel')).toBeVisible();
  await page.locator('.horse-assessment-drill-choice[data-assessment-category="extremities"]').click();
  const painButton = page.locator('#assessmentTools [data-assessment-item="pain"]');
  await expect(painButton).toBeVisible();
  await expect(painButton).toContainText(/Pain scale/i);
  await painButton.click();

  await expect(page.locator('#assessmentTools.horse-pain-scale-workspace')).toBeVisible();
  await expect(page.locator('[data-pain-score]')).toHaveCount(11);
  await page.locator('[data-pain-score="8"]').click();

  await expect(page.locator('#horsePainScaleLive')).toContainText(/8\/10 left hip/i);
  await expect.poll(() => page.evaluate(() => {
    const finding = window.EMSCodeSimPatientRecord.active()?.findings?.pain;
    return {
      value: String(finding?.value || finding?.finding || ''),
      normality: finding?.normality || '',
      source: finding?.source || '',
      score: finding?.score,
      location: finding?.location || ''
    };
  })).toEqual(expect.objectContaining({
    value: '8/10 left hip',
    normality: 'not-normal',
    source: 'horse-crush-pain-scale',
    score: 8,
    location: 'left hip'
  }));

  const grading = await page.evaluate(() => {
    const plans = window.EMSCodeSimScenarioDefinitions?.PHASE_PLANS?.horse_crush || {};
    return {
      appropriate: (plans.appropriateFindings || []).includes('pain'),
      recommended: (window.EMSCodeSimScenarioDefinitions?.PATIENT_CASES?.horse_crush?.recommended || []).includes('pain')
    };
  });
  expect(grading.appropriate).toBe(true);
  expect(grading.recommended).toBe(true);

  await page.locator('#horsePainScaleBack').click();
  await expect(page.locator('#assessmentTools [data-assessment-item="pain"]')).toHaveClass(/used/);
  await page.locator('#assessmentTools [data-assessment-item="pain"]').click();
  await expect(page.locator('#assessmentTools.horse-pain-scale-workspace')).toBeVisible();
  await page.locator('[data-pain-score="8"]').click();
  await expect.poll(() => page.evaluate(() => {
    const finding = window.EMSCodeSimPatientRecord.active()?.findings?.pain;
    return Boolean(finding?.isReassessment || finding?.source === 'horse-crush-pain-scale');
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const finding = window.EMSCodeSimPatientRecord.active()?.findings?.pain;
    return String(finding?.value || finding?.finding || '');
  })).toBe('8/10 left hip');

  await page.evaluate(() => {
    window.EMSCodeSimPatientRecord.addTreatment({
      actionId: 'manual_leg_support',
      classification: 'appropriate-effective',
      recordedAt: new Date().toISOString(),
      treatment: 'Assign manual support to the injured leg'
    });
  });
  await page.locator('[data-pain-score="6"]').click();
  await expect.poll(() => page.evaluate(() => {
    const finding = window.EMSCodeSimPatientRecord.active()?.findings?.pain;
    return {
      value: String(finding?.value || finding?.finding || ''),
      score: finding?.score,
      quote: document.querySelector('#horsePainScaleLive')?.textContent || ''
    };
  })).toEqual(expect.objectContaining({
    value: '6/10 left hip',
    score: 6
  }));
  await expect(page.locator('#horsePainScaleLive')).toContainText(/six or seven|don’t move it/i);

  await page.evaluate(() => {
    window.EMSCodeSimPatientRecord.addTreatment({
      actionId: 'force_straight',
      classification: 'contraindicated',
      recordedAt: new Date().toISOString(),
      treatment: 'Straighten the leg before moving'
    });
  });
  await page.locator('[data-pain-score="10"]').click();
  await expect.poll(() => page.evaluate(() => {
    const finding = window.EMSCodeSimPatientRecord.active()?.findings?.pain;
    return {
      value: String(finding?.value || finding?.finding || ''),
      score: finding?.score
    };
  })).toEqual(expect.objectContaining({
    value: '10/10 left hip',
    score: 10
  }));
  await expect(page.locator('#horsePainScaleLive')).toContainText(/ten|stop/i);

  await assertNoPageErrors();
});
