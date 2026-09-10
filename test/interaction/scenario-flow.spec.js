'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('scenario launcher shows horse and breathing problem and opens asthma in Assessment Mode', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.route('**/api/scenario-question-labels', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ questions: [] })
  }));
  await page.goto('/vitals/scenario-launcher.html');

  const cards = page.locator('#caseGallery [data-case]');
  await expect(cards).toHaveCount(2);
  await expect(page.locator('[data-case="horse_crush"]')).toBeVisible();

  const asthmaCard = page.locator('[data-case="asthma"]');
  await expect(asthmaCard).toBeVisible();
  await expect(asthmaCard).toContainText('Breathing Problem');
  await asthmaCard.click();

  await expect(page.locator('#caseDialog')).toBeVisible();
  await expect(page.locator('#caseDialogTitle')).toHaveText('Breathing Problem');
  await expect(page.locator('#caseDialogMeta')).toContainText('Public park');
  await page.locator('[data-start-mode="assessment"]').click();

  await expect(page).toHaveURL(/visual-patient\.html\?case=asthma&training=assessment/);
  await expect(page.locator('#caseTitle')).toContainText(/Respiratory Distress|Breathing Problem/);
  await expect(page.locator('#scene')).toContainText(/park/i);

  const intro = page.locator('#scenarioIntroVideo');
  await expect(intro).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#scenarioVideoEyebrow')).toContainText(/PUBLIC PARK/);
  await page.locator('#scenarioIntroSkip').click();
  await expect(intro).toBeHidden();

  await expect(page.locator('#patientImage')).toBeVisible();
  const visibleSceneStart = page.locator('#assessmentPanel button:visible').filter({ hasText: 'Scene size-up' }).first();
  const visibleAbcStart = page.locator('#assessmentPanel button:visible').filter({ hasText: 'Initial ABC Assessment' }).first();
  await expect(visibleSceneStart).toBeVisible();
  await expect(visibleAbcStart).toBeVisible();
  await expect(page.locator('.bottom-nav button[data-panel="historyPanel"]')).toBeVisible();
  await expect(page.locator('.bottom-nav button[data-panel="treatmentPanel"]')).toBeVisible();

  await page.locator('.bottom-nav button[data-panel="historyPanel"]').click();
  await expect(page.locator('#historyPanel')).toBeVisible();
  await page.locator('#closeSheet').click();

  await page.locator('.bottom-nav button[data-panel="treatmentPanel"]').click();
  await expect(page.locator('#treatmentPanel')).toBeVisible();

  const state = await page.evaluate(() => {
    const record = window.EMSCodeSimPatientRecord.active();
    return {
      scenarioId: record?.scenarioId,
      trainingMode: record?.documentation?.trainingMode,
      title: record?.title,
      dispatch: document.getElementById('dispatch')?.textContent || '',
      scene: document.getElementById('scene')?.textContent || ''
    };
  });
  expect(state.scenarioId).toBe('asthma');
  expect(state.trainingMode).toBe('assessment');
  expect(state.scene).toMatch(/park/i);
  await assertNoPageErrors();
});

test('picture-first launcher opens the public horse scenario in Assessment Mode', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/scenario-launcher.html');

  const horseCard = page.locator('[data-case="horse_crush"]');
  await expect(horseCard).toBeVisible();
  await horseCard.click();

  await expect(page.locator('#caseDialog')).toBeVisible();
  await expect(page.locator('#caseDialogTitle')).toHaveText('Horse-Crush Hip Injury');
  await expect(page.locator('#modeSelectionPanel')).toBeVisible();
  await expect.poll(() => page.locator('#caseDialogImage').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);

  await page.locator('[data-start-mode="assessment"]').click();
  await expect(page).toHaveURL(/visual-patient\.html\?case=horse_crush&training=assessment/);
  await expect(page.locator('#patientImage')).toBeVisible();
  await page.getByRole('button', { name: /Assessment/ }).click();
  await expect(page.getByRole('dialog', { name: 'Assessment' })).toBeVisible();
  await assertNoPageErrors();
});

