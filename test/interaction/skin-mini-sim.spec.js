'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('Neuro / Skin button opens the skin simulator over the patient', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop skin overlay');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'assessment');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimMiniSimOverlay && window.EMSCodeSimDomainWorkspace))).toBe(true);

  await page.locator('.bottom-nav button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentPanel')).toBeVisible();
  await page.locator('.horse-assessment-drill-choice[data-assessment-category="neuro_skin"]').click();
  const skinButton = page.locator('#assessmentTools [data-assessment-item="skin"]');
  await expect(skinButton).toBeVisible();
  await expect(skinButton).toContainText('Skin');

  await skinButton.click();
  await expect(page.locator('#embeddedSimWorkspace')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('embeddedSimWorkspace')?.parentElement?.classList.contains('patient-stage') === true)).toBe(true);

  const sim = page.frameLocator('#embeddedSimFrame');
  await expect(sim.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(sim.locator('#skin')).toBeVisible();
  await expect(sim.locator('#crtBtn')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const frame = document.getElementById('embeddedSimFrame');
    const doc = frame?.contentDocument;
    const swatch = doc?.querySelector('#skin');
    const controls = doc?.querySelector('.under-skin');
    if (!swatch || !controls) return { ok:false, reason:'missing' };
    const swatchBox = swatch.getBoundingClientRect();
    const controlsBox = controls.getBoundingClientRect();
    return {
      ok: swatchBox.width >= 90 && swatchBox.height >= 90 && controlsBox.width >= 120,
      swatch: { width: swatchBox.width, height: swatchBox.height },
      controls: { width: controlsBox.width, height: controlsBox.height }
    };
  })).toMatchObject({ ok: true });

  await sim.locator('#crtBtn').click();
  await sim.locator('#btnPale').click();
  await sim.locator('#moistDry').click();
  await sim.locator('.ems-skin-record-finding').click();

  await expect(page.locator('#embeddedSimWorkspace')).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.skin))).toBe(true);

  await assertNoPageErrors();
});
