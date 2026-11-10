import { defineConfig } from '@playwright/test';
const production = process.env.E2E_PRODUCTION === '1';
const port = production ? 4174 : 4173;
const basePath = process.env.VITE_BASE_PATH || '/English_spot/';
const baseURL = `http://127.0.0.1:${port}${basePath}`;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120000,
  fullyParallel: false,
  workers: 4,
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: `npm run ${production ? 'preview' : 'dev'} -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
});
