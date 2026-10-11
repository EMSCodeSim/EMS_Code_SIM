'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

let server;
let baseUrl;

test.beforeAll(async () => {
  const root = path.resolve(__dirname, '../..', 'start-triage');
  const files = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/rules.js': ['rules.js', 'text/javascript; charset=utf-8']
  };

  server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const art = pathname.match(/^\/(?:start-triage\/)?assets\/(patient-[1-5]\.webp)$/);
    if (art) {
      response.writeHead(200, { 'content-type': 'image/webp' });
      response.end(fs.readFileSync(path.join(root, 'assets', art[1])));
      return;
    }
    const resource = files[pathname];
    if (!resource) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': resource[1] });
    response.end(fs.readFileSync(path.join(root, resource[0])));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
});

test.afterAll(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});

test('Pixel 5 users can complete the START triage flow without horizontal overflow', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'load' });

  const viewport = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(viewport.width).toBeGreaterThan(320);
  expect(viewport.width).toBeLessThanOrEqual(430);
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
  await expect(page.getByRole('heading', { name: 'START Triage' })).toBeVisible();
  await expect(page.locator('#encounter')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Confirm scene safety' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Finish & review' })).toBeHidden();

  const gpsStart = page.getByRole('button', { name: 'Start GPS walking' });
  await expect(gpsStart).toBeVisible();
  const guide = page.locator('#startGuide');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Confirm the scene is safe');
  await expect(guide).toContainText('move toward a patient to assess');
  await expect(guide.getByRole('button', { name: 'Start GPS walking' })).toBeVisible();
  await expect(guide.getByRole('button', { name: 'Use joystick' })).toBeVisible();
  await expect(guide.locator('.gps-note')).toContainText('25 m × 25 m');
  const guideOffset = await page.evaluate(() => {
    const guideBox = document.querySelector('#startGuide').getBoundingClientRect();
    const sceneBox = document.querySelector('#map').getBoundingClientRect();
    return Math.abs((guideBox.left + guideBox.width / 2) - (sceneBox.left + sceneBox.width / 2));
  });
  expect(guideOffset).toBeLessThanOrEqual(2);
  await expect(page.getByRole('button', { name: 'Move up' })).toBeHidden();
  await page.getByRole('button', { name: 'Use joystick' }).click();
  await expect(guide).toBeHidden();
  await expect(page.locator('body')).toHaveClass(/game-active/);
  await expect(page.locator('.navigation-hud .nav-key')).toBeHidden();
  await expect(page.locator('.game-hint')).toBeHidden();
  await expect(page.locator('#encounter')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Finish & review' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Direct walking patients to collection area' })).toHaveCount(0);
  await expect(page.getByText('Give an ambulatory sorting instruction to everyone who can walk.')).toHaveCount(0);
  await expect(page.getByText('First verify the simulated scene is safe.')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Move up' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move left' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move right' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move down' })).toBeVisible();

  await page.evaluate(() => {
    window.__sceneRefreshTimes = [];
    window.__sceneRefreshObserver = new MutationObserver(records => {
      if (records.some(record => record.target.classList?.contains('patient') && record.attributeName === 'style')) {
        window.__sceneRefreshTimes.push(performance.now());
      }
    });
    window.__sceneRefreshObserver.observe(document.querySelector('#map'), { attributes: true, attributeFilter: ['style'], subtree: true });
  });
  const heldDown = page.getByRole('button', { name: 'Move down' });
  await heldDown.dispatchEvent('pointerdown', { button: 0, pointerId: 19, pointerType: 'touch' });
  await page.waitForTimeout(260);
  await heldDown.dispatchEvent('pointerup', { button: 0, pointerId: 19, pointerType: 'touch' });
  const refreshIntervals = await page.evaluate(() => {
    window.__sceneRefreshObserver.disconnect();
    return window.__sceneRefreshTimes.slice(1).map((time, index) => time - window.__sceneRefreshTimes[index]);
  });
  expect(refreshIntervals.some(interval => interval < 80)).toBe(true);

  // Reset the test responder and lock Patient 2 so this flow can exercise the apnea/airway branch.
  await page.evaluate(() => {
    player = { x: 50, y: 50, heading: 0 };
    activeTargetId = 2;
    arrivedPatientId = null;
    targetClosestDistance = Infinity;
    targetPassed = false;
    render();
  });

  async function tap(locator) {
    await locator.evaluate(element => element.scrollIntoView({ block: 'center' }));
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }

  // Starting movement completes setup; the encounter panel appears only after a patient is selected.
  const approach = page.locator('#approach');
  await expect(approach).toBeDisabled();
  for (let step = 0; step < 8; step++) await tap(page.getByRole('button', { name: 'Move up' }));
  await expect(approach).toBeEnabled();
  await expect(approach).toHaveText('Assess Patient 2');
  await tap(approach);
  await expect(page.getByRole('heading', { name: 'Patient 2' })).toBeVisible();
  await expect(guide).toBeHidden();
  expect(await page.locator('#encounter').evaluate(element => element.parentElement.id)).toBe('map');

  const redTag = page.getByRole('button', { name: 'Red · Immediate' });
  await expect(redTag).toBeDisabled();
  await tap(page.getByRole('button', { name: 'Check respirations' }));
  await expect(page.getByText('No spontaneous respirations observed.')).toBeVisible();
  await tap(page.getByRole('button', { name: 'Reposition airway' }));
  await expect(page.getByText('After airway repositioning: Breathing 8/min')).toBeVisible();
  await expect(redTag).toBeEnabled();
  await tap(redTag);
  await expect(page.locator('#encounter')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Check respirations' })).toBeHidden();
  await expect(page.locator('#targetGuidance')).toContainText('Patient');
  await expect(page.locator('#approach')).toContainText('Move closer to Patient');
  await expect(page.locator('#approach')).toBeDisabled();

  await expect(page.getByText('1 / 5 tagged')).toBeVisible();
  await tap(page.getByRole('button', { name: 'Finish & review' }));
  await expect(page.getByRole('heading', { name: 'Scenario debrief' })).toBeVisible();
  await expect(page.getByText('Patient 2: red / expected RED')).toBeVisible();
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeVisible();
  await tap(retry);
  await expect(guide).toBeVisible();
  await expect(page.locator('#encounter')).toBeHidden();
  await expect(page.getByText('0 / 5 tagged')).toBeHidden();
  await expect(gpsStart).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move up' })).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test('GPS start hides the guide and stays inside a 25 m by 25 m area', async ({ page }) => {
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 39.7392, longitude: -104.9903, accuracy: 5 });
  await expect(page.locator('#startGuide')).toBeVisible();
  await expect(page.locator('#encounter')).toBeHidden();
  await page.getByRole('button', { name: 'Start GPS walking' }).click();
  await expect(page.locator('#startGuide')).toBeHidden();
  await expect(page.locator('#encounter')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Finish & review' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Direct walking patients to collection area' })).toHaveCount(0);
  await expect(page.getByText('Give an ambulatory sorting instruction to everyone who can walk.')).toHaveCount(0);
  await expect(page.getByText('First verify the simulated scene is safe.')).toBeHidden();
  await expect(page.locator('#gpsStatus')).toContainText('GPS ready · 25 m × 25 m scene area');
  for (const northing of [8, 16, 24]) {
    await page.evaluate(({ latitude, longitude }) => {
      updateGps({ coords: { latitude, longitude, accuracy: 5 } });
    }, { latitude: 39.7392 + northing / 111320, longitude: -104.9903 });
  }
  const northEdge = await page.evaluate(() => player.y);
  expect(northEdge).toBeGreaterThanOrEqual(5);
  expect(northEdge).toBeLessThan(50);
});

