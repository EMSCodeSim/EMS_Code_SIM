'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('desktop center controls populate one right clinical workspace and vitals retain entered values', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop three-column clinical workspace');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'learning');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimDomainWorkspace))).toBe(true);
  await expect(page.locator('body')).toHaveClass(/clinical-domain-workspace-v2/);

  // Complete the horse arrival gate before using the normal clinical workspace.
  const parking = page.locator('[data-horse-parking="south_barn_access"]');
  await expect(parking).toBeVisible();
  await parking.click();
  await expect(page.locator('#horseArrivalDecision')).toHaveCount(0);

  const rail = page.locator('.bottom-nav.clinical-domain-rail');
  await expect(rail).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const railNode = document.querySelector('.bottom-nav.clinical-domain-rail');
    const layout = document.querySelector('.scenario-hero-layout');
    const controls = document.querySelector('.patient-control-column');
    return Boolean(railNode && layout && controls && railNode.parentElement === layout && railNode.nextElementSibling === controls);
  })).toBe(true);

  await expect(rail.locator('button[data-panel]:visible')).toHaveCount(4);
  await expect(rail.locator('button[data-panel="historyPanel"]')).toBeHidden();
  await expect(page.locator('#desktopPatientMonitor')).toBeHidden();

  // Vitals: selecting the center control populates the right field with every measurable vital.
  await rail.locator('button[data-panel="vitalsPanel"]').click();
  await expect(page.locator('#vitalsPanel')).toBeVisible();
  const vitalRows = page.locator('#vitalTools .compact-vital-row');
  await expect(vitalRows).toHaveCount(6);
  for (const label of ['Blood pressure', 'Pulse', 'Respiratory rate', 'SpO₂', 'Blood glucose', 'Temperature']) {
    await expect(page.locator('#vitalTools .compact-vital-row', { hasText: label })).toBeVisible();
  }

  // Clicking the vital row itself opens its mini sim over the patient image.
  const spo2Row = page.locator('#vitalTools .compact-vital-row', { hasText: 'SpO₂' });
  await spo2Row.locator('.vital-row-copy').click();
  await expect(page.locator('#embeddedSimWorkspace')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('embeddedSimWorkspace')?.parentElement?.classList.contains('patient-stage') === true)).toBe(true);

  const device = page.frameLocator('#embeddedSimFrame');
  await expect(device.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await device.locator('#placeProbe').click();
  await expect(device.locator('#submitBtn')).toBeEnabled({ timeout: 8000 });
  const displayedSpo2 = (await device.locator('#monitorValue').textContent())?.trim();
  expect(Number(displayedSpo2)).toBeGreaterThanOrEqual(50);
  await device.locator('#spo2Input').fill(displayedSpo2);
  await device.locator('#submitBtn').click();
  await expect(page.locator('#embeddedSimWorkspace')).toBeHidden();

  // The entered result is retained in the same right-side vital row.
  await expect.poll(async () => (await spo2Row.locator('.vital-latest-result').textContent()) || '').toContain(displayedSpo2);

  // Assessment populates the same right field. History is launched from here,
  // eliminating a duplicate permanent History control from the center rail.
  await rail.locator('button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentPanel')).toBeVisible();
  await expect(page.locator('#assessmentTools')).toBeVisible();
  const historyLauncher = page.locator('#assessmentPanel .assessment-history-launcher');
  await expect(historyLauncher).toBeVisible();
  await historyLauncher.click();
  await expect(page.locator('#historyPanel')).toBeVisible();
  await expect(page.locator('#historyCategoryList')).toBeVisible();

  // Treatment and Record reuse the same right field instead of opening separate desktop surfaces.
  await rail.locator('button[data-panel="treatmentPanel"]').click();
  await expect(page.locator('#treatmentPanel')).toBeVisible();
  await expect(page.locator('#treatmentTools')).toBeVisible();

  await rail.locator('button[data-panel="findingsPanel"]').click();
  await expect(page.locator('#findingsPanel')).toBeVisible();

  const rightField = page.locator('.patient-control-column');
  const rightBox = await rightField.boundingBox();
  const railBox = await rail.boundingBox();
  const patientBox = await page.locator('.patient-stage').boundingBox();
  expect(rightBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect(patientBox).not.toBeNull();
  expect(patientBox.x + patientBox.width).toBeLessThanOrEqual(railBox.x + 2);
  expect(railBox.x + railBox.width).toBeLessThanOrEqual(rightBox.x + 2);

  await assertNoPageErrors();
});
