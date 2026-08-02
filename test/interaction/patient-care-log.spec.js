'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

test('findings tab keeps a chronological log and filters vitals and treatments', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await page.goto('/vitals/visual-patient.html?case=asthma&mode=scenario&resume=1');

  await page.evaluate(() => {
    const session = window.EMSCodeSimScenarioSession;
    session.sync('asthma');
    session.saveFinding('scene_size_up', 'Scene size-up completed', { recordedAt: '2026-08-01T18:00:00-06:00', source: 'test' });
    session.saveFinding('sample_history', 'SAMPLE history obtained', { recordedAt: '2026-08-01T18:01:00-06:00', details: 'S: dyspnea. A: NKDA. M: albuterol. P: asthma. L: lunch. E: worsened today.', source: 'test' });
    session.saveFinding('pain_opqrst', 'OPQRST obtained', { recordedAt: '2026-08-01T18:02:00-06:00', details: 'O: gradual. P: exertion. Q: tightness. R: chest. S: 6/10. T: one hour.', source: 'test' });
    session.saveFinding('pulse', '104/min; regular; strong', { recordedAt: '2026-08-01T18:03:00-06:00', source: 'test' });
    session.saveFinding('pulse', '96/min; regular; strong', { recordedAt: '2026-08-01T18:04:00-06:00', source: 'test-reassessment' });
    session.addTreatment({ name: 'Oxygen by nasal cannula', description: 'Oxygen by nasal cannula at 2 L/min', time: '2026-08-01T18:05:00-06:00', source: 'test' });
    session.addReassessment({ response: 'Breathing improved', nextAction: 'Continue monitoring', time: '2026-08-01T18:06:00-06:00', source: 'test' });
  });

  await page.locator('[data-panel="findingsPanel"]').click();
  await expect(page.locator('#findingList .care-log-item')).toHaveCount(7);
  await expect(page.locator('#findingList')).toContainText('SAMPLE history');
  await expect(page.locator('#findingList')).toContainText('Pain / OPQRST');
  await expect(page.locator('#findingList')).toContainText('Oxygen by nasal cannula at 2 L/min');
  await expect(page.locator('#findingList')).toContainText('Breathing improved');
  await expect(page.locator('#findingCount')).toHaveText('7');
  await expect(page.locator('#treatmentCount')).toHaveText('2');

  await page.locator('[data-log-filter="vitals"]').click();
  await expect(page.locator('#findingList .care-log-item')).toHaveCount(2);
  await expect(page.locator('#findingList')).toContainText('104/min; regular; strong');
  await expect(page.locator('#findingList')).toContainText('96/min; regular; strong');

  await page.locator('[data-log-filter="treatments"]').click();
  await expect(page.locator('#findingList .care-log-item')).toHaveCount(2);
  await expect(page.locator('#findingList')).toContainText('Treatment');
  await expect(page.locator('#findingList')).toContainText('Reassessment');
  await assertNoPageErrors();
});