test('GPS targeting keeps patients fixed and uses an arrival buffer', async ({ page }) => {
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 39.7392, longitude: -104.9903, accuracy: 5 });
  await page.getByRole('button', { name: 'Start GPS walking' }).click();
  await expect(page.locator('#gpsStatus')).toContainText('GPS ready');

  const patientLocations = await page.evaluate(() => patients.map(({ id, x, y }) => ({ id, x, y })));
  for (const offset of [1.5, -1, 2]) {
    await page.evaluate(({ latitude, longitude }) => {
      updateGps({ coords: { latitude, longitude, accuracy: 5 } });
    }, { latitude: 39.7392 + offset / 111320, longitude: -104.9903 });
  }
  expect(await page.evaluate(() => patients.map(({ id, x, y }) => ({ id, x, y })))).toEqual(patientLocations);

  const states = await page.evaluate(() => {
    activeTargetId = 2;
    arrivedPatientId = null;
    targetClosestDistance = Infinity;
    player.x = 48;
    player.y = 23 + GPS_INTERACT_METERS * GPS_SCALE - .5;
    updateTargetProgress();
    render();
    const entered = !document.querySelector('#approach').disabled;
    player.y = 23 + 7.5 * GPS_SCALE;
    updateTargetProgress();
    render();
    const retained = !document.querySelector('#approach').disabled;
    player.y = 23 + 10 * GPS_SCALE;
    updateTargetProgress();
    render();
    const exited = document.querySelector('#approach').disabled;
    return { entered, retained, exited };
  });
  expect(states).toEqual({ entered: true, retained: true, exited: true });
});

