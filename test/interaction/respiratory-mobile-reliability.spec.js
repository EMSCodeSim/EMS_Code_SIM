'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('respiratory phone workspace stays stable through video, drawer, and patient-experience actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Phone reliability regression');
  const assertNoPageErrors = watchPageErrors(page);

  await page.goto('/vitals/visual-patient.html?case=asthma&training=learning&reset=1');
  await expect(page.locator('#scenarioIntroVideo')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#patientFirstMobileNav')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#patientFirstMobileNav')).toHaveCount(1);
  await expect(page.locator('#patientFirstMobileFeed')).toBeVisible();
  await expect(page.locator('#patientExperienceActions')).toHaveCount(1);

  await page.locator('#scenarioIntroSkip').click();
  await expect.poll(() => page.locator('body').evaluate(body => body.classList.contains('mobile-patient-video-playing'))).toBe(false);
  await expect(page.locator('#patientFirstMobileFeed')).toBeVisible();

  const ask = page.locator('#patientFirstMobileNav [data-mobile-domain="historyPanel"]');
  await ask.click();
  await expect(page.locator('#actionSheet')).toBeVisible();
  await expect(page.locator('#historyPanel')).toBeVisible();
  await expect(ask).toHaveClass(/active/);
  await expect.poll(() => page.locator('body').evaluate(body => body.classList.contains('patient-sheet-open'))).toBe(true);

  await page.locator('#closeSheet').click();
  await expect(page.locator('#actionSheet')).toBeHidden();
  await expect(ask).not.toHaveClass(/active/);
  await expect.poll(() => page.locator('body').evaluate(body => body.classList.contains('patient-sheet-open'))).toBe(false);

  const explain = page.locator('#patientExperienceActions button', { hasText: 'Explain next step' }).first();
  await expect(explain).toBeVisible();
  await explain.click();
  await expect(page.locator('#patientExperienceActions button', { hasText: 'Done — continue care' }).first()).toBeDisabled();

  await expect(page.locator('#patientFirstMobileNav')).toHaveCount(1);
  await expect(page.locator('#patientFirstMobileFeed')).toHaveCount(1);
  await expect(page.locator('#patientExperienceReview')).toHaveCount(1);
  await assertNoPageErrors();
});
