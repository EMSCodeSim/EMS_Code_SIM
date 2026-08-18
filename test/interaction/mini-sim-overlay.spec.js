'use strict';

const { test, expect } = require('@playwright/test');
const { clearSiteStorage, watchPageErrors, openScenario } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await clearSiteStorage(page);
});

async function openMiniSim(page, href, title) {
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimMiniSimOverlay))).toBe(true);
  const opened = await page.evaluate(({ href, title }) => window.EMSCodeSimMiniSimOverlay.openOverlay(href, title), { href, title });
  expect(opened).toBe(true);
  await expect(page.locator('#embeddedSimWorkspace')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('embeddedSimWorkspace')?.parentElement?.classList.contains('patient-stage') === true)).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const workspace = document.getElementById('embeddedSimWorkspace');
    const image = document.getElementById('patientImage');
    if (!workspace || !image) return 0;
    const sim = workspace.getBoundingClientRect();
    const photo = image.getBoundingClientRect();
    const width = Math.max(0, Math.min(sim.right, photo.right) - Math.max(sim.left, photo.left));
    const height = Math.max(0, Math.min(sim.bottom, photo.bottom) - Math.max(sim.top, photo.top));
    return (width * height) / Math.max(1, sim.width * sim.height);
  })).toBeGreaterThan(0.75);
}

async function expectPatientReturned(page) {
  await expect(page.locator('#embeddedSimWorkspace')).toBeHidden();
  const image = page.locator('#patientImage');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0 && node.naturalHeight > 0)).toBe(true);
}

test('device and visual assessment mini sims discover, document, save, and close over the patient', async ({ page }) => {
  const assertNoPageErrors = watchPageErrors(page);
  await openScenario(page, 'horse_crush', 'learning');

  // Device family: obtain a real pulse-ox display, then manually enter what was read.
  await openMiniSim(page, '/vitals/pulse-ox-scenario.html', 'SpO₂');
  const device = page.frameLocator('#embeddedSimFrame');
  await expect(device.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(device.locator('#answerCard')).toHaveClass(/ems-discovery-locked/);
  await expect(device.locator('#answerCard')).toBeHidden();

  await device.locator('#placeProbe').click();
  await expect(device.locator('#submitBtn')).toBeEnabled({ timeout: 8000 });
  await expect(device.locator('#answerCard')).toBeVisible();
  await expect(device.locator('.ems-mini-flow span[data-step="3"]')).toHaveClass(/active/);

  const displayedSpo2 = (await device.locator('#monitorValue').textContent())?.trim();
  expect(Number(displayedSpo2)).toBeGreaterThanOrEqual(50);
  await device.locator('#spo2Input').fill(displayedSpo2);
  await device.locator('#submitBtn').click();
  await expectPatientReturned(page);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.spo2))).toBe(true);

  // Visual-assessment family: no answer is saved merely by performing the exam.
  await openMiniSim(page, '/vitals/visual-airway-assessment.html', 'Airway assessment');
  const airway = page.frameLocator('#embeddedSimFrame');
  await expect(airway.locator('body')).toHaveClass(/ems-embedded-mini-sim/);
  await expect(airway.locator('.va-interpret')).toHaveCount(0);

  const actions = airway.locator('[data-a]');
  await expect(actions).toHaveCount(4);
  for (let index = 0; index < 3; index += 1) {
    await actions.nth(index).click();
    await expect(airway.locator('.va-interpret')).toHaveCount(0);
  }
  await actions.nth(3).click();
  await expect(airway.locator('.va-interpret')).toBeVisible();
  await expect(airway.locator('.ems-mini-flow span[data-step="3"]')).toHaveClass(/active/);

  const choices = airway.locator('.va-interpret-option');
  await expect(choices.first()).toBeVisible();
  await choices.first().click();
  await airway.locator('.va-interpret-save').click();
  await expectPatientReturned(page);
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimPatientRecord.active()?.findings?.airway))).toBe(true);

  await assertNoPageErrors();
});

