'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

const RADIO_DISPATCH = 'Medic 181 Engine 182 respond emergent to 5541 E Snow Bird Road in reports of a 64 year old female smashed by a horse.';

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('horse-crush plays the walk video, then dispatch, ambulance position, and handoff before user choice', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Intro sequence is verified on the desktop patient stage');
  test.setTimeout(90_000);
  const assertNoPageErrors = watchPageErrors(page);

  await page.goto('/vitals/visual-patient.html?case=horse_crush&training=assessment&reset=1');

  await expect(page.locator('#horseIntroOverlay')).toBeVisible();
  await expect(page.locator('#horseIntroVideo')).toBeVisible();
  await expect(page.locator('#horseIntroSkip')).toBeVisible();
  await expect.poll(() => page.locator('#horseIntroVideo').evaluate(video => video.tagName)).toBe('VIDEO');
  await expect.poll(() => page.locator('#horseIntroVideo').evaluate(video => {
    const src = video.currentSrc || video.getAttribute('src') || '';
    return src.includes('grok-video-c075593f');
  })).toBe(true);
  await expect.poll(() => page.locator('#horseIntroVideo').evaluate(video => video.readyState)).toBeGreaterThan(0);
  await expect.poll(() => page.locator('#horseIntroVideo').evaluate(video => video.paused)).toBe(false);
  await expect.poll(() => page.locator('#horseIntroVideo').evaluate(video => video.currentTime)).toBeGreaterThan(0.2);
  await expect.poll(() => page.evaluate(() => document.body.dataset.horseIntro)).toBe('video');
  await expect(page.locator('#infoUpdateType')).toHaveText('');
  await expect(page.locator('#infoUpdateText')).not.toContainText('Medic 181');
  await expect(page.locator('#infoUpdateText')).not.toContainText('Snow Bird');
  await expect(page.locator('#dispatch')).toHaveText('');
  await expect(page.locator('#dispatch')).not.toContainText('Medic 181');
  await expect(page.locator('#infoUpdateType')).not.toHaveText('PATIENT');

  await page.locator('#horseIntroVideo').evaluate(video => new Promise(resolve => {
    if (video.ended) { resolve(); return; }
    video.addEventListener('ended', () => resolve(), { once:true });
  }));

  await expect.poll(() => page.evaluate(() => document.body.dataset.horseIntro)).toBe('dispatch');
  await expect(page.locator('#infoUpdateType')).toHaveText('DISPATCH', { timeout: 10000 });
  await expect(page.locator('#infoUpdateText')).toContainText(RADIO_DISPATCH);
  await expect(page.locator('#dispatch')).toContainText('Medic 181 Engine 182 respond emergent to 5541 E Snow Bird Road');
  await expect(page.locator('#horseIntroOverlay')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('#infoUpdateType')).not.toHaveText('PATIENT');
  await expect(page.locator('#infoUpdateType')).not.toHaveText('BLS ENGINE HANDOFF');

  const dispatchStarted = Date.now();
  await expect(page.locator('#infoUpdateType')).toHaveText('AMBULANCE POSITION', { timeout: 20000 });
  expect(Date.now() - dispatchStarted).toBeGreaterThanOrEqual(10000);
  await expect.poll(() => page.evaluate(() => document.body.dataset.horseIntro)).toBe('parking');
  await expect.poll(() => page.evaluate(() => {
    const image = document.getElementById('patientImage');
    if (!image) return '';
    try { return new URL(image.src, location.href).pathname; } catch { return ''; }
  })).toBe('/vitals/assets/horse-crush/map-arrival.webp');
  await expect(page.locator('#infoUpdateText')).toContainText('south barn apron');
  await expect(page.locator('#infoUpdateType')).not.toHaveText('PATIENT');
  await expect(page.locator('[data-horse-parking]')).toHaveCount(0);

  const parkingStarted = Date.now();
  await expect(page.locator('#infoUpdateType')).toHaveText('BLS ENGINE HANDOFF', { timeout: 15000 });
  expect(Date.now() - parkingStarted).toBeGreaterThanOrEqual(6000);
  await expect.poll(() => page.evaluate(() => document.body.dataset.horseIntro)).toBe('arrived');
  await expect.poll(() => page.evaluate(() => {
    const image = document.getElementById('patientImage');
    if (!image) return '';
    try { return new URL(image.src, location.href).pathname; } catch { return ''; }
  })).toBe('/vitals/assets/horse-crush/handoff.webp');
  await expect(page.locator('#infoUpdateText')).toContainText('She was smashed between two horses');
  await expect(page.locator('#infoUpdateType')).not.toHaveText('PATIENT');
  await expect(page.locator('#horseBlsFollowups')).toBeVisible();
  await expect(page.locator('#horseBlsFollowupButtons button')).toHaveCount(5);
  await page.locator('#horseBlsFollowupButtons button').first().click();
  await expect(page.locator('#horseBlsFollowupAnswer')).toContainText('awake the whole time');
  await expect(page.locator('#infoUpdateType')).not.toHaveText('PATIENT');

  await page.evaluate(() => window.EMSCodeSimHorseCrush.performExam('neck_back'));
  await expect(page.locator('#horseBlsFollowups')).toBeHidden();
  await expect.poll(() => page.evaluate(() => new URL(document.getElementById('patientImage').src, location.href).pathname)).toBe('/vitals/assets/horse-crush/exam-neck-back.webp');
  await page.evaluate(() => window.EMSCodeSimHorseCrush.performExam('chest_assessment'));
  await expect.poll(() => page.evaluate(() => new URL(document.getElementById('patientImage').src, location.href).pathname)).toBe('/vitals/assets/horse-crush/exam-chest.webp');
  await page.evaluate(() => window.EMSCodeSimHorseCrush.performExam('left_leg'));
  await expect.poll(() => page.evaluate(() => new URL(document.getElementById('patientImage').src, location.href).pathname)).toBe('/vitals/assets/horse-crush/exam-leg.webp');
  await expect(page.locator('#horseBlsFollowups')).toBeHidden();

  expect(await page.evaluate(() => window.EMSCodeSimHorseCrush.movementImage('', 'blankets_position'))).toContain('movement-blankets.webp');
  expect(await page.evaluate(() => window.EMSCodeSimHorseCrush.movementImage('scoop', ''))).toContain('movement-scoop.webp');

  await assertNoPageErrors();
});
