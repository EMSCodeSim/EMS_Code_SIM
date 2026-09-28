'use strict';
const { test, expect } = require('@playwright/test');

test('standalone V2 runs asthma state changes without legacy simulator code', async ({ page }) => {
  await page.goto('/patient-simulator-v2/');
  await expect(page.locator('.badge')).toHaveText('Patient Simulator V2');
  await expect(page.locator('#patientVideo')).toHaveAttribute('src', '/vitals/assets/asthma-arrival.mp4');
  await expect(page.locator('#hrValue')).toHaveText('--');

  await page.locator('[data-monitor="heartRate"]').click();
  await expect(page.locator('#hrValue')).not.toHaveText('--');

  await page.evaluate(() => window.EMSCodeSimV2Session.tick(100));
  await expect(page.locator('#patientVideo')).toHaveAttribute('src', '/vitals/assets/asthma-worsening.mp4');
  await expect(page.locator('#conditionChip')).toHaveText(/Worsening/i);

  await page.locator('[data-tab="treat"]').click();
  await page.getByRole('button', { name: /Albuterol 2.5 mg nebulized/i }).click();
  await page.evaluate(() => window.EMSCodeSimV2Session.tick(30));
  await expect(page.locator('#patientVideo')).toHaveAttribute('src', '/vitals/assets/asthma-improved.mp4');
  await expect(page.locator('#conditionChip')).toHaveText(/Improved/i);

  await page.locator('[data-tab="assess"]').click();
  await page.getByRole('button', { name: 'Airway', exact: true }).click();
  await expect(page.locator('#finding')).toContainText('Patent');

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restartBtn').click();
  await expect(page.locator('#patientVideo')).toHaveAttribute('src', '/vitals/assets/asthma-arrival.mp4');
  await expect(page.locator('#hrValue')).toHaveText('--');
  const state = await page.evaluate(() => window.EMSCodeSimV2Session.getState());
  expect(state.elapsedSec).toBe(0);
  expect(state.treatments).toHaveLength(0);
  expect(Object.keys(state.discovered)).toHaveLength(0);
});

test('standalone V2 is usable at phone width', async ({ page }) => {
  await page.goto('/patient-simulator-v2/');
  await expect(page.locator('#patientVideo')).toBeVisible();
  await expect(page.locator('.workspace')).toBeVisible();
  await page.locator('[data-tab="talk"]').click();
  await page.locator('#talkInput').fill('When did this start?');
  await page.locator('#talkForm button').click();
  await expect(page.locator('#conversation')).toContainText('twenty minutes ago');
});
