'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('generic homepage scenario entry opens the scenario selector instead of forcing horse crush', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/');
  const start = page.locator('a.header-cta').filter({ hasText: /Start a scenario/i });
  await expect(start).toBeVisible();
  await expect(start).toHaveAttribute('href', '/vitals/scenario-launcher.html');
  await start.click();
  await expect(page).toHaveURL(/\/vitals\/scenario-launcher\.html$/);
  await expect(page.locator('[data-case="horse_crush"]')).toBeVisible();
  await expect(page.locator('[data-case="asthma"]')).toBeVisible();
  await assertNoPageErrors();
});

test('vitals learning center generic scenario entry opens the scenario selector', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/');
  const start = page.getByRole('link', { name: /Start a full EMT scenario/i }).first();
  await expect(start).toBeVisible();
  await expect(start).toHaveAttribute('href', '/vitals/scenario-launcher.html');
  await start.click();
  await expect(page).toHaveURL(/\/vitals\/scenario-launcher\.html$/);
  await expect(page.getByRole('heading', { name: /Choose a patient scenario/i })).toBeVisible();
  await assertNoPageErrors();
});

test('user can choose breathing problem from selector and reach asthma patient workspace', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/scenario-launcher.html');
  const asthma = page.locator('[data-case="asthma"]');
  await expect(asthma).toBeVisible();
  await asthma.click();
  await expect(page.locator('#caseDialogTitle')).toHaveText('Breathing Problem');
  await page.locator('[data-start-mode="learning"]').click();
  await expect(page).toHaveURL(/case=asthma&training=learning/);
  await expect(page.locator('#scenarioIntroVideo')).toBeVisible({ timeout: 10000 });
  await page.locator('#scenarioIntroSkip').click();
  await expect(page.locator('#patientImage')).toBeVisible();
  await expect(page.locator('#scene')).toContainText(/park/i);
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await assertNoPageErrors();
});
