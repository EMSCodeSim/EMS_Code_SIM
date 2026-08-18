'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('Neuro Pupils / PERL button opens the site eye simulator over the patient', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop PERL overlay');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'assessment');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimMiniSimOverlay && window.EMSCodeSimDomainWorkspace))).toBe(true);

  await page.locator('.bottom-nav button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentPanel')).toBeVisible();
  await page.locator('.horse-assessment-drill-choice[data-assessment-category="neuro_skin"]').click();
  const perlButton = page.locator('#assessmentTools [data-assessment-item="pupils"]');
  await expect(perlButton).toBeVisible();
  await expect(perlButton).toContainText('Pupils / PERL');

  await perlButton.click();
  await expect(page.locator('#embeddedSimWorkspace')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('embeddedSimWorkspace')?.parentElement?.classList.contains('patient-stage') === true)).toBe(true);

  const sim = page.frameLocator('#embeddedSimFrame');
  await expect(sim.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(sim.locator('#svgR')).toBeVisible();
  await expect(sim.locator('#svgL')).toBeVisible();
  await expect(sim.locator('#btnLightR')).toBeVisible();
  await expect(sim.locator('#btnLightL')).toBeVisible();
  await expect(sim.locator('#perl')).toBeVisible();

  await sim.locator('#btnLightR').click();
  await sim.locator('#btnLightL').click();
  await sim.locator('#gaze').evaluate(input => {
    input.value = '40';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sim.locator('#perl').selectOption('Yes');
  await sim.locator('#sizeR').selectOption('Normal');
  await sim.locator('#sizeL').selectOption('Normal');
  await sim.locator('#reactR').selectOption('Normal');
  await sim.locator('#reactL').selectOption('Normal');
  await sim.locator('#trackR').selectOption('Normal tracking');
  await sim.locator('#trackL').selectOption('Normal tracking');
  await sim.locator('#btnGrade').click();

  await expect(page.locator('#embeddedSimWorkspace')).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.pupils))).toBe(true);

  await assertNoPageErrors();
});
