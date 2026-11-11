import { test as base, expect } from '@playwright/test';
import type { Locale } from './data/i18n';
import { SignupPage } from './pages/SignupPage';
import { SignupApi } from './api/SignupApi';

export type AppOptions = { appLocale: Locale };

type Fixtures = {
  appLocale: Locale;
  signupPage: SignupPage;
  api: SignupApi;
};

export const test = base.extend<Fixtures>({
  appLocale: ['en-CA', { option: true }],
  signupPage: async ({ page, appLocale }, use) => {
    await use(new SignupPage(page, appLocale));
  },
  api: async ({ request }, use) => {
    await use(new SignupApi(request));
  },
});

export { expect };
