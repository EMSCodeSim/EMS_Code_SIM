'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('desktop treatment categories stay clickable and More treatments does not stretch over them', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop treatment menu layout');
  const assertNoPageErrors = watchPageErrors(page);

  await openScenario(page, 'horse_crush', 'assessment');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimDomainWorkspace))).toBe(true);

  await page.locator('.bottom-nav button[data-panel="treatmentPanel"]').click();
  await expect(page.locator('#treatmentPanel')).toBeVisible();
  await expect(page.locator('.horse-treatment-group-choice[data-horse-treatment-group="splinting"]')).toBeVisible();

  await expect.poll(() => page.evaluate(() => {
    const more = document.getElementById('horseMoreTreatmentsToggle');
    const endpoint = document.getElementById('horseTransportHandoffActions');
    const choice = document.querySelector('.horse-treatment-group-choice[data-horse-treatment-group="splinting"]');
    const tools = document.getElementById('treatmentTools');
    if (!more || !choice || !tools || !endpoint) return false;
    const kids = [...tools.children];
    const moreIndex = kids.indexOf(more);
    const choiceIndex = kids.findIndex(node => node.matches?.('.horse-treatment-group-choice'));
    const endpointIndex = kids.indexOf(endpoint);
    const moreBox = more.getBoundingClientRect();
    const choiceBox = choice.getBoundingClientRect();
    const endpointBox = endpoint.getBoundingClientRect();
    return moreBox.height <= 56
      && endpointBox.height <= 140
      && moreIndex > choiceIndex
      && endpointIndex > moreIndex
      && choiceBox.bottom <= moreBox.top + 1
      && moreBox.bottom <= endpointBox.top + 2;
  })).toBe(true);

  await page.locator('.horse-treatment-group-choice[data-horse-treatment-group="splinting"]').click();
  await expect(page.locator('#horseTreatmentBackToGroups')).toBeVisible();
  await expect(page.locator('#treatmentTools')).toContainText('Select a treatment below');

  await page.locator('#treatmentTools [data-horse-workspace-plan]').first().click();
  await expect(page.locator('#treatmentTools .horse-treatment-perform, #treatmentTools button:has-text("Perform")').first()).toBeVisible();

  await assertNoPageErrors();
});
