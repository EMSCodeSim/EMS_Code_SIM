'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('Chest Breath Sounds button opens the rebuilt anatomical mini sim over the patient', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop breath-sounds overlay');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'assessment');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimMiniSimOverlay && window.EMSCodeSimDomainWorkspace))).toBe(true);

  await page.locator('.bottom-nav button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentPanel')).toBeVisible();
  await page.locator('.horse-assessment-drill-choice[data-assessment-category="chest"]').click();
  const breathButton = page.locator('#assessmentTools [data-assessment-item="lung_sounds"]');
  await expect(breathButton).toBeVisible();
  await expect(breathButton).toContainText('Breath Sounds');

  await breathButton.click();
  await expect(page.locator('#embeddedSimWorkspace')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('embeddedSimWorkspace')?.parentElement?.classList.contains('patient-stage') === true)).toBe(true);

  const sim = page.frameLocator('#embeddedSimFrame');
  await expect(sim.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(sim.locator('.sv-ausc-stage')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const doc = document.getElementById('embeddedSimFrame')?.contentDocument;
    const visual = doc?.querySelector('.sv-ausc-stage');
    if (!visual) return { ok:false, reason:'missing' };
    const box = visual.getBoundingClientRect();
    const viewH = doc.documentElement?.clientHeight || 0;
    return {
      ok: box.width >= 120 && box.height >= 120 && box.top < viewH - 8 && box.bottom > 8,
      width: box.width,
      height: box.height,
      top: box.top,
      viewH
    };
  })).toMatchObject({ ok: true });
  await expect(sim.locator('.sv-ausc-stage svg')).toBeVisible();
  await expect(sim.locator('.sv-point[data-view="front"]')).toHaveCount(4);

  for (const site of ['ru', 'lu', 'rl', 'll']) {
    await sim.locator(`.sv-point[data-view="front"][data-site="${site}"]`).click();
  }
  await expect(sim.locator('#listenCount')).toContainText('4 of 4');
  await expect(sim.locator('#answerCard')).toBeVisible();
  await sim.locator('#soundInput').selectOption('normal');
  await sim.locator('#submitBtn').click();

  await expect(page.locator('#embeddedSimWorkspace')).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.breath_sounds))).toBe(true);

  await assertNoPageErrors();
});
