'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('picture-first launcher opens a patient and starts Learning Mode', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/scenario-launcher.html');

  const asthmaCard = page.locator('[data-case="asthma"]');
  await expect(asthmaCard).toBeVisible();
  await asthmaCard.click();

  await expect(page.locator('#caseDialog')).toBeVisible();
  await expect(page.locator('#caseDialogTitle')).toHaveText('Respiratory Distress');
  await expect(page.locator('#modeSelectionPanel')).toBeVisible();
  await expect.poll(() => page.locator('#caseDialogImage').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);

  await page.locator('[data-start-mode="learning"]').click();
  await expect(page).toHaveURL(/visual-patient\.html\?case=asthma&training=learning/);
  await expect(page.locator('#patientImage')).toBeVisible();
  await expect(page.locator('#clinicalReasoningBoard')).toBeVisible();
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

  // The desktop guided start intentionally keeps Record unavailable until the
  // required opening assessment sequence is complete. This regression only
  // protects the patient image from being hidden by desktop workspace CSS.
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

  const timeCard = page.locator('[data-reasoning-card="time"], .reasoning-card.assessment-hidden').first();
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