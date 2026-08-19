'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('phone simulator keeps the patient central and clinical domains one tap away', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 9999) >= 980, 'Phone-specific layout');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'learning');

  const patient = page.locator('#patientImage');
  await expect(patient).toBeVisible();
  await expect.poll(() => patient.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('#persistentClinicalBar')).toBeHidden();

  const dockButtons = page.locator('.bottom-nav button[data-panel]');
  await expect(dockButtons).toHaveCount(5);
  for (const label of ['Assessment', 'Vitals', 'History', 'Treatment', 'Record']) {
    await expect(page.locator('.bottom-nav button', { hasText: label })).toBeVisible();
  }

  await page.locator('.bottom-nav button[data-panel="historyPanel"]').click();
  await expect(page.locator('#actionSheet')).toBeVisible();
  await expect(page.locator('#historyPanel')).toBeVisible();
  await expect(page.locator('#closeSheet')).toBeVisible();
  await expect(page.locator('.bottom-nav')).toBeVisible();

  const sheetBox = await page.locator('#actionSheet').boundingBox();
  const navBox = await page.locator('.bottom-nav').boundingBox();
  expect(sheetBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(sheetBox.y + sheetBox.height).toBeLessThanOrEqual(navBox.y + 4);

  await page.locator('#closeSheet').click();
  await expect(page.locator('#actionSheet')).toBeHidden();
  await expect(patient).toBeVisible();
  await expect.poll(() => patient.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);

  await page.locator('.bottom-nav button[data-panel="vitalsPanel"]').click();
  await expect(page.locator('#vitalsPanel')).toBeVisible();
  await expect(page.locator('#vitalTools')).toBeVisible();
  await expect(page.locator('#vitalTools .compact-vital-row').first()).toBeVisible();

  const stageHeight = await page.locator('.patient-stage').evaluate(el => el.getBoundingClientRect().height);
  expect(stageHeight).toBeLessThanOrEqual(340);
  const commsSize = await page.locator('#infoUpdateWindow').evaluate(el => {
    const text = el.querySelector('p') || el;
    return parseFloat(getComputedStyle(text).fontSize);
  });
  expect(commsSize).toBeGreaterThanOrEqual(14);
  const navButton = await page.locator('.bottom-nav button').first().boundingBox();
  expect(navButton?.height || 0).toBeGreaterThanOrEqual(44);
  const navBottom = await page.locator('.bottom-nav').evaluate(el => el.getBoundingClientRect().bottom);
  const viewHeight = await page.evaluate(() => window.innerHeight);
  expect(navBottom).toBeLessThanOrEqual(viewHeight + 1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);

  await assertNoPageErrors();
});

test('phone horse-crush intro Play and Skip stay tappable without overflow', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 9999) >= 980, 'Phone-specific layout');
  test.setTimeout(60_000);
  const assertNoPageErrors = watchPageErrors(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/vitals/visual-patient.html?case=horse_crush&training=assessment&reset=1');
  await expect(page.locator('#horseIntroSkip')).toBeVisible({ timeout: 8000 });
  const skipBox = await page.locator('#horseIntroSkip').boundingBox();
  expect(skipBox?.height || 0).toBeGreaterThanOrEqual(44);
  const play = page.locator('#horseIntroPlay');
  if (await play.isVisible()) {
    const playBox = await play.boundingBox();
    expect(playBox?.height || 0).toBeGreaterThanOrEqual(44);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
  await assertNoPageErrors();
});

test('phone horse-crush assessment and treatment controls are tappable', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 9999) >= 980, 'Phone-specific layout');
  test.setTimeout(90_000);
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'learning');
  await expect(page.locator('.bottom-nav')).not.toHaveClass(/guide-locked/);
  await page.locator('.bottom-nav button[data-panel="assessmentPanel"]').click();
  await expect(page.locator('#actionSheet')).toBeVisible();
  await expect(page.locator('#assessmentPanel')).toBeVisible();
  const assessmentAction = page.locator('#assessmentPanel button, #assessmentPanel .assessment-row-action, #assessmentPanel .horse-exam-button').first();
  await expect(assessmentAction).toBeVisible();
  const assessmentBox = await assessmentAction.boundingBox();
  expect(assessmentBox?.height || 0).toBeGreaterThanOrEqual(44);
  await page.locator('#closeSheet').click();
  await page.locator('.bottom-nav button[data-panel="treatmentPanel"]').click();
  await expect(page.locator('#treatmentPanel')).toBeVisible();
  await assertNoPageErrors();
});

test('phone asthma scenario keeps the patient and bottom nav on screen', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 9999) >= 980, 'Phone-specific layout');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'asthma', 'learning');
  await expect(page.locator('#patientImage')).toBeVisible();
  await expect(page.locator('.bottom-nav button[data-panel="assessmentPanel"]')).toBeVisible();
  await expect(page.locator('.bottom-nav button[data-panel="treatmentPanel"]')).toBeVisible();
  const stageHeight = await page.locator('.patient-stage').evaluate(el => el.getBoundingClientRect().height);
  expect(stageHeight).toBeLessThanOrEqual(340);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
  await assertNoPageErrors();
});

test('desktop simulator layout stays two-column at 1200px', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) < 980, 'Desktop-specific layout');
  test.setTimeout(90_000);
  const assertNoPageErrors = watchPageErrors(page);

  await page.setViewportSize({ width: 1200, height: 800 });
  await openScenario(page, 'horse_crush', 'learning');
  await expect.poll(() => page.evaluate(() => document.body.classList.contains('desktop-scenario-layout'))).toBe(true);
  const cols = await page.locator('.scenario-hero-layout').evaluate(el => getComputedStyle(el).gridTemplateColumns);
  expect(cols.trim()).not.toBe('1fr');
  expect(cols.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(2);
  const stageHeight = await page.locator('.patient-stage').evaluate(el => el.getBoundingClientRect().height);
  expect(stageHeight).toBeGreaterThan(500);
  await assertNoPageErrors();
});
