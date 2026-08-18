'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('Neuro Pupils / PERL button opens the scenario pupil sim over the patient', async ({ page }, testInfo) => {
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
  await expect(sim.locator('#lightLeft')).toBeVisible();
  await expect(sim.locator('#lightRight')).toBeVisible();
  await expect(sim.locator('#trackingTest')).toBeVisible();
  await expect(sim.locator('.sv-eyes')).toBeVisible();
  await expect(sim.locator('#answerCard')).toHaveClass(/ems-discovery-locked/);
  await expect(sim.locator('#answerCard')).toBeHidden();

  await sim.locator('#lightLeft').click();
  await sim.locator('#lightRight').click();
  await sim.locator('#trackingTest').click();
  await expect(sim.locator('#answerCard')).toBeVisible({ timeout: 10_000 });
  await expect(sim.locator('#equalInput')).toBeVisible();
  await expect(sim.locator('#leftReactionInput')).toBeVisible();
  await expect(sim.locator('#rightReactionInput')).toBeVisible();
  await expect(sim.locator('#gazeInput')).toBeVisible();
  await expect(sim.locator('#trackingInput')).toBeVisible();
  await sim.locator('#equalInput').selectOption('equal');
  await sim.locator('#leftReactionInput').selectOption('reactive');
  await sim.locator('#rightReactionInput').selectOption('reactive');
  await sim.locator('#gazeInput').selectOption('midline');
  await sim.locator('#trackingInput').selectOption('smooth');
  await sim.locator('#submitBtn').click();

  await expect(page.locator('#embeddedSimWorkspace')).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.pupils))).toBe(true);
  const saved = await page.evaluate(() => window.EMSCodeSimPatientRecord.active()?.findings?.pupils);
  expect(String(saved?.value || saved?.finding || '')).toMatch(/PERL/i);

  await assertNoPageErrors();
});
