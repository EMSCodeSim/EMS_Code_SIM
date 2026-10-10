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
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(viewport.width).toBeGreaterThan(320);
  expect(viewport.width).toBeLessThanOrEqual(430);
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
  await expect(page.getByRole('heading', { name: 'START Triage' })).toBeVisible();

  const markers = page.locator('.patient');
  await expect(markers).toHaveCount(6);
  const markerBoxes = await markers.evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height, right: box.right, bottom: box.bottom };
  }));
  expect(markerBoxes.every(box =>
    box.width >= 44 && box.height >= 44 &&
    box.right <= viewport.width && box.bottom <= document.documentElement.clientHeight
  )).toBe(true);

  async function tap(locator) {
    await locator.evaluate(element => element.scrollIntoView({ block: 'center' }));
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }

  await tap(page.getByRole('button', { name: 'Confirm scene safety' }));
  await tap(page.getByRole('button', { name: 'Direct walking patients to collection area' }));
  await tap(page.getByRole('button', { name: 'Patient 2 untriaged' }));

  const redTag = page.getByRole('button', { name: 'Red · Immediate' });
  await expect(redTag).toBeDisabled();
  await tap(page.getByRole('button', { name: 'Check respirations' }));
  await expect(page.getByText('No spontaneous respirations observed.')).toBeVisible();
  await tap(page.getByRole('button', { name: 'Reposition airway' }));
  await expect(page.getByText('After airway repositioning: Breathing 8/min')).toBeVisible();
  await expect(redTag).toBeEnabled();
  await tap(redTag);

  await expect(page.getByText('1 / 6 tagged')).toBeVisible();
  await tap(page.getByRole('button', { name: 'Finish & review' }));
  await expect(page.getByRole('heading', { name: 'Scenario debrief' })).toBeVisible();
  await expect(page.getByText('Patient 2: red / expected RED')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
