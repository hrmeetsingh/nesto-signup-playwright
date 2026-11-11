import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import type { AppOptions } from './tests/fixtures';

const BASE_URL = process.env.BASE_URL ?? 'https://app.qa.nesto.ca';

// UI specs that run in every browser project.
const UI_SPECS = /signup\.(positive|negative|a11y)\.spec\.ts/;

export default defineConfig<AppOptions>({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: false, // hide Playwright's internal fixture/hook steps
        suiteTitle: false,
        environmentInfo: { baseURL: BASE_URL, node: process.version },
      },
    ],
    ...(process.env.CI ? [['github'] as ['github']] : []),
  ],
  use: {
    baseURL: BASE_URL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',

  projects: [
    { name: 'api', testMatch: /signup\.api\.spec\.ts/ },

    { name: 'chromium', testMatch: UI_SPECS, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: UI_SPECS, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: UI_SPECS, use: { ...devices['Desktop Safari'] } },
    { name: 'pixel-7', testMatch: UI_SPECS, use: { ...devices['Pixel 7'] } },
    { name: 'iphone-15', testMatch: UI_SPECS, use: { ...devices['iPhone 15'] } },
    {
      name: 'chromium-fr',
      testMatch: UI_SPECS,
      use: { ...devices['Desktop Chrome'], appLocale: 'fr-CA' },
    },

    { name: 'visual', testMatch: /signup\.visual\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'perf',
      testMatch: /signup\.perf\.spec\.ts/,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