test('desktop patient image remains rendered during the horse scenario workspace', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only regression');
  const assertNoPageErrors = watchPageErrors(page);
  await openScenario(page, 'horse_crush', 'learning');

  const patientImage = page.locator('#patientImage');
  await expect(patientImage).toBeVisible();
  await expect.poll(() => patientImage.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);

  const rendered = await patientImage.evaluate(image => {
    const style = getComputedStyle(image);
    const rect = image.getBoundingClientRect();
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: Number(style.opacity),
      width: rect.width,
      height: rect.height
    };
  });
  expect(rendered.display).not.toBe('none');
  expect(rendered.visibility).toBe('visible');
  expect(rendered.opacity).toBeGreaterThan(0);
  expect(rendered.width).toBeGreaterThan(100);
  expect(rendered.height).toBeGreaterThan(100);

  await expect(patientImage).toBeVisible();
  await expect.poll(() => patientImage.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await assertNoPageErrors();
});

test('Learning Mode unlocks a clinical decision only after the needed evidence is discovered', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await openScenario(page, 'asthma', 'learning');

  const severityCard = page.locator('[data-reasoning-card="severity"]');
  await expect(severityCard).toHaveClass(/locked/);
  await expect(severityCard).toContainText('Obtain breathing quality, respiratory rate, and SpO₂.');

  await page.evaluate(() => {
    const session = window.EMSCodeSimScenarioSession;
    session.sync('asthma');
    session.saveFinding('breathing', 'Labored with accessory muscle use', { source: 'browser-test' });
    session.saveFinding('respirations', '28/min; labored', { source: 'browser-test' });
    session.saveFinding('spo2', '91% on room air', { source: 'browser-test' });
  });

  await expect(severityCard).toHaveClass(/ready/);
  await expect(severityCard.locator('[data-option="work"]')).toBeVisible();
  await severityCard.locator('[data-option="work"]').click();
  await expect(severityCard).toContainText('Strong reasoning');

  const saved = await page.evaluate(() => {
    const record = window.EMSCodeSimPatientRecord.active();
    return {
      decision: record.documentation?.reasoningDecisions?.severity,
      fakePatientFinding: record.findings?.decision_severity || null
    };
  });
  expect(saved.decision?.selected).toBe('work');
  expect(saved.decision?.correct).toBe(true);
  expect(saved.fakePatientFinding).toBeNull();
  await assertNoPageErrors();
});

test('Assessment Mode hides future reasoning prompts and defers correctness feedback', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await openScenario(page, 'stroke', 'assessment');

  await expect(page.locator('#clinicalReasoningBoard')).toContainText('Clinical decision 1');
  await expect(page.locator('#clinicalReasoningBoard')).not.toContainText('Which time matters most for hospital stroke decisions?');
  await expect(page.locator('#clinicalReasoningBoard')).not.toContainText('Last known well / last known normal time');

  await page.evaluate(() => {
    const session = window.EMSCodeSimScenarioSession;
    session.sync('stroke');
    session.saveFinding('sample', 'Family reports sudden onset; last known well established.', { source: 'browser-test' });
  });

  const unlocked = page.locator('[data-reasoning-card="time"]');
  await expect(unlocked).toHaveClass(/ready/);
  await unlocked.locator('[data-option="lkw"]').click();
  await expect(unlocked).toContainText('Decision recorded');
  await expect(unlocked).not.toContainText('Strong reasoning');
  await expect(unlocked.locator('[data-option="lkw"]')).toBeDisabled();

  const saved = await page.evaluate(() => window.EMSCodeSimPatientRecord.active().documentation?.reasoningDecisions?.time);
  expect(saved?.selected).toBe('lkw');
  expect(saved?.correct).toBe(true);
  await assertNoPageErrors();
});