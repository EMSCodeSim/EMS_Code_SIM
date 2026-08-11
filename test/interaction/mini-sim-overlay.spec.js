'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

async function openMiniSim(page, href, title) {
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimMiniSimOverlay))).toBe(true);
  const opened = await page.evaluate(({ href, title }) => window.EMSCodeSimMiniSimOverlay.openOverlay(href, title), { href, title });
  expect(opened).toBe(true);
  await expect(page.locator('#embeddedSimWorkspace')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('embeddedSimWorkspace')?.parentElement?.classList.contains('patient-stage') === true)).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const workspace = document.getElementById('embeddedSimWorkspace');
    const image = document.getElementById('patientImage');
    if (!workspace || !image) return 0;
    const sim = workspace.getBoundingClientRect();
    const photo = image.getBoundingClientRect();
    const width = Math.max(0, Math.min(sim.right, photo.right) - Math.max(sim.left, photo.left));
    const height = Math.max(0, Math.min(sim.bottom, photo.bottom) - Math.max(sim.top, photo.top));
    return (width * height) / Math.max(1, sim.width * sim.height);
  })).toBeGreaterThan(0.75);
}

async function expectPatientReturned(page) {
  await expect(page.locator('#embeddedSimWorkspace')).toBeHidden();
  const image = page.locator('#patientImage');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0 && node.naturalHeight > 0)).toBe(true);
}

test('device and visual assessment mini sims discover, document, save, and close over the patient', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await openScenario(page, 'horse_crush', 'learning');

  // Device family: obtain a real pulse-ox display, then manually enter what was read.
  await openMiniSim(page, '/vitals/pulse-ox-scenario.html', 'SpO₂');
  const device = page.frameLocator('#embeddedSimFrame');
  await expect(device.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(device.locator('#answerCard')).toHaveClass(/ems-discovery-locked/);
  await expect(device.locator('#answerCard')).toBeHidden();

  await device.locator('#placeProbe').click();
  await expect(device.locator('#submitBtn')).toBeEnabled({ timeout: 8000 });
  await expect(device.locator('#answerCard')).toBeVisible();
  await expect(device.locator('.ems-mini-flow span[data-step="3"]')).toHaveClass(/active/);

  const displayedSpo2 = (await device.locator('#monitorValue').textContent())?.trim();
  expect(Number(displayedSpo2)).toBeGreaterThanOrEqual(50);
  await device.locator('#spo2Input').fill(displayedSpo2);
  await device.locator('#submitBtn').click();
  await expectPatientReturned(page);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.spo2))).toBe(true);

  // Visual-assessment family: no answer is saved merely by performing the exam.
  await openMiniSim(page, '/vitals/visual-airway-assessment.html', 'Airway assessment');
  const airway = page.frameLocator('#embeddedSimFrame');
  await expect(airway.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(airway.locator('.va-interpret')).toHaveCount(0);

  const actions = airway.locator('[data-a]');
  await expect(actions).toHaveCount(4);
  for (let index = 0; index < 3; index += 1) {
    await actions.nth(index).click();
    await expect(airway.locator('.va-interpret')).toHaveCount(0);
  }
  await actions.nth(3).click();
  await expect(airway.locator('.va-interpret')).toBeVisible();
  await expect(airway.locator('.ems-mini-flow span[data-step="3"]')).toHaveClass(/active/);

  const choices = airway.locator('.va-interpret-option');
  await expect(choices.first()).toBeVisible();
  await choices.first().click();
  await airway.locator('.va-interpret-save').click();
  await expectPatientReturned(page);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.airway))).toBe(true);

  await assertNoPageErrors();
});
