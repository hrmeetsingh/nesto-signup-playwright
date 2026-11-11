import { chromium, type Browser } from '@playwright/test';
import { test as base, expect } from '../../src/fixtures';
import { SIGNUP_PATH } from '../../src/data/i18n';

// Minimum Lighthouse category scores (0–100).
// Assumption: these are targets for the QA environment, which isn't tuned like production.
// Performance is the noisiest score: it depends on the machine and network the test runs on
// (shared CI runners vary), so expect it to move a few points between runs.
const THRESHOLDS = {
  performance: 70,
  accessibility: 90,
  'best-practices': 90,
  seo: 80,
} as const;

type Category = keyof typeof THRESHOLDS;

// Lighthouse drives its own tab over the Chrome DevTools Protocol, so it needs a Chromium
// started with a debugging port; it doesn't use the Playwright `page`.
// Assumptions: port 9222 + worker index is free on the machine; the page needs no login or
// cookies (Lighthouse opens a fresh tab with none of the test's state).
const test = base.extend<{}, { lighthouseBrowser: { browser: Browser; port: number } }>({
  lighthouseBrowser: [
    async ({}, use, workerInfo) => {
      const port = 9222 + workerInfo.workerIndex;
      const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
      await use({ browser, port });
      await browser.close();
    },
    { scope: 'worker' },
  ],
});

test.describe('signup: Lighthouse', { tag: '@perf' }, () => {
  for (const [locale, path] of Object.entries(SIGNUP_PATH)) {
    // Assumption: Lighthouse's default settings (mobile emulation with simulated slow 4G) are
    // the conditions we want to score against.
    test(`${path} meets the score thresholds`, { tag: '@positive' }, async ({ lighthouseBrowser, baseURL }, testInfo) => {
      test.setTimeout(120_000);
      const { default: lighthouse } = await import('lighthouse');

      const result = await lighthouse(`${baseURL}${path}`, {
        port: lighthouseBrowser.port,
        output: 'html',
        logLevel: 'error',
        onlyCategories: Object.keys(THRESHOLDS),
        // QA is deliberately blocked from search indexing; that check only matters in production.
        skipAudits: ['is-crawlable'],
      });
      if (!result) throw new Error('Lighthouse returned no result');

      await testInfo.attach(`lighthouse-${locale}.html`, {
        body: result.report as string,
        contentType: 'text/html',
      });

      // A category Lighthouse couldn't score counts as 0, so it fails rather than being skipped.
      const scores = Object.fromEntries(
        (Object.keys(THRESHOLDS) as Category[]).map((c) => [
          c,
          Math.round((result.lhr.categories[c]?.score ?? 0) * 100),
        ]),
      ) as Record<Category, number>;
      testInfo.annotations.push({ type: 'lighthouse-scores', description: JSON.stringify(scores) });

      // Soft assertions so one run reports every category below its minimum, not just the first.
      for (const c of Object.keys(THRESHOLDS) as Category[]) {
        expect.soft(scores[c], `${c} score`).toBeGreaterThanOrEqual(THRESHOLDS[c]);
      }
    });
  }
});
