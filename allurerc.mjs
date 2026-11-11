import { defineConfig } from 'allure';

export default defineConfig({
  name: 'nesto signup E2E',
  resultsDir: './allure-results',
  output: './allure-report',
  // Trend data across runs. CI restores this file from the published report before generating.
  historyPath: './history.jsonl',
  historyLimit: 30,
  plugins: {
    awesome: {
      options: {
        reportName: 'nesto signup E2E',
        reportLanguage: 'en',
        theme: 'auto',
        singleFile: false,
      },
    },
  },
});
