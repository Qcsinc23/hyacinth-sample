/**
 * Playwright config for Electron E2E tests
 * Launches the built Electron app (run `npm run build` first)
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/*.electron.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [{ name: 'electron' }],
});
