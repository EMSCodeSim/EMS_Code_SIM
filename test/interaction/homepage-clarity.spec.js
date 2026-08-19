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
    const heroCols = await page.locator('.hero-home-inner').evaluate(el => getComputedStyle(el).gridTemplateColumns);
    expect(heroCols.trim()).not.toBe('1fr');
    expect(heroCols.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(2);
    const pathCols = await page.locator('#pathCards').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(/\s+/).filter(Boolean).length);
    expect(pathCols).toBeGreaterThanOrEqual(3);
    await page.locator('.stage-button[data-stage="pre"]').click();
    await expect(page.locator('.stage-button[data-stage="pre"]')).toHaveClass(/active/);
    await expect(page.locator('#heroPrimary')).toBeVisible();
    await expect(page.locator('#heroSecondary')).toBeVisible();
    await expect(page.locator('#heroPractice')).toBeHidden();
  } else {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.mobile-menu-wrap')).toBeVisible();
    await expect(page.locator('.header-cta')).toBeVisible();
    await expect(page.locator('.mobile-career-picker')).toBeVisible();
    await expect(page.locator('#mobileStageSelect')).toBeVisible();
    const headerCta = await page.locator('.header-cta').boundingBox();
    const mobileMenu = await page.locator('.mobile-menu').boundingBox();
    expect(headerCta?.height || 0).toBeGreaterThanOrEqual(44);
    expect(mobileMenu?.height || 0).toBeGreaterThanOrEqual(44);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, 'horizontal scroll at 390px').toBe(false);
    const pathCols = await page.locator('#pathCards').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(/\s+/).filter(Boolean).length);
    expect(pathCols, 'path cards should stack in one column on phones').toBe(1);
    const firstTitle = page.locator('#pathCards .path-card h3').first();
    await expect(firstTitle).toBeVisible();
    const titleBox = await firstTitle.boundingBox();
    expect(titleBox?.width || 0).toBeGreaterThan(160);
    await expect(firstTitle).toHaveText(/Explore the Career|Find the Right Program|Review the Lesson|Protect Health and Identity/);
  }

  await assertNoPageErrors();
});
