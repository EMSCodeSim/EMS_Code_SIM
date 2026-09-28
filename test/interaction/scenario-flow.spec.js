'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('scenario launcher shows horse and breathing problem and opens asthma in Assessment Mode', async ({ page }, testInfo) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.route('**/api/scenario-question-labels', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ questions: [] })
  }));
  await page.goto('/vitals/scenario-launcher.html');

  const cards = page.locator('#caseGallery [data-case]');
  await expect(cards.first()).toBeVisible();
  await expect.poll(() => cards.count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator('[data-case="horse_crush"]')).toBeVisible();

  const asthmaCard = page.locator('[data-case="asthma"]');
  await expect(asthmaCard).toBeVisible();
  await expect(asthmaCard).toContainText(/Breathing Problem|Respiratory|Asthma/i);
  await asthmaCard.click();

  await expect(page.locator('#caseDialog')).toBeVisible();
  await expect(page.locator('#caseDialogTitle')).toHaveText(/Breathing Problem|Respiratory Distress/i);
  await expect(page.locator('#caseDialogMeta')).toContainText(/year-old|inhaler|apartment|park/i);
  await page.locator('[data-start-mode="assessment"]').click();

  // Breathing Problem launches Patient Simulator V2 (legacy visual-patient remains for rollback).
  await expect(page).toHaveURL(/\/patient-simulator-v2\/?/);
  await expect(page.locator('#psv2StartOverlay')).toBeVisible();
  await expect(page.locator('#psv2StartOverlay')).toContainText(/Adult Asthma|Respiratory Distress/i);
  await page.locator('#psv2StartBtn').click();
  await expect(page.locator('#psv2StartOverlay')).toBeHidden();
  await expect(page.locator('#psv2DispatchText')).toContainText(/Riverside Park|difficulty breathing|wheezing/i);
  await expect(page.locator('#psv2Video')).toBeVisible();
  await expect(page.locator('#psv2ActionBar')).toBeVisible();
  await expect(page.locator('#psv2Workflow')).toContainText(/Patient Contact|Assessment|Treatment/i);

  const mobile = testInfo.project.name === 'mobile-chromium';
  if (mobile) {
    await expect(page.locator('#psv2ActionBar button[data-action="assess"]')).toBeVisible();
    await expect(page.locator('#psv2ActionBar button[data-action="treat"]')).toBeVisible();
  }

  await page.locator('#psv2ActionBar button[data-action="assess"]').click();
  await expect(page.locator('.psv2-tab-panel[data-panel="assess"]')).toBeVisible();
  await expect(page.locator('#psv2AssessGrid button[data-assess="scene_sizeup"], #psv2AssessGrid button[data-assess="airway"]').first()).toBeVisible();

  await page.locator('#psv2ActionBar button[data-action="treat"]').click();
  await expect(page.locator('.psv2-tab-panel[data-panel="treat"]')).toBeVisible();
  await expect(page.locator('#psv2TreatPanel')).toContainText(/Albuterol/i);

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
  // Asthma hides the separate reasoning board; horse-crush nests it in the Record panel.
  // Stroke still exposes Learning Mode checkpoints in the main workspace.
  await openScenario(page, 'stroke', 'learning');

  const decisionCard = page.locator('[data-reasoning-card="time"]');
  await expect(decisionCard).toHaveClass(/locked/);
  await expect(decisionCard).toContainText(/last known well|Discover/i);

  await page.evaluate(() => {
    const session = window.EMSCodeSimScenarioSession;
    session.sync('stroke');
    session.saveFinding('sample', 'Family reports sudden onset; last known well established.', { source: 'browser-test' });
  });

  await expect(decisionCard).toHaveClass(/ready/);
  await expect(decisionCard.locator('[data-option="lkw"]')).toBeVisible();
  await decisionCard.locator('[data-option="lkw"]').click();
  await expect(decisionCard).toContainText('Strong reasoning');

  const saved = await page.evaluate(() => {
    const record = window.EMSCodeSimPatientRecord.active();
    return {
      decision: record.documentation?.reasoningDecisions?.time,
      fakePatientFinding: record.findings?.decision_time || null
    };
  });
  expect(saved.decision?.selected).toBe('lkw');
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
