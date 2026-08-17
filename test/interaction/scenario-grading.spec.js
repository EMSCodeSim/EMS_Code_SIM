'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('horse-crush scenario grading opens after handoff without runtime errors', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Horse grading is verified on the desktop clinical workspace');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'assessment');
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimScenarioBootstrapStatus?.ok)).toBe(true);
  await expect.poll(() => page.evaluate(() => typeof window.EMSCodeSimHorseEncounterActions?.openGrade)).toBe('function');
  await expect.poll(() => page.evaluate(() => typeof window.EMSCodeSimPatientSatisfactionGrade?.model)).toBe('function');

  await page.evaluate(() => {
    const api = window.EMSCodeSimPatientRecord;
    const now = new Date().toISOString();
    const findings = {
      scene_size_up: 'Safe scene with horse-compression MOI',
      airway: 'Patent and protected',
      breathing: 'Adequate chest rise',
      perfusion: 'Radial pulses present',
      pelvis_hip: 'Severe left hip pain',
      left_leg: 'Held flexed and guarded',
      distal_csm: 'Distal CSM intact',
      pain: '8/10 left hip pain',
      sample: 'No allergies; hydrocodone at home; events match MOI',
      blood_pressure: '130/90',
      pulse: '75',
      respirations: '16',
      spo2: '98%'
    };
    Object.entries(findings).forEach(([key, value]) => {
      api.setFinding(key, value, { source: 'grade-test', recordedAt: now });
    });
    api.addTreatment({
      actionId: 'manual_leg_support',
      name: 'Manual leg support',
      classification: 'appropriate-effective',
      recordedAt: now
    });
    api.addTreatment({
      actionId: 'pain_control',
      name: 'Pain control',
      classification: 'appropriate-effective',
      recordedAt: now
    });
    api.setDocumentation({
      transportPriority: 'Prompt trauma transport',
      destination: 'Trauma center',
      transportRationale: 'Significant horse-compression mechanism with severe hip pain',
      transportDecisionAt: now,
      transportNotification: 'Trauma activation',
      handoff: '64-year-old compressed between horses with severe left hip pain. Airway, breathing, and perfusion intact. Distal CSM intact. Leg supported and pain treated. Prompt trauma transport to trauma center with BP, pulse, respirations, and SpO2 documented.',
      handoffSavedAt: now
    });
  });

  // Relieved clinical stage previously crashed grading via return100 identifiers.
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimScenarioRuntime?.horseClinicalState?.(window.EMSCodeSimPatientRecord.active())?.stage)).toBe('relieved');

  await page.evaluate(() => window.EMSCodeSimHorseEncounterActions.openGrade());
  await expect(page.locator('#horseGradeWorkspace')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/horse-grade-open/);

  await expect.poll(() => page.evaluate(() => {
    const workspace = document.getElementById('horseGradeWorkspace');
    const style = workspace ? getComputedStyle(workspace) : null;
    const rect = workspace?.getBoundingClientRect();
    return Boolean(
      workspace
      && style
      && (style.position === 'fixed' || style.position === 'absolute')
      && Number.parseFloat(style.zIndex || '0') >= 14
      && rect
      && rect.height > 400
      && rect.width > 700
    );
  })).toBe(true);

  await expect.poll(() => page.evaluate(() => {
    const model = window.EMSCodeSimPatientSatisfactionGrade.model();
    const scoreText = document.getElementById('horseGradeScore')?.textContent || '';
    const reveal = document.getElementById('horsePatientSatisfactionReveal');
    const categories = document.getElementById('horseGradeCategories');
    const strengths = document.getElementById('horseGradeStrengths');
    return Boolean(
      model
      && Number.isFinite(model.score)
      && /\d+/.test(scoreText)
      && reveal
      && /Linda/i.test(reveal.innerText || '')
      && categories
      && !categories.hidden
      && categories.children.length > 0
      && strengths
      && !strengths.hidden
    );
  })).toBe(true);

  await expect.poll(() => page.evaluate(() => {
    const docs = window.EMSCodeSimPatientRecord.active()?.documentation || {};
    return Number.isFinite(docs.scenarioGrade) && Boolean(docs.scenarioGradeLabel) && Boolean(docs.gradeViewedAt);
  })).toBe(true);

  await assertNoPageErrors();
});
