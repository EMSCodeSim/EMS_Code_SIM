'use strict';

const { defineConfig, devices } = require('@playwright/test');

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const launchOptions = executablePath
  ? { executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] }
  : undefined;

module.exports = defineConfig({
  testDir: './test/interaction',
  timeout: 45_000,
  globalTimeout: process.env.CI ? 20 * 60_000 : undefined,
  expect: { timeout: 7_500 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions
  },
  webServer: {
    command: 'node tools/serve-dist.js',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } }
  ]
});