test('patients grow with depth and dominate the scene at assessment range', async ({ page }) => {
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Use joystick' }).click();

  const perspective = await page.evaluate(() => {
    activeTargetId = 2;
    gpsMode = false;
    gpsAccuracy = 5;
    player = { x: 48, y: 95, heading: 0 };
    render();
    const patientAtDistance = () => Array.from(document.querySelectorAll('.patient'))
      .find(element => element.getAttribute('aria-label')?.startsWith('Patient 2,'));
    const far = patientAtDistance();
    const farScale = Number.parseFloat(far.style.getPropertyValue('--scale'));

    player.y = 23 + GPS_INTERACT_METERS * GPS_SCALE - .5;
    render();
    const near = patientAtDistance();
    return {
      farScale,
      nearScale: Number.parseFloat(near.style.getPropertyValue('--scale')),
      nearClass: near.classList.contains('patient-near'),
      nearTop: Number.parseFloat(near.style.top)
    };
  });

  expect(perspective.nearScale).toBeGreaterThanOrEqual(2.5);
  expect(perspective.nearScale).toBeGreaterThan(perspective.farScale * 2);
  expect(perspective.nearClass).toBe(true);
  expect(perspective.nearTop).toBeGreaterThan(70);
});

test('patients use distinct illustrated artwork, poses, injuries, and breathing states', async ({ page }) => {
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Use joystick' }).click();

  const artwork = await page.evaluate(() => patients.map(patient => {
    player = { x: patient.x, y: patient.y + 10, heading: 0 };
    render();
    const marker = Array.from(document.querySelectorAll('.patient'))
      .find(element => element.getAttribute('aria-label')?.startsWith(`Patient ${patient.id},`));
    return {
      id: patient.id,
      pose: marker?.dataset.pose,
      shirt: marker?.style.getPropertyValue('--shirt'),
      breathing: marker?.classList.contains('breathing'),
      rapid: marker?.dataset.rapid,
      svg: Boolean(marker?.querySelector('svg.patient-art')),
      injury: Boolean(marker?.querySelector('.injury-mark'))
    };
  }));

  expect(artwork).toHaveLength(5);
  expect(artwork.every(patient => patient.svg)).toBe(true);
  expect(new Set(artwork.map(patient => patient.shirt)).size).toBe(5);
  expect(artwork.find(patient => patient.id === 1)).toMatchObject({ pose: 'sitting', injury: true });
  expect(artwork.find(patient => patient.id === 3)).toMatchObject({ pose: 'lying', rapid: 'true', breathing: true });
  expect(artwork.find(patient => patient.id === 5)).toMatchObject({ pose: 'lying', breathing: false });
  expect(artwork.find(patient => patient.id === 4)).toMatchObject({ pose: 'sitting' });
});


test('five fixed patients can all be reached and tagged in sequence', async ({ page }) => {
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Use joystick' }).click();
  const result = await page.evaluate(() => {
    const initial = patients.map(p => ({ id:p.id, x:p.x, y:p.y }));
    const visited = [];
    for (const p of patients) {
      player.x = p.x;
      player.y = p.y;
      updateTargetProgress();
      const nearest = nearestInRange();
      if (!nearest || nearest.id !== p.id) throw Error('Cannot reach patient ' + p.id);
      encounter(p);
      if (selected !== p.id) throw Error('Cannot assess patient ' + p.id);
      p.tag = p.expected;
      selected = null;
      activeTargetId = null;
      arrivedPatientId = null;
      chooseTarget(true);
      render();
      visited.push(p.id);
    }
    return { visited, initial, final:patients.map(p=>({id:p.id,x:p.x,y:p.y})),remaining:patients.filter(p=>!p.tag).length };
  });
  expect(result.visited).toEqual([1,2,3,4,5]);
  expect(result.final).toEqual(result.initial);
  expect(result.remaining).toBe(0);
});



