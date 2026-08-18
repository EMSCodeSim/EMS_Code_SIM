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
    const label = choice.querySelector('strong') || choice;
    const labelBox = label.getBoundingClientRect();
    const hitX = Math.round(labelBox.left + labelBox.width / 2);
    const hitY = Math.round(labelBox.top + labelBox.height / 2);
    const top = document.elementFromPoint(hitX, hitY);
    const footerTop = Math.min(moreBox.top, endpointBox.top);
    const overlap = (a, b) => {
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return width * height;
    };
    const visibleChoices = [...tools.querySelectorAll('.horse-treatment-group-choice:not([hidden])')];
    const allHits = visibleChoices.every(node => {
      const box = node.getBoundingClientRect();
      const x = Math.round(box.left + box.width / 2);
      const y = Math.round(box.top + box.height / 2);
      return Boolean(document.elementFromPoint(x, y)?.closest?.(`[data-horse-treatment-group="${node.dataset.horseTreatmentGroup}"]`));
    });
    return {
      ok: moreBox.height <= 40
        && endpointBox.height <= 40
        && moreIndex > choiceIndex
        && endpointIndex > choiceIndex
        && choiceBox.bottom <= footerTop + 2
        && Math.abs(moreBox.top - endpointBox.top) <= 8
        && overlap(moreBox, choiceBox) === 0
        && overlap(endpointBox, choiceBox) === 0
        && allHits
        && Boolean(top?.closest?.('[data-horse-treatment-group="splinting"]')),
      top: top?.id || top?.className || top?.tagName || null
    };
  })).toMatchObject({ ok: true });

  const labelBox = await splinting.locator('strong').boundingBox();
  expect(labelBox).toBeTruthy();
  await page.mouse.click(labelBox.x + labelBox.width / 2, labelBox.y + labelBox.height / 2);
  await expect(page.locator('#horseTreatmentBackToGroups')).toBeVisible();
  await expect(page.locator('#treatmentTools')).toContainText('Select a treatment below');
  await expect(page.locator('#treatmentTools')).toContainText('Splinting / stabilization');

  await page.locator('#treatmentTools [data-horse-workspace-plan]').first().click();
  await expect(page.locator('#treatmentTools .horse-treatment-perform, #treatmentTools button:has-text("Perform")').first()).toBeVisible();

  await page.locator('#horseTreatmentBackToGroups').click();
  await expect(page.locator('#horseOpenTransport')).toBeVisible();
  await expect(page.locator('#horseOpenHandoff')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const transport = document.getElementById('horseOpenTransport');
    const handoff = document.getElementById('horseOpenHandoff');
    if (!transport || !handoff) return { ok:false, reason:'missing' };
    const hit = el => {
      const box = el.getBoundingClientRect();
      const top = document.elementFromPoint(Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2));
      return Boolean(top?.closest?.(`#${el.id}`));
    };
    return { ok: hit(transport) && hit(handoff) };
  })).toMatchObject({ ok: true });

  const transportBox = await page.locator('#horseOpenTransport').boundingBox();
  expect(transportBox).toBeTruthy();
  await page.mouse.click(transportBox.x + transportBox.width / 2, transportBox.y + transportBox.height / 2);
  await expect(page.locator('#treatmentTools .horse-transport-selection-form, #treatmentTools select[name="impression"]').first()).toBeVisible();

  await page.locator('#horseTreatmentBackToGroups').click();
  await expect(page.locator('#horseOpenHandoff')).toBeVisible();
  const handoffBox = await page.locator('#horseOpenHandoff').boundingBox();
  expect(handoffBox).toBeTruthy();
  await page.mouse.click(handoffBox.x + handoffBox.width / 2, handoffBox.y + handoffBox.height / 2);
  await expect(page.locator('#hospitalHandoffWorkspace')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/hospital-handoff-open/);
  await page.locator('#closeHospitalHandoff').click();
  await expect(page.locator('#hospitalHandoffWorkspace')).toBeHidden();

  await assertNoPageErrors();
});
