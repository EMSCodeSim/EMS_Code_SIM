'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('horse-crush opens with incident video, then dispatch, then the patient photo', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Intro sequence is verified on the desktop patient stage');
  const assertNoPageErrors = watchPageErrors(page);

  await page.goto('/vitals/visual-patient.html?case=horse_crush&training=assessment&reset=1');
  await expect(page.locator('#horseIntroOverlay')).toBeVisible();
  await expect(page.locator('#horseIntroVideo')).toBeVisible();
  await expect(page.locator('#horseIntroSkip')).toBeVisible();
  await expect.poll(() => page.locator('#horseIntroVideo').evaluate(video => video.readyState)).toBeGreaterThan(0);

  await page.locator('#horseIntroSkip').click();
  await expect(page.locator('#infoUpdateType')).toHaveText('DISPATCH');
  await expect(page.locator('#infoUpdateText')).toContainText('Reported fall at a horse facility; a BLS engine crew is already on scene.');

  await expect(page.locator('#horseIntroOverlay')).toHaveCount(0, { timeout: 8000 });
  await expect.poll(() => page.evaluate(() => {
    const image = document.getElementById('patientImage');
    if (!image) return '';
    try { return new URL(image.src, location.href).pathname; } catch { return ''; }
  })).toBe('/vitals/assets/horse-crush/patient-initial.webp');
  await expect(page.locator('#infoUpdateType')).toHaveText('BLS ENGINE HANDOFF');
  await expect(page.locator('#infoUpdateText')).toContainText('She was smashed between two horses');

  await page.evaluate(() => window.EMSCodeSimHorseCrush.performExam('neck_back'));
  await expect.poll(() => page.evaluate(() => new URL(document.getElementById('patientImage').src, location.href).pathname)).toBe('/vitals/assets/horse-crush/exam-neck-back.webp');
  await page.evaluate(() => window.EMSCodeSimHorseCrush.performExam('chest_assessment'));
  await expect.poll(() => page.evaluate(() => new URL(document.getElementById('patientImage').src, location.href).pathname)).toBe('/vitals/assets/horse-crush/exam-chest.webp');
  await page.evaluate(() => window.EMSCodeSimHorseCrush.performExam('left_leg'));
  await expect.poll(() => page.evaluate(() => new URL(document.getElementById('patientImage').src, location.href).pathname)).toBe('/vitals/assets/horse-crush/exam-leg.webp');

  expect(await page.evaluate(() => window.EMSCodeSimHorseCrush.movementImage('', 'blankets_position'))).toContain('movement-blankets.webp');
  expect(await page.evaluate(() => window.EMSCodeSimHorseCrush.movementImage('scoop', ''))).toContain('movement-scoop.webp');

  await assertNoPageErrors();
});
