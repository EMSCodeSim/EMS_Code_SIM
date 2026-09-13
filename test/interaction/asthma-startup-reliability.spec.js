'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('asthma startup advances timer and exposes a playable patient video', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/visual-patient.html?case=asthma&training=learning&reset=1');

  await expect(page.locator('#scenarioIntroVideoElement')).toHaveCount(1, { timeout: 10000 });
  await expect(page.locator('#timer')).toBeVisible();
  await expect.poll(async () => page.locator('#timer').innerText(), { timeout: 5000 }).not.toBe('00:00');

  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimAsthmaStartupGuard)), { timeout: 7000 }).toBe(true);

  const state = await page.locator('#scenarioIntroVideoElement').evaluate(video => ({
    paused: video.paused,
    ended: video.ended,
    currentTime: video.currentTime,
    readyState: video.readyState
  }));
  const fallbackVisible = await page.locator('#asthmaStartupPlay').isVisible().catch(() => false);
  expect((!state.paused && !state.ended) || state.currentTime > 0.05 || fallbackVisible).toBeTruthy();

  await expect(page.locator('#scenarioIntroSkip')).toBeVisible();
  await assertNoPageErrors();
});