const STAGE_VISUALS = {
  '/vitals/pulse-scenario.html': '#heart, .sv-heart',
  '/vitals/respiratory-rate-scenario.html': '.sv-resp-patient',
  '/vitals/pulse-ox-scenario.html': '.sv-monitor, #monitorValue',
  '/vitals/bgl-scenario.html': '.sv-device',
  '/vitals/temperature-scenario.html': '.sv-device',
  '/vitals/breath-sounds-scenario.html': '.sv-ausc-stage, .sv-point',
  '/vitals/pupil-scenario.html': '.sv-eyes, .sv-pupil-assessment',
  '/vitals/skin-scenario.html': '.sv-skin-compare, #patientSwatch'
};

const MINI_SIMS = [
  { href: '/vitals/bp-scenario.html', title: 'Blood pressure', document: '#sysInput, #diaInput, #submitBtn', perform: '#pumpBtn' },
  { href: '/vitals/pulse-scenario.html', title: 'Pulse', document: '#pulseInput, #submitBtn', perform: '#startMeasure' },
  { href: '/vitals/respiratory-rate-scenario.html', title: 'Respiratory rate', document: '#rrInput, #submitBtn', perform: '#startMeasure' },
  { href: '/vitals/pulse-ox-scenario.html', title: 'SpO₂', document: '#spo2Input, #submitBtn', perform: '#placeProbe' },
  { href: '/vitals/breath-sounds-scenario.html', title: 'Breath sounds', document: '#soundInput, #submitBtn', perform: '.sv-point' },
  { href: '/vitals/bgl-scenario.html', title: 'Blood glucose', document: '#bglInput, #submitBtn', perform: '.sv-step' },
  { href: '/vitals/temperature-scenario.html', title: 'Temperature', document: '#tempInput, #submitBtn', perform: '#measureTemp' },
  { href: '/vitals/pupil-scenario.html', title: 'Pupils / PERL', document: '#equalInput, #submitBtn', perform: '#lightLeft' },
  { href: '/vitals/skin-scenario.html', title: 'Skin signs', document: '#colorInput, #submitBtn', perform: '#inspectSkin' },
  { href: '/vitals/avpu-scenario.html', title: 'Mental status / AVPU', document: '#avpuChoices, #submitBtn', perform: '#observeBtn' },
  { href: '/vitals/gcs.html', title: 'Glasgow Coma Scale', document: '#selE, #selV, #selM, #showResults', perform: '#btnEyes' },
  { href: '/vitals/visual-airway-assessment.html', title: 'Airway assessment', document: '[data-a]', perform: '[data-a]' },
  { href: '/vitals/respiratory-assessment-visual.html', title: 'Breathing assessment', document: '.va-btn, .lung-field', perform: '.va-btn' },
  { href: '/vitals/distal-csm-assessment.html', title: 'Circulation and perfusion', document: '[data-step]', perform: '[data-step]' },
  { href: '/vitals/visual-neuro-stroke-assessment.html', title: 'Motor, sensory, and stroke findings', document: '[data-n]', perform: '[data-n]' },
  { href: '/vitals/abdomen-pelvis-visual.html', title: 'Abdominal assessment', document: '[data-step], [data-q]', perform: '[data-step]' },
  { href: '/vitals/visual-trauma-body-exam.html', title: 'Rapid trauma assessment', document: '[data-r], #finish', perform: '[data-r]' },
  { href: '/vitals/pain-opqrst.html', title: 'Pain / OPQRST', document: '#practicePanel input, #practicePanel select, #practicePanel textarea, #practicePanel button', perform: '#practicePanel' },
  { href: '/vitals/sample-history.html', title: 'SAMPLE history', document: '#practicePanel input, #practicePanel select, #practicePanel textarea, #practicePanel button', perform: '#practicePanel' },
  { href: '/vitals/pediatric-assessment-triangle.html', title: 'Pediatric Assessment Triangle', document: '#practicePanel input, #practicePanel select, #practicePanel textarea, #practicePanel button', perform: '#practicePanel' },
  { href: '/vitals/nines.html', title: 'Rule of Nines', document: '#answerVal, #submitBtn', perform: '#submitBtn' }
];

