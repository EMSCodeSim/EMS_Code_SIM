'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-01T10:00:00-06:00') });
  await page.addInitScript(() => {
    window.__emsAudioEvents = [];
    class FakeAudioContext {
      constructor() {
        this.state = 'running';
        this.sampleRate = 44_100;
        this.currentTime = 0;
        this.destination = {};
      }
      createBuffer(_channels, length) {
        return { getChannelData: () => new Float32Array(length) };
      }
      createBufferSource() {
        return {
          buffer: null,
          connect() { return this; },
          start() { window.__emsAudioEvents.push('beat'); }
        };
      }
      resume() { this.state = 'running'; return Promise.resolve(); }
      close() { this.state = 'closed'; return Promise.resolve(); }
    }
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
  });
  await clearSiteStorage(page);
});

test('blood-pressure controls, deflation timer, audio cue, and save workflow operate end to end', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await openScenario(page, 'asthma');
  await page.goto('/vitals/bp-scenario.html?mode=scenario&resume=1&case=asthma');

  await expect(page.locator('#simCard')).toBeVisible();
  await expect(page.locator('#pressureDisplay')).toHaveText('0');

  for (let index = 0; index < 16; index += 1) await page.locator('#pumpBtn').click();
  await expect(page.locator('#pressureDisplay')).toHaveText('160');
  await page.locator('#releaseBtn').click();
  await expect(page.locator('#releaseBtn')).toHaveText('Pause');

  await page.clock.runFor(35_000);
  await expect(page.locator('#measurementState')).toContainText('Measurement complete');
  await expect(page.locator('#submitBtn')).toBeEnabled();
  expect(await page.evaluate(() => window.__emsAudioEvents.length)).toBeGreaterThan(0);

  await page.locator('#sysInput').fill('120');
  await page.locator('#diaInput').fill('70');
  await page.locator('#submitBtn').click();
  await expect(page.locator('#result')).toContainText('Blood pressure 120/70 saved');
  await expect(page.locator('#returnBtn')).toBeVisible();

  const finding = await page.evaluate(() => {
    const id = localStorage.getItem('emscodesim_active_patient_record');
    const record = JSON.parse(localStorage.getItem(`emscodesim_patient_record_${id}`));
    return record.findings.blood_pressure;
  });
  expect(finding.value).toBe('120/70');
  expect(finding.expectedFinding).toBe('138/84');
  expect(finding.accurate).toBe(false);
  expect(finding.source).toBe('scenario-bp-simulator');
  expect(finding.locked).toBe(true);
  await assertNoPageErrors();
});
