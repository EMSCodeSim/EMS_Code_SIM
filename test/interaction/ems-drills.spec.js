const { test, expect } = require('@playwright/test');

test.describe('EMS Drills', () => {
  test('library renders drill cards', async ({ page }) => {
    await page.goto('/ems-drills.html');
    await expect(page.getByRole('heading', { name: 'EMS Drills', exact: true })).toBeVisible();
    await expect(page.locator('.ems-drill-card').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start Drill' }).first()).toBeVisible();
  });

  test('standalone drill runner starts and advances', async ({ page }) => {
    await page.goto('/ems-drill.html?id=ems-hemorrhage-control-001');
    await expect(page.getByRole('heading', { name: 'Hemorrhage Control' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Learn → Perform → Document → Complete')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Objectives' })).toBeVisible();
  });

  test('invalid roadmap token is rejected', async ({ page }) => {
    await page.goto('/ems-drill.html?id=ems-radio-report-001&token=not-a-valid-token');
    await expect(page.getByRole('alert')).toContainText(/invalid|expired|malformed|signature/i, { timeout: 15000 });
  });
});
