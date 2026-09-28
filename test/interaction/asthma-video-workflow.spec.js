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

  const firstPatientId = await page.evaluate(() => window.EMSCodeSimPatientRecord.active()?.id);
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
  await page.locator('#resetAndRestartScenario').click();
  await expect(page).toHaveURL(/visual-patient\.html\?case=asthma.*reset=1/);
  await expect(video).toHaveCount(1, { timeout: 10000 });
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimPatientRecord.active()?.id)).not.toBe(firstPatientId);
  await expect.poll(() => page.evaluate(() => window.EMSCodeSimPatientRecord.active()?.treatments?.length)).toBe(0);
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
