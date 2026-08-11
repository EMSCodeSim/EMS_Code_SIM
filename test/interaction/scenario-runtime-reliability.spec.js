'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-01T10:00:00-06:00') });
  await clearSiteStorage(page);
});

async function unlockGuidedCare(page, caseId = 'asthma') {
  await page.evaluate(caseId => {
    const session = window.EMSCodeSimScenarioSession;
    session.sync(caseId);
    session.saveFinding('scene_size_up', 'Scene size-up completed for reliability test', { source:'browser-test', classification:'Complete' });
    session.saveFinding('airway', 'Patent; patient speaking', { source:'browser-test', normality:'normal', status:'normal' });
    session.saveFinding('breathing', 'Breathing assessed', { source:'browser-test', normality:'not-normal', status:'abnormal' });
    session.saveFinding('perfusion', 'Radial pulse present; no major external bleeding', { source:'browser-test', normality:'normal', status:'normal' });
  }, caseId);
  await page.reload();
  await expect(page.locator('.bottom-nav')).not.toHaveClass(/guide-locked/);
}

async function assignVitalToPartner(page, key) {
  const desktopTile = page.locator(`[data-vital-key="${key}"]`);
  if (await desktopTile.isVisible().catch(() => false)) {
    await desktopTile.click();
    await expect(page.locator('#desktopVitalAction')).toBeVisible();
    await page.locator('#desktopVitalPartner').click();
    return;
  }
  await page.locator('[data-panel="vitalsPanel"]').click();
  await page.locator(`[data-tool-key="${key}"] .partner-action`).click();
}

async function runPendingPartnerSkill(page, caseId, key) {
  const task = await page.evaluate(({ caseId, key }) => window.EMSCodeSimScenarioSession.readPartnerTasks(caseId)[key], { caseId, key });
  expect(task?.status).toBe('pending');
  const remainingMs = Math.max(0, new Date(task.dueAt).getTime() - await page.evaluate(() => Date.now()));
  await page.clock.runFor(remainingMs + 1_000);
  await expect.poll(async () => page.evaluate(({ caseId, key }) => window.EMSCodeSimScenarioSession.readPartnerTasks(caseId)[key]?.status, { caseId, key })).toBe('complete');
}

test('partner skills run one at a time, survive reload, and save every result', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/visual-patient.html?case=asthma&training=learning&reset=1');
  await unlockGuidedCare(page, 'asthma');

  for (const key of ['blood_pressure', 'pulse', 'respirations']) {
    await assignVitalToPartner(page, key);
  }

  let tasks = await page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma'));
  expect(tasks.blood_pressure.status).toBe('pending');
  expect(tasks.blood_pressure.delaySeconds).toBe(24);
  expect(tasks.pulse.status).toBe('queued');
  expect(tasks.respirations.status).toBe('queued');

  await page.reload();
  const desktopBp = page.locator('[data-vital-key="blood_pressure"]');
  if (await desktopBp.isVisible().catch(() => false)) {
    await expect(desktopBp).toContainText(/Partner/);
  } else {
    await page.locator('[data-panel="vitalsPanel"]').click();
    await expect(page.locator('[data-tool-key="blood_pressure"] .assignment-progress')).toContainText('Partner gathering');
  }

  await runPendingPartnerSkill(page, 'asthma', 'blood_pressure');
  await expect.poll(async () => page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma').pulse.status)).toBe('pending');

  tasks = await page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma'));
  expect(tasks.pulse.delaySeconds).toBe(15);
  await runPendingPartnerSkill(page, 'asthma', 'pulse');
  await expect.poll(async () => page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma').respirations.status)).toBe('pending');

  tasks = await page.evaluate(() => window.EMSCodeSimScenarioSession.readPartnerTasks('asthma'));
  expect(tasks.respirations.delaySeconds).toBe(20);
  await runPendingPartnerSkill(page, 'asthma', 'respirations');

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
  await page.goto('/vitals/visual-patient.html?case=asthma&training=learning&reset=1');
  const before = await page.evaluate(() => window.__scenarioStorageWrites);
  await page.clock.runFor(20_000);
  const after = await page.evaluate(() => window.__scenarioStorageWrites);
  expect(after - before).toBeLessThanOrEqual(1);
  await expect(page.locator('#timer')).toHaveText('00:20');
});

test('timed patient deterioration occurs without opening a panel', async ({ page }) => {
  await page.goto('/vitals/visual-patient.html?case=asthma&training=learning&reset=1');
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
  const info = page.locator('#infoUpdateWindow');
  await expect(info).toHaveClass(/info-alert/);
  await expect(info).toContainText(/respiratory|fatigue|wheez|air movement|decreas/i);
});

test('main care path remains usable after partner completion', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/visual-patient.html?case=asthma&training=learning&reset=1');
  await unlockGuidedCare(page, 'asthma');
  await assignVitalToPartner(page, 'pulse');
  await runPendingPartnerSkill(page, 'asthma', 'pulse');

  for (const panel of ['assessmentPanel', 'historyPanel', 'treatmentPanel', 'findingsPanel']) {
    await page.locator(`[data-panel="${panel}"]`).click();
    await expect(page.locator(`#${panel}`)).toBeVisible();
    if (await page.locator('#closeSheet').isVisible().catch(() => false)) await page.locator('#closeSheet').click();
  }
  await assertNoPageErrors();
});
