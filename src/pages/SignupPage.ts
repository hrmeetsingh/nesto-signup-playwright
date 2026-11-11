import type { Locator, Page, Response } from '@playwright/test';
import { LABELS, MESSAGES, SIGNUP_PATH, type Locale } from '../data/rules';
import type { SignupField, SignupUser } from '../data/users';
import { ACCOUNTS_API } from '../api/SignupApi';
import { BasePage } from './BasePage';

export class SignupPage extends BasePage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly phoneCountry: Locator;
  readonly phone: Locator;
  readonly province: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly passwordConfirmation: Locator;
  readonly consent: Locator;
  readonly submitButton: Locator;
  readonly serverError: Locator;

  constructor(page: Page, locale: Locale) {
    super(page, locale);
    const label = LABELS[locale];
    const textbox = (name: string) => page.getByRole('textbox', { name, exact: true });
    this.firstName = textbox(label.firstName);
    this.lastName = textbox(label.lastName);
    this.phoneCountry = page.getByRole('combobox', { name: label.phoneCountry, exact: true });
    this.phone = textbox(label.phone);
    this.province = page.getByRole('combobox', { name: label.province, exact: true });
    this.email = textbox(label.email);
    this.password = textbox(label.password);
    this.passwordConfirmation = textbox(label.passwordConfirmation);
    this.consent = page.getByTestId('agreement-checkbox');
    this.submitButton = page.getByRole('button', { name: label.submit, exact: true });
    // The page always has an empty role=alert (route announcer), so match the text too.
    this.serverError = page.getByRole('alert').filter({ hasText: MESSAGES[locale].serverError });
  }

  async goto(): Promise<void> {
    // Before hydration every input has id="field-1" and all labels read "First name",
    // and a submit before the page is idle is silently ignored. open() waits for
    // Confirm password and networkidle: keep both.
    await this.open(SIGNUP_PATH[this.locale], this.passwordConfirmation);
  }

  fieldInput(field: SignupField): Locator {
    return this[field];
  }

  /** The error element linked to the field through aria-describedby. */
  async fieldError(field: SignupField): Promise<Locator> {
    const id = await this.fieldInput(field).getAttribute('aria-describedby');
    return this.page.locator(`[id="${id}"]`);
  }

  /** Fills only the fields provided. */
  async fill(user: Partial<SignupUser>): Promise<void> {
    const fields: SignupField[] = [
      'firstName',
      'lastName',
      'phone',
      'email',
      'password',
      'passwordConfirmation',
    ];
    for (const field of fields) {
      const value = user[field];
      if (value !== undefined) await this.fieldInput(field).fill(value);
    }
    if (user.province !== undefined) await this.province.selectOption(user.province);
    if (user.consent !== undefined) await this.consent.setChecked(user.consent);
  }

  /** Starts counting POST /api/accounts requests. Returns a function that reads the count. */
  countSignupRequests(): () => number {
    let count = 0;
    this.page.on('request', (r) => {
      if (r.url().includes(ACCOUNTS_API) && r.method() === 'POST') count += 1;
    });
    return () => count;
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Fill + submit, resolving with the POST /api/accounts response. */
  async signup(user: Partial<SignupUser>): Promise<Response> {
    await this.fill(user);
    const response = this.waitForSignupResponse();
    await this.submit();
    return response;
  }

  waitForSignupResponse(): Promise<Response> {
    return this.page.waitForResponse(
      (r) => r.url().includes(ACCOUNTS_API) && r.request().method() === 'POST',
    );
  }
}
