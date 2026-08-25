'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('EMSCodeSim points visitors to FireOpsSim in relevant places', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);

  await page.goto('/');
  const homeLinks = page.locator('a[href="https://fireopssim.com/"]');
  await expect(homeLinks).toHaveCount(2);
  await expect(page.getByRole('heading', { name: /Looking at fire academy or fire-based EMS/i })).toBeVisible();

  await page.goto('/about.html');
  await expect(page.getByRole('heading', { name: 'Connected fire-service training' })).toBeVisible();
  await expect(page.locator('a[href="https://fireopssim.com/"]')).toHaveCount(4);

  await page.goto('/ems-career-growth.html');
  await expect(page.locator('a[href="https://fireopssim.com/firefighter-career.html"]')).toBeVisible();

  await page.goto('/ems-resources.html');
  await expect(page.getByRole('heading', { name: 'FireOpsSim for fire-service careers' })).toBeVisible();
  await expect(page.locator('a[href="https://fireopssim.com/"]')).toHaveCount(3);

  await assertNoPageErrors();
});