test('five transparent patient images load, scale in place, and complete the assessment flow', async ({ page }) => {
  const pageErrors = [];
  const failedResources = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => failedResources.push(request.url()));
  page.on('response', response => { if (response.status() >= 400 && response.url().includes('/patient-')) failedResources.push(response.url()); });
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.waitForFunction(() => patientArtPreloads.every(image => image.complete && image.naturalWidth > 0));
  expect(await page.evaluate(() => Object.keys(patientArtById))).toEqual(['1', '2', '3', '4', '5']);
  await page.getByRole('button', { name: 'Use joystick' }).click();

  await page.evaluate(() => {
    const p = patients.find(item => item.id === 1);
    player = { x: p.x, y: p.y + 70, heading: 0 };
    activeTargetId = p.id;
    render();
  });
  const patientOne = page.locator('.patient[data-patient-id="1"]');
  await expect(patientOne).toBeVisible();
  await expect(patientOne.locator('img[data-patient-art="1"]')).toHaveAttribute('src', '/start-triage/assets/patient-1.webp');
  const patientPositions = await page.evaluate(() => patients.map(({ id, x, y }) => ({ id, x, y })));

  async function captureDistance(name, units) {
    await page.evaluate(units => {
      const p = patients.find(item => item.id === 1);
      player = { x: p.x, y: p.y + units, heading: 0 };
      render();
    }, units);
    await page.waitForTimeout(200);
    const height = await patientOne.locator('img[data-patient-art="1"]').evaluate(image => image.getBoundingClientRect().height);
    const screenshotPath = path.resolve(__dirname, '../../test-results/start-triage-patient-' + name + '.png');
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath });
    return height;
  }
  const far = await captureDistance('far', 70);
  const medium = await captureDistance('medium', 29);
  const close = await captureDistance('close', 10);
  expect(medium).toBeGreaterThan(far);
  expect(close).toBeGreaterThan(medium);
  expect(await page.evaluate(() => patients.map(({ id, x, y }) => ({ id, x, y })))).toEqual(patientPositions);

  for (const id of [1, 2, 3, 4, 5]) {
    await page.evaluate(id => {
      const p = patients.find(item => item.id === id);
      player = { x: p.x, y: p.y + 10, heading: 0 };
      activeTargetId = id;
      render();
    }, id);
    const scenePatient = page.locator('.patient[data-patient-id="' + id + '"]');
    await expect(scenePatient).toBeVisible();
    await expect(scenePatient.locator('img[data-patient-art="' + id + '"]')).toHaveAttribute('src', '/start-triage/assets/patient-' + id + '.webp');
    await scenePatient.locator('img').evaluate(image => image.decode());
    await expect(scenePatient.locator('.patient-art-fallback')).toBeHidden();
  }

  await page.evaluate(() => { const p = patients[0]; player = { x: p.x, y: p.y + 10, heading: 0 }; render(); encounter(p); });
  await expect(page.getByRole('heading', { name: 'Patient 1' })).toBeVisible();
  const assessmentImage = page.locator('#encounter .assessment-patient-art img[data-patient-art="1"]');
  await expect(assessmentImage).toHaveAttribute('src', await patientOne.locator('img[data-patient-art="1"]').getAttribute('src'));
  await page.getByRole('button', { name: 'Green · Minor' }).click();

  const steps = [
    { id: 2, actions: ['Check respirations', 'Reposition airway'], tag: 'Red · Immediate' },
    { id: 3, actions: ['Check respirations', 'Check radial pulse / refill', 'Assess simple commands'], tag: 'Red · Immediate' },
    { id: 4, actions: ['Check respirations', 'Check radial pulse / refill', 'Assess simple commands'], tag: 'Yellow · Delayed' },
    { id: 5, actions: ['Check respirations', 'Reposition airway'], tag: 'Black · Deceased' }
  ];
  for (const step of steps) {
    await page.evaluate(id => { const p = patients.find(item => item.id === id); player = { x: p.x, y: p.y + 10, heading: 0 }; activeTargetId = id; arrivedPatientId = id; render(); encounter(p); }, step.id);
    await expect(page.getByRole('heading', { name: 'Patient ' + step.id })).toBeVisible();
    for (const action of step.actions) await page.getByRole('button', { name: action }).click();
    await page.getByRole('button', { name: step.tag }).click();
  }
  expect(failedResources).toEqual([]);
  await page.getByRole('button', { name: 'Finish & review' }).click();
  await expect(page.getByRole('heading', { name: 'Scenario debrief' })).toBeVisible();
  await expect(page.getByText('Patient 5: black / expected BLACK')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
