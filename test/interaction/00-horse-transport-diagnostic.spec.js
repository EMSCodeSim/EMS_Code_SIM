'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('horse transport progress control opens a visible transport workspace', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop horse workspace diagnostic');
  await openScenario(page, 'horse_crush', 'learning');
  await page.locator('[data-horse-parking="south_barn_access"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.arrival_parking))).toBe(true);

  await page.locator('#scenarioMenuButton').click();
  await expect(page.locator('#scenarioControlDialog')).toBeVisible();
  await page.locator('#handoffFromProgress').click();
  await page.waitForTimeout(150);

  const diagnostic = await page.evaluate(() => {
    const form = document.querySelector('form.horse-transport-selection-form');
    const chain = [];
    let node = form;
    while (node && chain.length < 10) {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      chain.push({
        tag: node.tagName,
        id: node.id || '',
        className: typeof node.className === 'string' ? node.className : '',
        hidden: Boolean(node.hidden),
        display: style.display,
        visibility: style.visibility,
        width: rect.width,
        height: rect.height
      });
      node = node.parentElement;
    }
    const byId = id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return { hidden:Boolean(el.hidden), display:style.display, visibility:style.visibility, width:rect.width, height:rect.height };
    };
    return {
      formExists:Boolean(form),
      chain,
      actionSheet:byId('actionSheet'),
      treatmentPanel:byId('treatmentPanel'),
      treatmentTools:byId('treatmentTools'),
      horseQuestion:byId('horseClinicalQuestionBox'),
      scenarioDialog:byId('scenarioControlDialog'),
      activeNav:[...document.querySelectorAll('.bottom-nav button.active')].map(button => button.dataset.panel || button.textContent.trim())
    };
  });

  console.log(`HORSE_TRANSPORT_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
  expect(diagnostic.formExists).toBe(true);
  expect(diagnostic.chain.every(item => !item.hidden && item.display !== 'none' && item.visibility !== 'hidden'), JSON.stringify(diagnostic)).toBe(true);
});
