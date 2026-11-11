import type { Locator, Page } from '@playwright/test';
import type { Locale } from '../data/rules';

/** Parts shared by every page. The base URL lives in playwright.config.ts (`use.baseURL`). */
export abstract class BasePage {
  // The app has no footer; the shared elements are in the header.
  readonly languageSwitch: Locator;
  readonly headerLoginButton: Locator;

  constructor(
    readonly page: Page,
    readonly locale: Locale,
  ) {
    this.languageSwitch = page.getByTestId('header-language-switch');
    this.headerLoginButton = page.getByTestId('header-login-button');
  }

  /** Opens a path relative to the configured baseURL, then waits until the page is ready. */
  protected async open(path: string, readyWhen: Locator): Promise<void> {
    await this.page.goto(path);
    await readyWhen.waitFor();
    await this.page.waitForLoadState('networkidle');
  }
}
