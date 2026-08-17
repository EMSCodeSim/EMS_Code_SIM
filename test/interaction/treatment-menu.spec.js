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
  const splinting = page.locator('.horse-treatment-group-choice[data-horse-treatment-group="splinting"]');
  await expect(splinting).toBeVisible();
  await expect(page.locator('.horse-treatment-group-choice[data-horse-treatment-group="airway"]')).toBeHidden();

  await expect.poll(() => page.evaluate(() => {
    const more = document.getElementById('horseMoreTreatmentsToggle');
    const endpoint = document.getElementById('horseTransportHandoffActions');
    const choice = document.querySelector('.horse-treatment-group-choice[data-horse-treatment-group="splinting"]');
    const tools = document.getElementById('treatmentTools');
    if (!more || !choice || !tools || !endpoint) return { ok:false, reason:'missing' };
    const kids = [...tools.children];
    const moreIndex = kids.indexOf(more);
    const choiceIndex = kids.findIndex(node => node.matches?.('.horse-treatment-group-choice:not([hidden])'));
    const endpointIndex = kids.indexOf(endpoint);
    const moreBox = more.getBoundingClientRect();
    const choiceBox = choice.getBoundingClientRect();
    const endpointBox = endpoint.getBoundingClientRect();
    const hitX = Math.round(choiceBox.left + choiceBox.width / 2);
    const hitY = Math.round(choiceBox.top + choiceBox.height / 2);
    const top = document.elementFromPoint(hitX, hitY);
    const footerTop = Math.min(moreBox.top, endpointBox.top);
    return {
      ok: moreBox.height <= 40
        && endpointBox.height <= 40
        && moreIndex > choiceIndex
        && endpointIndex > choiceIndex
        && choiceBox.bottom <= footerTop + 2
        && Math.abs(moreBox.top - endpointBox.top) <= 8
        && Boolean(top?.closest?.('[data-horse-treatment-group="splinting"]')),
      top: top?.id || top?.className || top?.tagName || null
    };
  })).toMatchObject({ ok: true });

  await splinting.click();
  await expect(page.locator('#horseTreatmentBackToGroups')).toBeVisible();
  await expect(page.locator('#treatmentTools')).toContainText('Select a treatment below');
  await expect(page.locator('#treatmentTools')).toContainText('Splinting / stabilization');

  await page.locator('#treatmentTools [data-horse-workspace-plan]').first().click();
  await expect(page.locator('#treatmentTools .horse-treatment-perform, #treatmentTools button:has-text("Perform")').first()).toBeVisible();

  await assertNoPageErrors();
});
