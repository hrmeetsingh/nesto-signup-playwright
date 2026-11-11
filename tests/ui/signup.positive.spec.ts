import { test, expect } from '../../src/fixtures';
import { LANGUAGE } from '../../src/data/rules';
import { BOUNDARY, toE164, validUser, type SignupUser } from '../../src/data/users';
import type { SignupPage } from '../../src/pages/SignupPage';
import type { Locale } from '../../src/data/rules';

/** Signs up a new real user and checks the request, the 201 and the redirect. */
async function expectSignupSucceeds(signupPage: SignupPage, user: SignupUser, locale: Locale) {
  await signupPage.goto();
  const response = await signupPage.signup(user);

  const body = response.request().postDataJSON();
  expect(body).toMatchObject({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: toE164(user.phone),
    region: user.province,
    language: LANGUAGE[locale],
    leadDistributeConsentAgreement: user.consent,
  });
  // Compare the password without printing it in a failure message.
  expect(body.password === user.password, 'submitted password matches').toBe(true);

  expect(response.status()).toBe(201);
  expect((await response.json()).account).toMatchObject({ email: user.email });
  await expect(signupPage.page).not.toHaveURL(/\/signup/, { timeout: 30_000 });
}

test.describe('signup: happy path', { tag: '@positive' }, () => {
  test('valid user creates an account', { tag: '@smoke' }, async ({ signupPage, appLocale }) => {
    await expectSignupSucceeds(signupPage, validUser(), appLocale);
  });

  for (const b of BOUNDARY) {
    test(`boundary: ${b.name}`, async ({ signupPage, appLocale }) => {
      await expectSignupSucceeds(signupPage, validUser(b.user), appLocale);
    });
  }
});
