import type { Locator, Page, Response } from '@playwright/test';
import { LABELS, MESSAGES, SIGNUP_PATH, type Locale } from '../data/i18n';
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
    // Assumption: each field's accessible name matches LABELS for the locale exactly (exact: true),
    // so a wording change in the app fails the locator rather than silently matching another field.
    // The phone country label is not translated on /fr/signup, so LABELS keeps it in English there.
    const label = LABELS[locale];
    const textbox = (name: string) => page.getByRole('textbox', { name, exact: true });
    this.firstName = textbox(label.firstName);
    this.lastName = textbox(label.lastName);
    this.phoneCountry = page.getByRole('combobox', { name: label.phoneCountry, exact: true });
    this.phone = textbox(label.phone);
    // Assumption: province is a native <select>, so selectOption() works with the value ('QC').
    this.province = page.getByRole('combobox', { name: label.province, exact: true });
    this.email = textbox(label.email);
    this.password = textbox(label.password);
    this.passwordConfirmation = textbox(label.passwordConfirmation);
    // The consent checkbox has no usable accessible name, so it's found by test id.
    this.consent = page.getByTestId('agreement-checkbox');
    this.submitButton = page.getByRole('button', { name: label.submit, exact: true });
    // The page always has an empty role="alert" (the Next.js route announcer), so the server-error
    // toast is found by its text. Assumption: the toast is the only alert carrying that text.
    this.serverError = page.getByRole('alert').filter({ hasText: MESSAGES[locale].serverError });
  }

  // Assumption: once Confirm password is present and the network is idle, the form has hydrated.
  // Before hydration every input has id="field-1" and a submit is silently ignored (no request,
  // no error), so filling or submitting too early makes tests fail in confusing ways.
  async goto(): Promise<void> {
    await this.open(SIGNUP_PATH[this.locale], this.passwordConfirmation);
  }

  fieldInput(field: SignupField): Locator {
    return this[field];
  }

  // The error element for a field.
  // Assumption: the app links each error to its input with aria-describedby="form-error-message-<id>".
  // Call this after the error has appeared: if the attribute is missing, the locator matches
  // nothing and the caller's visibility assertion fails.
  async fieldError(field: SignupField): Promise<Locator> {
    const id = await this.fieldInput(field).getAttribute('aria-describedby');
    return this.page.locator(`[id="${id}"]`);
  }

  // Fills only the fields present in `user`; does not submit.
  // Assumptions: the phone input accepts raw digits ('5145551234') and formats them itself;
  // filling one field never resets another. Province is pre-selected from the visitor's IP,
  // so callers that care about it must pass it (validUser() and fixedUser() use 'QC').
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

  // Starts counting POST /api/accounts requests and returns a function that reads the count.
  // Call it BEFORE the action under test: earlier requests are not counted.
  // Assumption: no other POST URL on this page contains ACCOUNTS_API.
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

  // Fills the form in the browser, clicks submit, and resolves with the response to the
  // request the page itself sends. The response wait starts before the click so a fast
  // response can't be missed.
  // Assumption: a valid submit sends exactly one POST /api/accounts.
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
