'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, gotoVisualPatient } = require('./helpers');

async function expectAssessmentAvailable(page) {
  if ((page.viewportSize()?.width || 1280) < 980) {
    await expect(page.locator('#patientFirstMobileNav')).toBeVisible();
  } else {
    await expect(page.locator('#assessmentPanel button:visible').first()).toBeVisible();
  }
}

test('asthma arrival, worsening, treatment response, replay, and restart use local video assets', async ({ page }) => {
  test.setTimeout(90000);
  await clearSiteStorage(page);
  await gotoVisualPatient(page, '/vitals/visual-patient.html?case=asthma&training=learning&reset=1');

  const video = page.locator('#scenarioIntroVideoElement');
  const shell = page.locator('#scenarioIntroVideo');
  await expect(video).toHaveCount(1, { timeout: 10000 });
  await expect(video).toHaveAttribute('playsinline', '');
  await expect(video).toHaveAttribute('preload', 'metadata');
  await expect(video).toHaveAttribute('poster', '/vitals/assets/breathing-problem-cover.webp');

  await page.evaluate(() => window.EMSCodeSimScenarioIntroVideo.replay());
  await expect(shell).toBeVisible();
  await expect(video.locator('source')).toHaveAttribute('src', '/vitals/assets/asthma-arrival.mp4');
  await expect(shell).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#patientImage')).toBeVisible();
  await expectAssessmentAvailable(page);

  await page.evaluate(() => window.EMSCodeSimPatientRecord.update(record => {
    record.startedAt = new Date(Date.now() - 181000).toISOString();
    record.treatments = [];
  }));
  await expect(shell).toBeVisible();
  await expect(page.locator('#scenarioVideoEyebrow')).toHaveText(/PATIENT UPDATE · RESPIRATORY DISTRESS/);
  await expect(video.locator('source')).toHaveAttribute('src', '/vitals/assets/asthma-worsening.mp4');
  await expect(shell).toBeHidden({ timeout: 12000 });
  await page.evaluate(() => {
    window.EMSCodeSimScenarioIntroVideo.evaluate();
    window.EMSCodeSimScenarioIntroVideo.evaluate();
  });
  await expect(shell).toBeHidden();

  await page.evaluate(() => window.EMSCodeSimPatientRecord.addTreatment({
    name: 'albuterol', actionId: 'albuterol', classification: 'appropriate-effective'
  }));
  const preResetStartedAt = await page.evaluate(() => window.EMSCodeSimPatientRecord.active()?.startedAt);
  const preResetTreatments = await page.evaluate(() => window.EMSCodeSimPatientRecord.active()?.treatments?.length || 0);
  expect(preResetTreatments).toBeGreaterThan(0);
  await expect(shell).toBeVisible();
  await expect(page.locator('#scenarioVideoEyebrow')).toHaveText(/AFTER BRONCHODILATOR/);
  await expect(video.locator('source')).toHaveAttribute('src', '/vitals/assets/asthma-improved.mp4');
  await expect(shell).toBeHidden({ timeout: 12000 });
  await expect(page.locator('#patientImage')).toBeVisible();

  await page.evaluate(() => window.EMSCodeSimScenarioIntroVideo.replay());
  await expect(shell).toBeVisible();
  await expect(video.locator('source')).toHaveAttribute('src', '/vitals/assets/asthma-improved.mp4');
  await expect(shell).toBeHidden({ timeout: 12000 });

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#scenarioMenuButton').click();
  // Reset navigates with reset=1, then visual-patient strips that query after applying a clean session.
  // Assert a fresh asthma session rather than racing the transient reset=1 URL or assuming unique record ids.
  await Promise.all([
    page.waitForURL(/visual-patient\.html\?case=asthma/, { timeout: 15000 }),
    page.locator('#resetAndRestartScenario').click()
  ]);
  await expect(page).toHaveURL(/visual-patient\.html\?case=asthma/);
  await expect(video).toHaveCount(1, { timeout: 10000 });
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimPatientRecord.active()?.treatments?.length || 0)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimPatientRecord.active()?.startedAt)).not.toBe(preResetStartedAt);
  await page.evaluate(() => window.EMSCodeSimScenarioIntroVideo.replay());
  await expect(video.locator('source')).toHaveAttribute('src', '/vitals/assets/asthma-arrival.mp4');
  await expect(shell).toBeVisible();
  await expect(shell).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#patientImage')).toBeVisible();
  await expectAssessmentAvailable(page);
});

test('asthma video load failure returns the learner to the patient workspace', async ({ page }) => {
  await clearSiteStorage(page);
  await page.route('**/vitals/assets/asthma-arrival.mp4', route => route.abort());
  await gotoVisualPatient(page, '/vitals/visual-patient.html?case=asthma&training=learning&reset=1');
  const shell = page.locator('#scenarioIntroVideo');
  await expect(page.locator('#scenarioIntroVideoElement')).toHaveCount(1, { timeout: 10000 });
  await page.evaluate(() => window.EMSCodeSimScenarioIntroVideo.replay());
  await expect(shell).toBeHidden({ timeout: 8000 });
  await expect(page.locator('#patientImage')).toBeVisible();
  await expectAssessmentAvailable(page);
});
