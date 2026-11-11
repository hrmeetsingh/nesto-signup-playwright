import type { Locator, Page } from '@playwright/test';
import type { Locale } from '../data/i18n';

// Parts shared by every page. The base URL is set only in playwright.config.ts (`use.baseURL`),
// so `open()` always takes a path relative to it.
export abstract class BasePage {
  // Assumption: the app has no footer, and the header (language switch + login button) is the
  // same on every page, with the same test ids.
  readonly languageSwitch: Locator;
  readonly headerLoginButton: Locator;

  constructor(
    readonly page: Page,
    readonly locale: Locale,
  ) {
    this.languageSwitch = page.getByTestId('header-language-switch');
    this.headerLoginButton = page.getByTestId('header-login-button');
  }

  // Opens a path, then waits until the page is usable.
  // Assumption: "usable" = `readyWhen` is in the DOM AND the network has gone quiet. The app is a
  // Next.js page that hydrates after load; networkidle is our signal that hydration has finished.
  // If the app ever adds polling or a long-lived connection, networkidle will hang and this
  // needs a different ready signal.
  protected async open(path: string, readyWhen: Locator): Promise<void> {
    await this.page.goto(path);
    await readyWhen.waitFor();
    await this.page.waitForLoadState('networkidle');
  }
}
