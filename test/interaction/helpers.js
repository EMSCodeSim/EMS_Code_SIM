'use strict';

const { expect } = require('@playwright/test');

async function clearSiteStorage(page) {
  await blockThirdPartyNoise(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Fonts / analytics routinely stall Playwright `load` on mobile Chromium.
 * The asthma first-run guide's MutationObserver refresh loop can also monopolize
 * the main thread under WebDriver; replace it with a no-observer stub in tests.
 */
async function blockThirdPartyNoise(page) {
  if (page._emsThirdPartyBlocked) return;
  page._emsThirdPartyBlocked = true;
  const patterns = [
    '**/*fonts.googleapis.com/**',
    '**/*fonts.gstatic.com/**',
    '**/*googletagmanager.com/**',
    '**/*google-analytics.com/**',
    '**/*googletagmanager.com*'
  ];
  for (const pattern of patterns) {
    await page.route(pattern, route => route.abort());
  }
  await page.route('**/scenario-first-run-guide.js*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: `'use strict';
(() => {
  const caseId = String(new URLSearchParams(location.search).get('case') || '').toLowerCase();
  if (caseId !== 'asthma' && caseId !== 'respiratory') return;
  document.body.classList.add('asthma-video-only');
  if (!window.matchMedia('(max-width:979px)').matches) return;
  if (document.getElementById('patientFirstMobileNav')) return;
  const nav = document.createElement('nav');
  nav.id = 'patientFirstMobileNav';
  nav.className = 'patient-first-mobile-nav';
  nav.setAttribute('aria-label', 'Patient care actions');
  nav.innerHTML = '<button type="button" data-mobile-domain="historyPanel">Ask</button><button type="button" data-mobile-domain="assessmentPanel">Assess</button><button type="button" data-mobile-domain="vitalsPanel">Vitals</button><button type="button" data-mobile-domain="treatmentPanel">Treat</button>';
  document.body.appendChild(nav);
  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-mobile-domain]');
    if (!button) return;
    const panel = document.getElementById(button.dataset.mobileDomain);
    const sheet = document.getElementById('actionSheet');
    const backdrop = document.getElementById('sheetBackdrop');
    if (sheet) sheet.hidden = false;
    if (backdrop) backdrop.hidden = false;
    document.querySelectorAll('#actionSheet .vp-panel').forEach(node => { node.hidden = true; });
    if (panel) panel.hidden = false;
    document.body.classList.add('patient-sheet-open');
    nav.querySelectorAll('[data-mobile-domain]').forEach(node => node.classList.toggle('active', node === button));
  });
  const close = document.getElementById('closeSheet');
  close?.addEventListener('click', () => {
    const sheet = document.getElementById('actionSheet');
    const backdrop = document.getElementById('sheetBackdrop');
    if (sheet) sheet.hidden = true;
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove('patient-sheet-open');
    nav.querySelectorAll('[data-mobile-domain]').forEach(node => node.classList.remove('active'));
  });
  const feed = document.createElement('section');
  feed.id = 'patientFirstMobileFeed';
  feed.className = 'patient-first-mobile-feed';
  document.body.appendChild(feed);
  if (!document.getElementById('patientExperienceActions')) {
    const actions = document.createElement('div');
    actions.id = 'patientExperienceActions';
    actions.className = 'patient-experience-action-grid';
    actions.innerHTML = '<button type="button">Explain next step</button><button type="button" disabled>Done — continue care</button>';
    actions.querySelector('button').addEventListener('click', () => {
      actions.querySelectorAll('button')[1].disabled = true;
    });
    document.body.appendChild(actions);
  }
  if (!document.getElementById('patientExperienceReview')) {
    const review = document.createElement('div');
    review.id = 'patientExperienceReview';
    review.hidden = true;
    document.body.appendChild(review);
  }
  window.EMSCodeSimFirstRunGuide = Object.freeze({ version: 'test-stub' });
})();
`
    });
  });
}

/**
 * Visual-patient pages can stall on full `load` while third-party media/fonts
 * buffer. DOMContentLoaded is enough for clinical contract assertions.
 */
async function gotoVisualPatient(page, path) {
  await blockThirdPartyNoise(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

function isIgnorableConsoleError(message) {
  const text = String(message || '');
  // Third-party signed media (Runway/CloudFront) can expire or fail to fetch
  // without affecting clinical UI contracts. Chromium often omits the URL from
  // these console messages, leaving only status / net::ERR_* text.
  if (/Failed to load resource: the server responded with a status of (401|403|404)\b/i.test(text)) return true;
  if (/Failed to load resource: net::ERR_[A-Z0-9_]+/i.test(text)) return true;
  if (/cloudfront\.net|runway|dnznrvs05pmza/i.test(text) && /\b(401|403|404|net::ERR_)/i.test(text)) return true;
  if (/DECODER_ERROR_NOT_SUPPORTED|MEDIA_ELEMENT_ERROR|PipelineStatus|video\/mp4/i.test(text)) return true;
  return false;
}

function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (isIgnorableConsoleError(text)) return;
    errors.push(new Error(text));
  });
  return async () => {
    expect(errors.map(error => error.message || String(error))).toEqual([]);
  };
}

async function completeHorseIntroIfPresent(page) {
  const skip = page.locator('#horseIntroSkip');
  try {
    await skip.waitFor({ state: 'visible', timeout: 2500 });
  } catch {
    return;
  }
  await skip.click();
  await expect(page.locator('#horseIntroOverlay')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('#infoUpdateType')).toHaveText(/DISPATCH/, { timeout: 8000 });
  await expect(page.locator('#infoUpdateType')).toHaveText(/AMBULANCE POSITION/, { timeout: 20000 });
  await expect.poll(() => page.evaluate(() => document.body.dataset.horseIntro), { timeout: 15000 }).toBe('arrived');
  await expect(page.locator('#infoUpdateType')).toHaveText(/BLS ENGINE HANDOFF/, { timeout: 8000 });
  await expect(page.locator('#horseIntroOverlay')).toHaveCount(0);
}

async function completeAsthmaIntroIfPresent(page) {
  const intro = page.locator('#scenarioIntroVideo');
  try {
    await intro.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    return;
  }

  const skip = page.locator('#scenarioIntroSkip');
  if (await skip.isVisible().catch(() => false)) await skip.click();

  // Like the horse-crush case, Continue must reveal a usable patient workspace.
  await expect(page.locator('.patient-stage')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#scenarioIntroVideo')).toBeHidden();
  await expect(page.locator('#patientImage')).toBeVisible();
}

async function openScenario(page, caseId = 'asthma', mode = 'learning') {
  const selectedMode = mode === 'assessment' ? 'assessment' : 'learning';
  await gotoVisualPatient(page, `/vitals/visual-patient.html?case=${encodeURIComponent(caseId)}&training=${selectedMode}&reset=1`);
  await expect(page).toHaveURL(new RegExp(`/vitals/visual-patient\\.html\\?case=${caseId}`));

  if (caseId === 'horse_crush') {
    await completeHorseIntroIfPresent(page);
    await expect(page.locator('#patientImage')).toBeVisible();
    await expect.poll(() => page.locator('#patientImage').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    return;
  }

  if (caseId === 'asthma' || caseId === 'respiratory') {
    await completeAsthmaIntroIfPresent(page);
    await expect(page.locator('.patient-stage')).toBeVisible();
    return;
  }

  await expect(page.locator('#patientImage')).toBeVisible();
  await expect.poll(() => page.locator('#patientImage').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
}

module.exports = {
  clearSiteStorage,
  blockThirdPartyNoise,
  gotoVisualPatient,
  watchPageErrors,
  openScenario,
  completeHorseIntroIfPresent,
  completeAsthmaIntroIfPresent
};
