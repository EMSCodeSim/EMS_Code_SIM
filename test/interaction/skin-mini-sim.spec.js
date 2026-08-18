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
  await expect(sim.locator('.sv-skin-compare')).toBeVisible();
  await expect(sim.locator('text=Normal reference')).toBeVisible();
  await expect(sim.locator('text=Patient sample')).toBeVisible();
  await expect(sim.locator('#inspectSkin')).toBeVisible();
  await expect(sim.locator('#touchSkin')).toBeVisible();
  await expect(sim.locator('#moistureSkin')).toBeVisible();
  await expect(sim.locator('#btnPale')).toHaveCount(0);
  await expect(sim.locator('#crtBtn')).toHaveCount(0);

  await expect.poll(() => page.evaluate(() => {
    const frame = document.getElementById('embeddedSimFrame');
    const doc = frame?.contentDocument;
    const compare = doc?.querySelector('.sv-skin-compare');
    const patient = doc?.querySelector('#patientSwatch');
    const inspect = doc?.querySelector('#inspectSkin');
    if (!compare || !patient || !inspect) return { ok:false, reason:'missing' };
    const compareBox = compare.getBoundingClientRect();
    const patientBox = patient.getBoundingClientRect();
    return {
      ok: compareBox.height >= 80 && patientBox.height >= 40 && inspect.getBoundingClientRect().height >= 24,
      compare: { width: compareBox.width, height: compareBox.height },
      patient: { width: patientBox.width, height: patientBox.height }
    };
  })).toMatchObject({ ok: true });

  await sim.locator('#inspectSkin').click();
  await sim.locator('#touchSkin').click();
  await sim.locator('#moistureSkin').click();
  await expect(sim.locator('#answerCard')).toBeVisible({ timeout: 10_000 });
  await expect(sim.locator('#colorInput')).toBeVisible();
  await expect(sim.locator('#tempInput')).toBeVisible();
  await expect(sim.locator('#moistureInput')).toBeVisible();
  await sim.locator('#colorInput').selectOption('pink');
  await sim.locator('#tempInput').selectOption('warm');
  await sim.locator('#moistureInput').selectOption('dry');
  await sim.locator('#submitBtn').click();

  await expect(page.locator('#embeddedSimWorkspace')).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.skin))).toBe(true);
  const saved = await page.evaluate(() => window.EMSCodeSimPatientRecord.active()?.findings?.skin);
  expect(String(saved?.value || saved?.finding || '')).toMatch(/pink/i);
  expect(String(saved?.value || saved?.finding || '')).toMatch(/warm/i);
  expect(String(saved?.value || saved?.finding || '')).toMatch(/dry/i);

  await assertNoPageErrors();
});
