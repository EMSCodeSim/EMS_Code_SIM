'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('desktop center interaction column owns patient communication while right workspace handles clinical domains', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop three-column clinical workspace');
  test.setTimeout(70_000);
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'learning');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimDomainWorkspace))).toBe(true);
  await expect(page.locator('body')).toHaveClass(/clinical-domain-workspace-v2/);
  await expect(page.locator('body')).toHaveClass(/clinical-interaction-workspace-v4/);

  // The retired parking gate must not return; the clinical workspace opens directly.
  await expect(page.locator('[data-horse-parking]')).toHaveCount(0);
  await expect(page.locator('#horseArrivalDecision')).toHaveCount(0);

  const rail = page.locator('.bottom-nav.clinical-domain-rail');
  const interaction = page.locator('#clinicalInteractionColumn');
  const rightField = page.locator('.patient-control-column');
  await expect(interaction).toBeVisible();
  await expect(rail).toBeVisible();

  // Current desktop architecture:
  // - Dispatch, scene crew, and observed findings share the large center communication surface.
  // - Patient speech plus History/Treatment interaction lives inside
  //   patientCommunicationStage in the center middle.
  // - Primary/ABC findings and follow-up questions remain in the right clinical workspace.
  // - The four clinical controls remain in one horizontal row fixed at the bottom.
  // - The patient photo remains clear of both information surfaces.
  await expect.poll(() => page.evaluate(() => {
    const column = document.getElementById('clinicalInteractionColumn');
    const railNode = document.querySelector('.bottom-nav.clinical-domain-rail');
    const update = document.getElementById('infoUpdateWindow');
    const stage = document.getElementById('patientCommunicationStage');
    const question = document.getElementById('horseClinicalQuestionBox');
    const layout = document.querySelector('.scenario-hero-layout');
    const controls = document.querySelector('.patient-control-column');
    const patient = document.querySelector('.patient-stage');
    return Boolean(
      column && railNode && update && stage && question && layout && controls && patient &&
      column.parentElement === layout && column.nextElementSibling === controls &&
      railNode.parentElement === column && stage.parentElement === column &&
      question.parentElement === controls &&
      !column.contains(question) && !patient.contains(update) && !patient.contains(stage)
    );
  })).toBe(true);
  await expect(page.locator('#infoUpdateWindow')).toBeHidden();
  await expect(page.locator('#patientCommunicationStage')).toBeVisible();
  await expect(page.locator('#horseClinicalQuestionBox')).toBeHidden();
  await expect(page.locator('.clinical-interaction-column .patient-entry-workflow')).toBeHidden();
  await expect.poll(() => page.evaluate(() => {
    const info = getComputedStyle(document.getElementById('infoUpdateWindow'));
    const patient = getComputedStyle(document.getElementById('patientCommunicationStage'));
    return info.display === 'none'
      && patient.borderLeftWidth === '0px'
      && patient.backgroundColor === 'rgba(0, 0, 0, 0)';
  })).toBe(true);

  // A real patient turn must render clickable response buttons in the center,
  // accept a response after the DOM has been reparented/polished, and show Linda's reply.
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientConversation?.showPatientTurn))).toBe(true);
  await page.evaluate(() => {
    window.EMSCodeSimPatientConversation.showPatientTurn({
      text:'Can you tell me what you are doing before you move me?',
      choices:[
        ['Yes. I will explain the plan and support your leg before we move.', 'Thank you. That makes me feel a lot better about moving.'],
        ['Just relax. We need to get this done.', 'No. I need you to explain what you are doing first.']
      ]
    });
  });
  const patientChoice = page.locator('#patientConversationTurn button[data-patient-choice="0"]');
  await expect(patientChoice).toBeVisible();
  await patientChoice.click();
  await expect(page.locator('#patientConversationTurn .patient-provider-reply')).toContainText('You:');
  await expect(page.locator('#patientConversationTurn .patient-line')).toContainText('Thank you');

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
  await expect(page.locator('#assessmentPanel')).toBeHidden();
  await expect(page.locator('.horse-assessment-drill-choice:visible')).toHaveCount(0);
  const vitalRows = page.locator('#vitalTools .compact-vital-row');
  await expect(vitalRows).toHaveCount(7);
  for (const label of ['Blood pressure', 'Pulse', 'Respiratory rate', 'SpO₂', 'Blood glucose', 'Temperature', 'Breath sounds']) {
    await expect(page.locator('#vitalTools .compact-vital-row', { hasText: label })).toBeVisible();
  }

  // Clicking the vital row itself opens its mini sim over the patient image.
  const spo2Row = page.locator('#vitalTools .compact-vital-row', { hasText: 'SpO₂' });
  await spo2Row.locator('.vital-row-copy').click();
  await expect(page.locator('#embeddedSimWorkspace')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('embeddedSimWorkspace')?.parentElement?.classList.contains('patient-stage') === true)).toBe(true);

  const device = page.frameLocator('#embeddedSimFrame');
  await expect(device.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(device.locator('.sv-monitor')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const doc = document.getElementById('embeddedSimFrame')?.contentDocument;
    const visual = doc?.querySelector('.sv-monitor');
    if (!visual) return { ok:false, reason:'missing' };
    const box = visual.getBoundingClientRect();
    const viewH = doc.documentElement?.clientHeight || 0;
    return {
      ok: box.width >= 120 && box.height >= 80 && box.top < viewH - 8 && box.bottom > 8,
      width: box.width,
      height: box.height,
      top: box.top,
      viewH
    };
  })).toMatchObject({ ok: true });
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
  await expect(page.locator('#assessmentPanel')).toBeHidden();
  await expect(page.locator('.horse-assessment-drill-choice:visible')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const panel = document.getElementById('assessmentPanel');
    const tools = document.getElementById('assessmentTools');
    const sheet = document.getElementById('actionSheet');
    const park = document.getElementById('emsAssessmentPanelParking');
    return Boolean(
      document.body.getAttribute('data-active-domain') === 'historyPanel'
      && document.body.classList.contains('domain-assessment-suppressed')
      && panel?.hidden
      && getComputedStyle(panel).display === 'none'
      && panel?.parentElement === park
      && !sheet?.contains(panel)
      && (!tools || getComputedStyle(tools).display === 'none' || tools.getBoundingClientRect().height === 0)
      && !(document.querySelector('.patient-control-column')?.innerText || '').includes('Choose an assessment category')
    );
  })).toBe(true);

  // Every SAMPLE answer is patient communication: it must be visible in the center,
  // not trapped only inside the right-side History workspace.
  await page.locator('[data-history-group="sample"]').click();
  await expect(page.locator('.horse-history-drill-question')).toHaveCount(6);
  let previousPatientLine = '';
  for (let index = 0; index < 6; index += 1) {
    await page.locator('.horse-history-drill-question').nth(index).click();
    await expect(page.locator('#routedPatientCommunication')).toBeVisible();
    await expect.poll(() => page.evaluate(previous => {
      const center = String(document.getElementById('routedPatientCommunication')?.textContent || '')
        .replace(/[“”]/g, '').replace(/\\s+/g, ' ').trim();
      return center.length > 12 && center !== previous ? center : '';
    }, previousPatientLine)).not.toBe('');
    previousPatientLine = String(await page.locator('#routedPatientCommunication').textContent()).trim();
  }

  // Treatment reuses the same right field.
  await rail.locator('button[data-panel="treatmentPanel"]').click();
  await expect(page.locator('#treatmentPanel')).toBeVisible();
  await expect(page.locator('#treatmentTools')).toBeVisible();
  await expect(page.locator('#assessmentPanel')).toBeHidden();
  await expect(page.locator('.horse-assessment-drill-choice:visible')).toHaveCount(0);

  // Desktop uses the available width: patient -> larger interaction column -> right workspace.
  const rightBox = await rightField.boundingBox();
  const interactionBox = await interaction.boundingBox();
  const patientBox = await page.locator('.patient-stage').boundingBox();
  const timelineBox = await page.locator('#communicationTimeline').boundingBox();
  const stageBox = await page.locator('#patientCommunicationStage').boundingBox();
  expect(rightBox).not.toBeNull();
  expect(interactionBox).not.toBeNull();
  expect(patientBox).not.toBeNull();
  expect(timelineBox).not.toBeNull();
  expect(stageBox).not.toBeNull();
  expect(interactionBox.width).toBeGreaterThanOrEqual(330);
  expect(patientBox.x + patientBox.width).toBeLessThanOrEqual(interactionBox.x + 2);
  expect(interactionBox.x + interactionBox.width).toBeLessThanOrEqual(rightBox.x + 2);
  expect(timelineBox.height).toBeGreaterThanOrEqual(160);

  const controlBoxes = await rail.locator('button[data-panel]:visible').evaluateAll(buttons => buttons.map(button => {
    const box = button.getBoundingClientRect();
    return { x:box.x, y:box.y, width:box.width, height:box.height };
  }));
  expect(controlBoxes).toHaveLength(4);
  expect(Math.max(...controlBoxes.map(box => box.y)) - Math.min(...controlBoxes.map(box => box.y))).toBeLessThanOrEqual(2);
  expect(controlBoxes.every(box => box.width >= 70 && box.height >= 50)).toBe(true);
  const railBox = await rail.boundingBox();
  expect(railBox).not.toBeNull();
  expect(railBox.y).toBeGreaterThanOrEqual(stageBox.y + stageBox.height - 24);
  expect(railBox.y - (stageBox.y + stageBox.height)).toBeLessThanOrEqual(16);

  await assertNoPageErrors();
});
