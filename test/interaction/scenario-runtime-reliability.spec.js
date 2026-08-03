'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-01T10:00:00-06:00') });
  await clearSiteStorage(page);
});

test('partner skills run one at a time, survive reload, and save every result', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/visual-patient.html?case=asthma&mode=scenario&resume=1');
  await page.locator('[data-panel="vitalsPanel"]').click();

  for (const key of ['blood_pressure', 'pulse', 'respirations']) {
    await page.locator(`[data-tool-key="${key}"] .partner-action`).click();
  }

  let tasks = await page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma'));
  expect(tasks.blood_pressure.status).toBe('pending');
  expect(tasks.pulse.status).toBe('queued');
  expect(tasks.respirations.status).toBe('queued');

  await page.reload();
  await page.locator('[data-panel="vitalsPanel"]').click();
  await expect(page.locator('[data-tool-key="blood_pressure"] .assignment-progress')).toContainText('Partner gathering');

  await page.clock.runFor(13_000);
  await expect.poll(async () => page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma').blood_pressure.status)).toBe('complete');
  await expect.poll(async () => page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma').pulse.status)).toBe('pending');

  await page.clock.runFor(13_000);
  await expect.poll(async () => page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma').pulse.status)).toBe('complete');
  await expect.poll(async () => page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma').respirations.status)).toBe('pending');

  await page.clock.runFor(13_000);
  await expect.poll(async () => page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma').respirations.status)).toBe('complete');

  const result = await page.evaluate(() => {
    const record = window.EMSCodeSimPatientRecord.active();
    return {
      findings: record.findings,
      partnerLog: record.careLog.filter(event => event.source === 'partner-assignment').map(event => event.key)
    };
  });
  expect(result.findings.blood_pressure.source).toBe('partner-assignment');
  expect(result.findings.pulse.source).toBe('partner-assignment');
  expect(result.findings.respirations.source).toBe('partner-assignment');
  expect(result.partnerLog).toEqual(expect.arrayContaining(['blood_pressure', 'pulse', 'respirations']));
  await assertNoPageErrors();
});

test('the patient timer does not write scenario storage every second', async ({ page }) => {
  await page.addInitScript(() => {
    window.__scenarioStorageWrites = 0;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      if (String(key).startsWith('emscodesim_scenario_')) window.__scenarioStorageWrites += 1;
      return original.call(this, key, value);
    };
  });
  await page.goto('/vitals/visual-patient.html?case=asthma&mode=scenario&resume=1');
  const before = await page.evaluate(() => window.__scenarioStorageWrites);
  await page.clock.runFor(20_000);
  const after = await page.evaluate(() => window.__scenarioStorageWrites);
  expect(after - before).toBeLessThanOrEqual(1);
  await expect(page.locator('#timer')).toHaveText('00:20');
});

test('timed patient deterioration occurs without opening a panel', async ({ page }) => {
  await page.goto('/vitals/visual-patient.html?case=asthma&mode=scenario&resume=1');
  const firstStage = await page.evaluate(() => {
    const record = window.EMSCodeSimPatientRecord.active();
    record.startedAt = new Date(Date.now() - 181_000).toISOString();
    window.EMSCodeSimPatientRecord.save(record);
    return record.startedAt;
  });
  expect(firstStage).toBeTruthy();
  await page.clock.runFor(5_100);
  const conditionEvents = await page.evaluate(() => window.EMSCodeSimPatientRecord.active().careLog.filter(event => event.type === 'condition_change'));
  expect(conditionEvents.length).toBeGreaterThan(0);
  await expect(page.locator('#infoUpdateWindow')).toContainText(/condition|breathing|worsen/i);
});

test('main care path remains usable after partner completion', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/visual-patient.html?case=asthma&mode=scenario&resume=1');
  await page.locator('[data-panel="vitalsPanel"]').click();
  await page.locator('[data-tool-key="pulse"] .partner-action').click();
  await page.clock.runFor(13_000);
  await expect.poll(async () => page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma').pulse.status)).toBe('complete');

  for (const panel of ['assessmentPanel', 'treatmentPanel', 'transportPanel', 'findingsPanel']) {
    await page.locator(`[data-panel="${panel}"]`).click();
    await expect(page.locator(`#${panel}`)).toBeVisible();
    await page.locator('#closeSheet').click();
  }
  await assertNoPageErrors();
});
