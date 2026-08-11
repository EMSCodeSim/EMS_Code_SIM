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
  expect(sheetBox.y + sheetBox.height).toBeLessThanOrEqual(navBox.y + 2);

  await page.locator('#closeSheet').click();
  await expect(page.locator('#actionSheet')).toBeHidden();
  await expect(patient).toBeVisible();
  await expect.poll(() => patient.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);

  await page.locator('.bottom-nav button[data-panel="vitalsPanel"]').click();
  await expect(page.locator('#vitalsPanel')).toBeVisible();
  await expect(page.locator('#vitalTools')).toBeVisible();
  await expect(page.locator('#vitalTools .compact-vital-row').first()).toBeVisible();

  await assertNoPageErrors();
});