test('every mini sim fits the patient window, boosts audio, and keeps a finding entry path', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Catalog fit is verified on the desktop overlay');
  test.setTimeout(180_000);
  const assertNoPageErrors = watchPageErrors(page);
  await openScenario(page, 'horse_crush', 'learning');
  await expect.poll(() => page.evaluate(() => Boolean(window.EMSCodeSimMiniSimOverlay))).toBe(true);

  for (const sim of MINI_SIMS) {
    const opened = await page.evaluate(({ href, title }) => window.EMSCodeSimMiniSimOverlay.openOverlay(href, title), sim);
    expect(opened, sim.href).toBe(true);
    await expect(page.locator('#embeddedSimWorkspace'), sim.href).toBeVisible();
    const frame = page.frameLocator('#embeddedSimFrame');
    await expect(frame.locator('body'), sim.href).toHaveClass(/ems-embedded-mini-sim/, { timeout: 15_000 });
    await expect.poll(() => page.evaluate(() => {
      const doc = document.getElementById('embeddedSimFrame')?.contentDocument;
      return Boolean(doc?.querySelector('link[data-ems-mini-sim-compact]') && doc.querySelector('script[data-ems-mini-sim-audio-boost]'));
    }), sim.href).toBe(true);
    await expect(frame.locator(sim.perform).locator('visible=true').first(), `${sim.href} perform control`).toBeVisible({ timeout: 15_000 });
    await expect(frame.locator(sim.document).first(), `${sim.href} finding entry`).toBeAttached({ timeout: 15_000 });

    const visualSel = STAGE_VISUALS[sim.href];
    if (visualSel) {
      await expect(frame.locator(visualSel).first(), `${sim.href} stage visual`).toBeVisible({ timeout: 15_000 });
      await expect.poll(() => page.evaluate(sel => {
        const doc = document.getElementById('embeddedSimFrame')?.contentDocument;
        const visual = doc?.querySelector(sel);
        const stage = doc?.querySelector('.sv-stage');
        if (!visual || !stage) return { ok:false, reason:'missing' };
        const visualBox = visual.getBoundingClientRect();
        const stageBox = stage.getBoundingClientRect();
        return {
          ok: visualBox.height >= 40 && stageBox.height >= 80,
          visualHeight: visualBox.height,
          stageHeight: stageBox.height
        };
      }, visualSel.split(',')[0].trim()), sim.href).toMatchObject({ ok: true });
    }

    await expect.poll(() => page.evaluate(() => {
      const workspace = document.getElementById('embeddedSimWorkspace');
      const stage = document.querySelector('.patient-stage');
      const iframe = document.getElementById('embeddedSimFrame');
      if (!workspace || !stage || !iframe) return { ok:false, reason:'missing' };
      const ws = workspace.getBoundingClientRect();
      const st = stage.getBoundingClientRect();
      const doc = iframe.contentDocument;
      const width = doc?.documentElement?.clientWidth || 0;
      const scrollWidth = Math.max(doc?.documentElement?.scrollWidth || 0, doc?.body?.scrollWidth || 0);
      return {
        ok: true,
        contained: ws.left >= st.left - 2 && ws.top >= st.top - 2 && ws.right <= st.right + 2 && ws.bottom <= st.bottom + 2,
        overflowX: scrollWidth - width,
        audioBoost: Boolean(doc?.querySelector('script[data-ems-mini-sim-audio-boost]')),
        compactCss: Boolean(doc?.querySelector('link[data-ems-mini-sim-compact]'))
      };
    }), { timeout: 15_000 }).toEqual(expect.objectContaining({
      ok: true,
      contained: true,
      audioBoost: true,
      compactCss: true
    }));
    await expect.poll(() => page.evaluate(() => {
      const doc = document.getElementById('embeddedSimFrame')?.contentDocument;
      const width = doc?.documentElement?.clientWidth || 0;
      const scrollWidth = Math.max(doc?.documentElement?.scrollWidth || 0, doc?.body?.scrollWidth || 0);
      return scrollWidth - width;
    }), { timeout: 15_000 }).toBeLessThanOrEqual(24);

    await page.locator('#closeEmbeddedSim').click();
    await expect(page.locator('#embeddedSimWorkspace'), sim.href).toBeHidden();
  }

  await assertNoPageErrors();
});
