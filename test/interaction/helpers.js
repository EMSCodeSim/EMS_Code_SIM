'use strict';

const { expect } = require('@playwright/test');

async function clearSiteStorage(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(new Error(message.text()));
  });
  return async () => {
    expect(errors.map(error => error.message || String(error))).toEqual([]);
  };
}

async function openScenario(page, caseId = 'asthma') {
  await page.goto(`/vitals/scenario-launcher.html?case=${encodeURIComponent(caseId)}&resume=1`);
  await expect(page.locator('#scenarioPatientImage')).toBeVisible();
}

module.exports = { clearSiteStorage, watchPageErrors, openScenario };
