'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

const ABC_CHOICE_COUNTS = { airway:3, breathing:4, perfusion:3 };

test('horse-crush call works from arrival through hospital handoff', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Full horse workflow is protected on the desktop clinical workspace');
  test.setTimeout(70_000);
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'assessment');
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimScenarioBootstrapStatus?.ok)).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimHorseCrushUiFix))).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimHorsePhotoLayerFix))).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimMiniSimOverlay))).toBe(true);
  await expect.poll(() => page.evaluate(() => document.getElementById('embeddedSimWorkspace')?.parentElement?.classList.contains('patient-stage') === true)).toBe(true);
  await expect(page.locator('#emtFirstUseOrientation')).toHaveCount(0);

  async function expectHorsePhoto(pathname) {
    await expect.poll(() => page.evaluate(expectedPath => {
      const image = document.getElementById('patientImage');
      if (!image) return false;
      let actualPath = '';
      try { actualPath = new URL(image.src, location.href).pathname; } catch { return false; }
      const style = getComputedStyle(image);
      const rect = image.getBoundingClientRect();
      return actualPath === expectedPath
        && image.complete
        && image.naturalWidth > 0
        && image.naturalHeight > 0
        && !image.hidden
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || 1) > 0
        && rect.width > 0
        && rect.height > 0;
    }, pathname)).toBe(true);
  }

  async function expectSimulatorOverPatientPhoto() {
    const layout = await page.evaluate(() => {
      const workspace = document.getElementById('embeddedSimWorkspace');
      const image = document.getElementById('patientImage');
      if (!workspace || !image) return { ok:false, reason:'missing workspace or image' };
      const wasHidden = workspace.hidden;
      const hadBodyClass = document.body.classList.contains('sim-workspace-open');
      workspace.hidden = false;
      document.body.classList.add('sim-workspace-open');
      const imageRect = image.getBoundingClientRect();
      const simRect = workspace.getBoundingClientRect();
      const overlapWidth = Math.max(0, Math.min(simRect.right, imageRect.right) - Math.max(simRect.left, imageRect.left));
      const overlapHeight = Math.max(0, Math.min(simRect.bottom, imageRect.bottom) - Math.max(simRect.top, imageRect.top));
      const overlapArea = overlapWidth * overlapHeight;
      const simArea = Math.max(1, simRect.width * simRect.height);
      const overlapRatio = overlapArea / simArea;
      const result = {
        ok:true,
        overlapRatio,
        parentClass: workspace.parentElement?.className || '',
        imageRect:{ x:imageRect.x, y:imageRect.y, width:imageRect.width, height:imageRect.height },
        simRect:{ x:simRect.x, y:simRect.y, width:simRect.width, height:simRect.height }
      };
      workspace.hidden = wasHidden;
      if (!hadBodyClass) document.body.classList.remove('sim-workspace-open');
      return result;
    });
    expect(layout.ok, JSON.stringify(layout)).toBe(true);
    expect(layout.parentClass, JSON.stringify(layout)).toContain('patient-stage');
    expect(layout.overlapRatio, `Assessment simulator must open over the patient photo: ${JSON.stringify(layout)}`).toBeGreaterThan(0.75);
  }

  // After walk video, dispatch, ambulance position, and BLS handoff, the patient photo is revealed.
  await expect(page.locator('[data-horse-parking]')).toHaveCount(0);
  await expect(page.locator('#horseArrivalDecision')).toHaveCount(0);
  await expectHorsePhoto('/vitals/assets/horse-crush/handoff.webp');
  await expectSimulatorOverPatientPhoto();

  // Visible desktop ABC workflow.
  await page.locator('.bottom-nav button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentPanel')).toBeVisible();
  await page.locator('[data-assessment-category="abc"]').click();

  async function recordAbc(key) {
    const button = page.locator(`[data-assessment-item="${key}"]`);
    await expect(button).toBeVisible();
    await button.click();
    const choices = page.locator('#horseAssessmentInlineQuestion .horse-question-choice');
    await expect(choices.first()).toBeVisible();
    await expect(choices).toHaveCount(ABC_CHOICE_COUNTS[key]);
    await choices.first().click();
    await expect.poll(() => page.evaluate(findingKey => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.[findingKey]), key)).toBe(true);
  }

  await recordAbc('airway');
  await recordAbc('breathing');
  await recordAbc('perfusion');

  // Focused trauma exam using the same desktop category workspace.
  await page.locator('#horseAssessmentBack').click();
  await page.locator('[data-assessment-category="abdomen_pelvis"]').click();
  await page.locator('[data-assessment-item="pelvis_hip"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.pelvis_hip))).toBe(true);
  await expectHorsePhoto('/vitals/assets/horse-crush/exam-pelvis.webp');

  await page.locator('#horseAssessmentBack').click();
  await page.locator('[data-assessment-category="extremities"]').click();
  await page.locator('[data-assessment-item="left_leg"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.left_leg))).toBe(true);
  await expectHorsePhoto('/vitals/assets/horse-crush/exam-leg.webp');
  await page.locator('[data-assessment-item="distal_csm"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.distal_csm))).toBe(true);
  await expectHorsePhoto('/vitals/assets/horse-crush/exam-leg.webp');
  await expectSimulatorOverPatientPhoto();

  // Stabilization treatment.
  await page.locator('.bottom-nav button[data-panel="treatmentPanel"]').click();
  await expect(page.locator('#treatmentPanel')).toBeVisible();
  await page.locator('[data-horse-treatment-group="splinting"]').click();
  await page.locator('[data-horse-workspace-plan="manual_leg_support"]').click();
  await expect(page.locator('#horseTreatmentWorkspaceDetail .horse-treatment-perform')).toBeVisible();
  await page.locator('#horseTreatmentWorkspaceDetail .horse-treatment-perform').click();
  await expect.poll(() => page.evaluate(() => {
    const treatments = window.EMSCodeSimPatientRecord.active()?.treatments || [];
    return treatments.some(item => item.actionId === 'manual_leg_support');
  })).toBe(true);

  // Transport launched from scenario progress must be visible and usable.
  const closeSheet = page.locator('#closeSheet');
  if (await closeSheet.isVisible()) await closeSheet.click();
  await page.locator('#scenarioMenuButton').click();
  await expect(page.locator('#scenarioControlDialog')).toBeVisible();
  await page.locator('#handoffFromProgress').click();
  await expect(page.locator('#scenarioControlDialog')).toBeHidden();

  const transportForm = page.locator('form.horse-transport-selection-form');
  await expect(transportForm).toBeVisible();
  await transportForm.locator('select[name="impression"]').selectOption({ index: 1 });
  await transportForm.locator('select[name="priority"]').selectOption({ label: 'Prompt trauma transport' });
  await transportForm.locator('select[name="destination"]').selectOption({ index: 1 });
  await transportForm.locator('select[name="notification"]').selectOption({ label: 'No specialty activation' });
  await transportForm.locator('textarea[name="rationale"]').fill('Significant horse-compression mechanism with severe hip pain and inability to safely bear weight.');
  await transportForm.locator('.horse-treatment-perform').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.documentation?.transportDecisionAt))).toBe(true);

  // The next progress/handoff action must open the visible hospital workspace.
  await page.locator('#scenarioMenuButton').click();
  await expect(page.locator('#scenarioControlDialog')).toBeVisible();
  await page.locator('#handoffFromProgress').click();
  await expect(page.locator('#scenarioControlDialog')).toBeHidden();
  await expect(page.locator('#hospitalHandoffWorkspace')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/hospital-handoff-open/);
  await expect.poll(() => page.evaluate(() => {
    const sheet = document.getElementById('actionSheet');
    const treatment = document.getElementById('treatmentPanel');
    const draft = document.getElementById('hospitalHandoffDraft');
    const sample = document.getElementById('sampleHospitalHandoffPanel') || document.getElementById('sampleHospitalHandoffText');
    if (!sheet || !treatment || !draft) return { ok:false, reason:'missing' };
    const hidden = el => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return el.hidden || style.display === 'none' || style.visibility === 'hidden' || box.width < 2 || box.height < 2;
    };
    const overlap = (a, b) => {
      const aBox = a.getBoundingClientRect();
      const bBox = b.getBoundingClientRect();
      const width = Math.max(0, Math.min(aBox.right, bBox.right) - Math.max(aBox.left, bBox.left));
      const height = Math.max(0, Math.min(aBox.bottom, bBox.bottom) - Math.max(aBox.top, bBox.top));
      return width * height;
    };
    return {
      ok: hidden(sheet)
        && hidden(treatment)
        && overlap(sheet, draft) === 0
        && (!sample || overlap(sheet, sample) === 0),
      sheetHidden: hidden(sheet),
      treatmentHidden: hidden(treatment)
    };
  })).toMatchObject({ ok: true });

  await page.locator('#hospitalHandoffDraft').fill(
    '64-year-old alert patient compressed between two horses and knocked to the ground. Severe left hip pain with the leg held flexed. Airway, breathing, and perfusion are intact. Pelvis/hip and injured leg were assessed with distal CSM intact. The leg was manually supported in the position of comfort. Prompt trauma transport was selected.'
  );
  await page.locator('#saveHospitalHandoff').click();
  await expect.poll(() => page.evaluate(() => {
    const documentation = window.EMSCodeSimPatientRecord.active()?.documentation || {};
    return Boolean(documentation.handoffSavedAt && documentation.handoff);
  })).toBe(true);

  await assertNoPageErrors();
});
