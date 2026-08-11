'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('horse-crush call works from arrival through hospital handoff', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Full horse workflow is protected on the desktop clinical workspace');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'learning');

  await expect.poll(() => page.evaluate(() => window.EMSCodeSimScenarioBootstrapStatus?.ok)).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimHorseCrushUiFix))).toBe(true);

  const parking = page.locator('[data-horse-parking="south_barn_access"]');
  await expect(parking).toBeVisible();
  await parking.click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.arrival_parking))).toBe(true);
  await expect(page.locator('#patientImage')).toBeVisible();

  await page.locator('.bottom-nav button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#assessmentPanel')).toBeVisible();

  const abcCategory = page.locator('[data-assessment-category="abc"]');
  await expect(abcCategory).toBeVisible();
  const layout = await abcCategory.evaluate(target => {
    const rect = node => {
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { x:box.x, y:box.y, width:box.width, height:box.height, top:box.top, right:box.right, bottom:box.bottom, left:box.left };
    };
    const targetRect = target.getBoundingClientRect();
    const x = targetRect.left + targetRect.width / 2;
    const y = targetRect.top + targetRect.height / 2;
    const top = document.elementFromPoint(x, y);
    const describe = node => node ? {
      tag:node.tagName,
      id:node.id || '',
      className:typeof node.className === 'string' ? node.className : '',
      text:String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120)
    } : null;
    return {
      viewport:{ width:innerWidth, height:innerHeight },
      point:{ x, y },
      target:describe(target),
      targetRect:rect(target),
      top:describe(top),
      topRect:rect(top),
      topInsideTarget:Boolean(top && (top === target || target.contains(top))),
      actionSheetRect:rect(document.getElementById('actionSheet')),
      assessmentPanelRect:rect(document.getElementById('assessmentPanel')),
      assessmentToolsRect:rect(document.getElementById('assessmentTools')),
      infoRect:rect(document.getElementById('infoUpdateWindow')),
      navRect:rect(document.querySelector('.bottom-nav')),
      controlColumnRect:rect(document.querySelector('.patient-control-column')),
      actionSheetStyle:{
        display:getComputedStyle(document.getElementById('actionSheet')).display,
        gridTemplateRows:getComputedStyle(document.getElementById('actionSheet')).gridTemplateRows,
        overflow:getComputedStyle(document.getElementById('actionSheet')).overflow,
        position:getComputedStyle(document.getElementById('actionSheet')).position
      },
      panelStyle:{
        display:getComputedStyle(document.getElementById('assessmentPanel')).display,
        height:getComputedStyle(document.getElementById('assessmentPanel')).height,
        overflow:getComputedStyle(document.getElementById('assessmentPanel')).overflow,
        gridRow:getComputedStyle(document.getElementById('assessmentPanel')).gridRow
      }
    };
  });
  console.log(`HORSE_LAYOUT_DIAGNOSTIC ${JSON.stringify(layout)}`);
  expect(layout.topInsideTarget, `ABC category center is covered: ${JSON.stringify(layout)}`).toBe(true);
  await abcCategory.click();

  async function recordAbc(key) {
    const button = page.locator(`[data-assessment-item="${key}"]`);
    await expect(button).toBeVisible();
    await button.click();
    const select = page.locator('#horseAssessmentInlineQuestion select');
    await expect(select).toBeVisible();
    await select.selectOption({ index: 1 });
    const record = page.locator('#horseAssessmentInlineQuestion .horse-question-save');
    await expect(record).toBeEnabled();
    await record.click();
    await expect.poll(() => page.evaluate(findingKey => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.[findingKey]), key)).toBe(true);
  }

  await recordAbc('airway');
  await recordAbc('breathing');
  await recordAbc('perfusion');

  await expect.poll(() => page.evaluate(() => {
    const findings = window.EMSCodeSimPatientRecord.active()?.findings || {};
    return ['airway', 'breathing', 'perfusion'].every(key => Boolean(findings[key]));
  })).toBe(true);

  await page.locator('#horseAssessmentBack').click();
  await page.locator('[data-assessment-category="abdomen_pelvis"]').click();
  await page.locator('[data-assessment-item="pelvis_hip"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.pelvis_hip))).toBe(true);

  await page.locator('#horseAssessmentBack').click();
  await page.locator('[data-assessment-category="extremities"]').click();
  await page.locator('[data-assessment-item="left_leg"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.left_leg))).toBe(true);
  await page.locator('[data-assessment-item="distal_csm"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.distal_csm))).toBe(true);

  await page.locator('.bottom-nav button[data-panel="treatmentPanel"]').click();
  await expect(page.locator('#treatmentPanel')).toBeVisible();
  await page.locator('[data-horse-treatment-group="splinting"]').click();
  await page.locator('[data-horse-workspace-plan="manual_leg_support"]').click();
  await page.locator('#horseTreatmentWorkspaceDetail .horse-treatment-perform').click();
  await expect.poll(() => page.evaluate(() => {
    const treatments = window.EMSCodeSimPatientRecord.active()?.treatments || [];
    return treatments.some(item => item.actionId === 'manual_leg_support');
  })).toBe(true);

  const closeSheet = page.locator('#closeSheet');
  if (await closeSheet.isVisible()) await closeSheet.click();
  await page.locator('#scenarioMenuButton').click();
  await expect(page.locator('#scenarioControlDialog')).toBeVisible();
  await page.locator('#handoffFromProgress').click();

  const transportForm = page.locator('form.horse-transport-selection-form');
  await expect(transportForm).toBeVisible();
  await transportForm.locator('select[name="impression"]').selectOption({ index: 1 });
  await transportForm.locator('select[name="priority"]').selectOption({ label: 'Prompt trauma transport' });
  await transportForm.locator('select[name="destination"]').selectOption({ index: 1 });
  await transportForm.locator('select[name="notification"]').selectOption({ label: 'No specialty activation' });
  await transportForm.locator('textarea[name="rationale"]').fill('Significant horse-compression mechanism with severe hip pain and inability to safely bear weight.');
  await transportForm.locator('.horse-treatment-perform').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.documentation?.transportDecisionAt))).toBe(true);

  await page.locator('#scenarioMenuButton').click();
  await expect(page.locator('#scenarioControlDialog')).toBeVisible();
  await page.locator('#handoffFromProgress').click();
  await expect(page.locator('#hospitalHandoffWorkspace')).toBeVisible();

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
