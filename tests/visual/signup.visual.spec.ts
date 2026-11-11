import { test, expect } from '../../src/fixtures';
import { fixedUser, validUser } from '../../src/data/users';
import type { SignupPage } from '../../src/pages/SignupPage';

// Select a fixed province (the default comes from the visitor's IP) and scroll to the top.
async function stabilise(signupPage: SignupPage) {
  await signupPage.fill({ province: 'QC' });
  await signupPage.page.evaluate(() => window.scrollTo(0, 0));
}

for (const locale of ['en-CA', 'fr-CA'] as const) {
  const lang = locale.slice(0, 2);

  test.describe(`signup: visual ${lang}`, { tag: '@visual' }, () => {
    test.use({ appLocale: locale });

    test(`empty form ${lang}`, { tag: '@positive' }, async ({ signupPage }) => {
      await signupPage.goto();
      await stabilise(signupPage);
      await expect(signupPage.page).toHaveScreenshot(`signup-empty-${lang}.png`, { fullPage: true });
    });

    test(`validation errors ${lang}`, { tag: '@negative' }, async ({ signupPage }) => {
      await signupPage.goto();
      await signupPage.submit();
      await expect(signupPage.firstName).toHaveAttribute('aria-invalid', 'true');
      await stabilise(signupPage);
      await expect(signupPage.page).toHaveScreenshot(`signup-errors-${lang}.png`, { fullPage: true });
    });
  });
}

test.describe('signup: visual', { tag: '@visual' }, () => {
  test('filled form', { tag: '@positive' }, async ({ signupPage }) => {
    await signupPage.goto();
    await signupPage.fill(fixedUser());
    await stabilise(signupPage);
    await expect(signupPage.page).toHaveScreenshot('signup-filled.png', { fullPage: true });
  });

  test('server error alert (real duplicate email)', { tag: '@negative' }, async ({ signupPage, api }) => {
    const existing = validUser();
    expect((await api.createUser(existing)).status()).toBe(201);

    await signupPage.goto();
    const response = await signupPage.signup({ ...fixedUser(), email: existing.email });
    expect(response.status()).toBe(400);
    await expect(signupPage.serverError).toBeVisible();
    await stabilise(signupPage);
    // The alert is a toast that closes when its (invisible) timer animation ends, so
    // 'disabled' animations would close it at once. Hovering pauses the timer instead.
    await signupPage.serverError.hover();
    // The email is new on every run, so mask it.
    await expect(signupPage.page).toHaveScreenshot('signup-server-error.png', {
      fullPage: true,
      animations: 'allow',
      mask: [signupPage.email],
    });
    // The toast is white on a white header, under the 1% diff limit, so also check it's still there.
    await expect(signupPage.serverError).toBeVisible();
  });
});
