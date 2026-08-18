'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('horse-crush AAOx4 records Alert and oriented ×4 as a normal mental-status finding', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'AAOx4 is verified on the desktop clinical workspace');
  test.setTimeout(70_000);
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'assessment');
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimScenarioBootstrapStatus?.ok)).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimHorseCrush?.aaox4State))).toBe(true);

  await page.locator('.bottom-nav button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentPanel')).toBeVisible();
  await page.locator('.horse-assessment-drill-choice[data-assessment-category="neuro_skin"]').click();
  const aaoxButton = page.locator('#assessmentTools [data-assessment-item="mental_status"]');
  await expect(aaoxButton).toBeVisible();
  await expect(aaoxButton).toContainText(/AAOx4|Orientation/i);
  await aaoxButton.click();

  await expect(page.locator('#assessmentTools.horse-aaox4-workspace')).toBeVisible();
  await expect(page.locator('[data-aaox4-domain]')).toHaveCount(5);

  for (const domain of ['alert', 'person', 'place', 'time', 'event']) {
    await page.locator(`[data-aaox4-domain="${domain}"]`).click();
    await expect(page.locator(`[data-aaox4-domain="${domain}"]`)).toHaveClass(/used/);
  }

  await expect(page.locator('#horseAaox4Live')).toContainText(/Alert and oriented/i);
  await expect.poll(() => page.evaluate(() => {
    const finding = window.EMSCodeSimPatientRecord.active()?.findings?.mental_status;
    return {
      value: String(finding?.value || finding?.finding || ''),
      normality: finding?.normality || '',
      source: finding?.source || '',
      details: String(finding?.details || '')
    };
  })).toEqual(expect.objectContaining({
    value: 'Alert and oriented ×4',
    normality: 'normal',
    source: 'horse-crush-aaox4'
  }));

  const grading = await page.evaluate(() => {
    const plans = window.EMSCodeSimScenarioDefinitions?.PHASE_PLANS?.horse_crush || {};
    return {
      appropriate: (plans.appropriateFindings || []).includes('mental_status'),
      recommended: (window.EMSCodeSimScenarioDefinitions?.PATIENT_CASES?.horse_crush?.recommended || []).includes('mental_status')
    };
  });
  expect(grading.appropriate).toBe(true);
  expect(grading.recommended).toBe(true);

  await page.locator('#horseAaox4Back').click();
  await expect(page.locator('#assessmentTools [data-assessment-item="mental_status"]')).toHaveClass(/used/);
  await page.locator('#assessmentTools [data-assessment-item="mental_status"]').click();
  await expect(page.locator('#assessmentTools.horse-aaox4-workspace')).toBeVisible();
  for (const domain of ['alert', 'person', 'place', 'time', 'event']) {
    await page.locator(`[data-aaox4-domain="${domain}"]`).click();
  }
  await expect.poll(() => page.evaluate(() => {
    const finding = window.EMSCodeSimPatientRecord.active()?.findings?.mental_status;
    return Boolean(finding?.isReassessment || finding?.source === 'horse-crush-aaox4');
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const finding = window.EMSCodeSimPatientRecord.active()?.findings?.mental_status;
    return String(finding?.value || finding?.finding || '');
  })).toBe('Alert and oriented ×4');

  await assertNoPageErrors();
});
