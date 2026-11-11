import { test, expect } from './fixtures';
import { EMPTY_FORM_ERRORS, MESSAGES } from './data/rules';
import { INVALID_CASES, invalidUser, validUser, type SignupField } from './data/users';

test.describe('signup: client-side validation', { tag: '@negative' }, () => {
  test.beforeEach(async ({ signupPage }) => {
    await signupPage.goto();
  });

  for (const c of INVALID_CASES) {
    test(`${c.field}: ${c.name}`, async ({ signupPage, appLocale }) => {
      const requests = signupPage.countSignupRequests();

      await signupPage.fill(invalidUser(c));
      await signupPage.submit();

      await expect(signupPage.fieldInput(c.field)).toHaveAttribute('aria-invalid', 'true');
      await expect(await signupPage.fieldError(c.field)).toHaveText(MESSAGES[appLocale][c.rule]);
      expect(requests()).toBe(0);
    });
  }

  test('empty form shows every required-field error', async ({ signupPage, appLocale }) => {
    const requests = signupPage.countSignupRequests();

    await signupPage.submit();

    for (const [field, rule] of Object.entries(EMPTY_FORM_ERRORS)) {
      await expect(await signupPage.fieldError(field as SignupField)).toHaveText(
        MESSAGES[appLocale][rule],
      );
    }
    await expect(signupPage.firstName).toBeFocused();
    expect(requests()).toBe(0);
  });
});

test.describe('signup: server-side rejection', { tag: '@negative' }, () => {
  test('double submit sends only one request', async ({ signupPage }) => {
    await signupPage.goto();
    const requests = signupPage.countSignupRequests();
    await signupPage.fill(validUser());

    const response = signupPage.waitForSignupResponse();
    await signupPage.submitButton.dblclick();
    expect((await response).status()).toBe(201);

    await expect(signupPage.page).not.toHaveURL(/\/signup/, { timeout: 30_000 });
    expect(requests()).toBe(1);
  });

  test('already registered email shows the server error', async ({ signupPage, api, appLocale }) => {
    const existing = validUser();
    expect((await api.createUser(existing, appLocale)).status()).toBe(201);

    await signupPage.goto();
    const response = await signupPage.signup(validUser({ email: existing.email }));

    expect(response.status()).toBe(400);
    await expect(signupPage.serverError).toBeVisible();
    await expect(signupPage.page).toHaveURL(/\/signup/);
  });
});
