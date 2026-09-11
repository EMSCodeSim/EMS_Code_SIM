'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('state EMT hub and Texas guide funnel to prep, sims, and planner', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);

  await page.goto('/become-an-emt/states/');
  await expect(page.getByRole('heading', { name: /How to become an EMT — state by state/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /How to become an EMT in Texas/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Free EMT Prep/i }).first()).toBeVisible();

  await page.goto('/become-an-emt/states/texas.html');
  await expect(page.getByRole('heading', { name: /How to become an EMT in Texas/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /NREMT vs\. Texas licensing/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Typical costs/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Reciprocity/i })).toBeVisible();

  await expect(page.getByRole('link', { name: /Start Free EMT Prep/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Find approved programs/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /EMS Career Planner/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Open EMT Program Cost planner/i })).toBeVisible();

  const dshs = page.getByRole('link', { name: /Texas Department of State Health Services/i }).first();
  await expect(dshs).toBeVisible();

  await page.goto('/become-an-emt.html');
  await expect(page.getByRole('heading', { name: /State-by-state EMT guides/i })).toBeVisible();
  await page.getByRole('link', { name: /Open State EMT Guides/i }).click();
  await expect(page).toHaveURL(/\/become-an-emt\/states\/?$/);

  await assertNoPageErrors();
});

test('state guides stay usable on mobile viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'mobile-only layout check');
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/become-an-emt/states/texas.html');
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(overflow, 'horizontal scroll at 390px').toBe(false);
  await expect(page.getByRole('heading', { name: /Requirements to become an EMT in Texas/i })).toBeVisible();
  await assertNoPageErrors();
});
