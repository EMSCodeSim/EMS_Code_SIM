'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('homepage header and hero stay readable and keep one primary action', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const assertNoPageErrors = watchPageErrors(page);
  const sizes = testInfo.project.name === 'mobile-chromium'
    ? [{ width: 375, height: 812, name: '375' }]
    : [
        { width: 1200, height: 800, name: '1200' },
        { width: 768, height: 1024, name: '768' }
      ];

  await page.goto('/');
  await expect(page.locator('.site-header .brand')).toContainText('EMSCodeSim');
  await expect(page.locator('.header-cta')).toBeVisible();
  await expect(page.locator('.header-cta')).toHaveAttribute('href', /visual-patient\.html/);

  for (const size of sizes) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await expect(page.locator('.site-header')).toBeVisible();
    const headerBg = await page.locator('.site-header').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(headerBg).toMatch(/rgb\(255,\s*255,\s*255\)/);
    const brandColor = await page.locator('.site-header .brand').evaluate(el => getComputedStyle(el).color);
    const brandRgb = brandColor.match(/\d+/g).map(Number);
    expect(brandRgb[0] + brandRgb[1] + brandRgb[2]).toBeLessThan(120);

    await expect(page.locator('.header-cta')).toBeVisible();
    await expect(page.locator('#heroPrimary')).toBeVisible();
    await expect(page.locator('#heroSecondary')).toBeVisible();
    await expect(page.locator('#heroPractice')).toBeHidden();

    const heroCopyColor = await page.locator('#heroCopy').evaluate(el => getComputedStyle(el).color);
    const copyRgb = heroCopyColor.match(/\d+/g).map(Number);
    expect(copyRgb[0] + copyRgb[1] + copyRgb[2]).toBeGreaterThan(400);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, `horizontal scroll at ${size.name}px`).toBe(false);
  }

  if (testInfo.project.name === 'desktop-chromium') {
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.main-nav')).toBeVisible();
    await expect(page.locator('.mobile-menu-wrap')).toBeHidden();
    await page.locator('.stage-button[data-stage="pre"]').click();
    await expect(page.locator('.stage-button[data-stage="pre"]')).toHaveClass(/active/);
    await expect(page.locator('#heroPrimary')).toBeVisible();
    await expect(page.locator('#heroSecondary')).toBeVisible();
    await expect(page.locator('#heroPractice')).toBeHidden();
  } else {
    await expect(page.locator('.mobile-menu-wrap')).toBeVisible();
    await expect(page.locator('.mobile-career-picker')).toBeVisible();
    await expect(page.locator('#mobileStageSelect')).toBeVisible();
  }

  await assertNoPageErrors();
});
