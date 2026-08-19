'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('become-an-emt EMS levels stay readable on phones without changing desktop', async ({ page }, testInfo) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/become-an-emt.html');
  await expect(page.getByRole('heading', { name: 'Start by understanding the EMS levels' })).toBeVisible();

  if (testInfo.project.name === 'mobile-chromium') {
    await page.setViewportSize({ width: 390, height: 844 });
    const emtCell = page.locator('.comparison td', { hasText: /^EMT$/ });
    await expect(emtCell).toBeVisible();
    const box = await emtCell.boundingBox();
    expect(box?.width || 0).toBeGreaterThan(80);
    await expect(emtCell).toHaveCSS('white-space', /normal|nowrap/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, 'horizontal scroll at 390px').toBe(false);
  } else {
    await page.setViewportSize({ width: 1200, height: 800 });
    const tableDisplay = await page.locator('.comparison').evaluate(el => getComputedStyle(el).display);
    expect(tableDisplay).toBe('table');
    await expect(page.locator('.comparison thead th', { hasText: 'Level' })).toBeVisible();
    await expect(page.locator('.comparison thead th', { hasText: 'General focus' })).toBeVisible();
  }

  await assertNoPageErrors();
});
