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
    const resource = files[new URL(request.url, 'http://localhost').pathname];
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
  await expect(page.getByRole('button', { name: 'Finish & review' })).toBeDisabled();

  const gpsStart = page.getByRole('button', { name: 'Start GPS walking' });
  await expect(gpsStart).toBeVisible();
  const guide = page.locator('#startGuide');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Confirm the scene is safe');
  await expect(guide).toContainText('walk toward a patient');
  const guideOffset = await page.evaluate(() => {
    const guideBox = document.querySelector('#startGuide').getBoundingClientRect();
    const sceneBox = document.querySelector('#map').getBoundingClientRect();
    return Math.abs((guideBox.left + guideBox.width / 2) - (sceneBox.left + sceneBox.width / 2));
  });
  expect(guideOffset).toBeLessThanOrEqual(2);
  await expect(page.getByRole('button', { name: 'Move up' })).toBeHidden();
  await page.getByRole('button', { name: 'Use joystick' }).click();
  await expect(guide).toBeHidden();
  await expect(page.locator('#encounter')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Finish & review' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Direct walking patients to collection area' })).toHaveCount(0);
  await expect(page.getByText('Give an ambulatory sorting instruction to everyone who can walk.')).toHaveCount(0);
  await expect(page.getByText('First verify the simulated scene is safe.')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Move up' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move left' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move right' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move down' })).toBeVisible();

  async function tap(locator) {
    await locator.evaluate(element => element.scrollIntoView({ block: 'center' }));
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }

  // Starting movement completes setup; the encounter panel appears only after a patient is selected.
  const approach = page.locator('#approach');
  await expect(approach).toBeDisabled();
  for (let step = 0; step < 4; step++) await tap(page.getByRole('button', { name: 'Move up' }));
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

  await expect(page.getByText('1 / 7 tagged')).toBeVisible();
  await tap(page.getByRole('button', { name: 'Finish & review' }));
  await expect(page.getByRole('heading', { name: 'Scenario debrief' })).toBeVisible();
  await expect(page.getByText('Patient 2: red / expected RED')).toBeVisible();
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeVisible();
  await tap(retry);
  await expect(guide).toBeVisible();
  await expect(page.locator('#encounter')).toBeHidden();
  await expect(page.getByText('0 / 7 tagged')).toBeVisible();
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
  expect(northEdge).toBe(5);
});
