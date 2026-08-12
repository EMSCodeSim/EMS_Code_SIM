'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('desktop center interaction column owns patient updates while right workspace handles clinical domains', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop three-column clinical workspace');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'learning');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimDomainWorkspace))).toBe(true);
  await expect(page.locator('body')).toHaveClass(/clinical-domain-workspace-v2/);
  await expect(page.locator('body')).toHaveClass(/clinical-interaction-workspace-v4/);

  // Complete the horse arrival gate before using the normal clinical workspace.
  const parking = page.locator('[data-horse-parking="south_barn_access"]');
  await expect(parking).toBeVisible();
  await parking.click();
  await expect(page.locator('#horseArrivalDecision')).toHaveCount(0);

  const rail = page.locator('.bottom-nav.clinical-domain-rail');
  const interaction = page.locator('#clinicalInteractionColumn');
  const rightField = page.locator('.patient-control-column');
  await expect(interaction).toBeVisible();
  await expect(rail).toBeVisible();

  // The center column is now a true interaction area: domain controls, Patient
  // Update, then follow-up/initial-assessment interaction. The photo stays clear.
  await expect.poll(() => page.evaluate(() => {
    const column = document.getElementById('clinicalInteractionColumn');
    const railNode = document.querySelector('.bottom-nav.clinical-domain-rail');
    const update = document.getElementById('infoUpdateWindow');
    const question = document.getElementById('horseClinicalQuestionBox');
    const layout = document.querySelector('.scenario-hero-layout');
    const controls = document.querySelector('.patient-control-column');
    const patient = document.querySelector('.patient-stage');
    return Boolean(
      column && railNode && update && question && layout && controls && patient &&
      column.parentElement === layout && column.nextElementSibling === controls &&
      railNode.parentElement === column && update.parentElement === column &&
      question.parentElement === column && !patient.contains(update)
    );
  })).toBe(true);
  await expect(page.locator('#infoUpdateWindow')).toBeVisible();
  await expect(page.locator('#horseClinicalQuestionBox')).toBeVisible();

  // The permanent desktop domains are Assessment, Vitals, History, and Treatment.
  // Record/Log remains internal for grading and handoff but does not consume a button.
  await expect(rail.locator('button[data-panel]:visible')).toHaveCount(4);
  await expect(rail.locator('button[data-panel="assessmentPanel"]')).toBeVisible();
  await expect(rail.locator('button[data-panel="vitalsPanel"]')).toBeVisible();
  await expect(rail.locator('button[data-panel="historyPanel"]')).toBeVisible();
  await expect(rail.locator('button[data-panel="treatmentPanel"]')).toBeVisible();
  await expect(rail.locator('button[data-panel="findingsPanel"]')).toBeHidden();
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

  // Assessment populates the same right field.
  await rail.locator('button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentPanel')).toBeVisible();
  await expect(page.locator('#assessmentTools')).toBeVisible();

  // History is its own permanent center control and populates the same right field.
  await rail.locator('button[data-panel="historyPanel"]').click();
  await expect(page.locator('#historyPanel')).toBeVisible();
  await expect(page.locator('#historyCategoryList')).toBeVisible();

  // Treatment reuses the same right field.
  await rail.locator('button[data-panel="treatmentPanel"]').click();
  await expect(page.locator('#treatmentPanel')).toBeVisible();
  await expect(page.locator('#treatmentTools')).toBeVisible();

  // Desktop uses the available width: patient -> larger interaction column -> right workspace.
  const rightBox = await rightField.boundingBox();
  const interactionBox = await interaction.boundingBox();
  const patientBox = await page.locator('.patient-stage').boundingBox();
  const updateBox = await page.locator('#infoUpdateWindow').boundingBox();
  const questionBox = await page.locator('#horseClinicalQuestionBox').boundingBox();
  expect(rightBox).not.toBeNull();
  expect(interactionBox).not.toBeNull();
  expect(patientBox).not.toBeNull();
  expect(updateBox).not.toBeNull();
  expect(questionBox).not.toBeNull();
  expect(interactionBox.width).toBeGreaterThanOrEqual(270);
  expect(patientBox.x + patientBox.width).toBeLessThanOrEqual(interactionBox.x + 2);
  expect(interactionBox.x + interactionBox.width).toBeLessThanOrEqual(rightBox.x + 2);
  expect(updateBox.y + updateBox.height).toBeLessThanOrEqual(questionBox.y + 3);

  await assertNoPageErrors();
});
