import { test, expect } from '../../src/fixtures';
import { fixedUser, validUser } from '../../src/data/users';
import type { SignupPage } from '../../src/pages/SignupPage';

// Assumptions for every screenshot in this file:
// - Baselines are generated and compared inside the Playwright Docker image, so fonts and
//   rendering match between runs. Runs outside Docker will show diffs.
// - Province is the only field that changes by visitor (it's pre-selected from the IP), so
//   selecting 'QC' is enough to make the form identical on every run.
// - The page has no other dynamic content (dates, random ids, third-party banners). If a
//   banner appears, mask it rather than blocking its request.
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
      // Assumption: all field errors render together, so First name turning invalid means
      // every error is on screen.
      await expect(signupPage.firstName).toHaveAttribute('aria-invalid', 'true');
      await stabilise(signupPage);
      await expect(signupPage.page).toHaveScreenshot(`signup-errors-${lang}.png`, { fullPage: true });
    });
  });
}

test.describe('signup: visual', { tag: '@visual' }, () => {
  // fixedUser() has a fixed email so the screenshot is stable. Safe only because this test
  // never submits; a submitted fixed email would hit the duplicate-email error.
  test('filled form', { tag: '@positive' }, async ({ signupPage }) => {
    await signupPage.goto();
    await signupPage.fill(fixedUser());
    await stabilise(signupPage);
    await expect(signupPage.page).toHaveScreenshot('signup-filled.png', { fullPage: true });
  });

  test('server error alert (real duplicate email)', { tag: '@negative' }, async ({ signupPage, api }) => {
    // Assumption: a duplicate email is a reliable way to make the real backend fail (400), so
    // the alert can be produced without mocking. The user is seeded through the API first.
    const existing = validUser();
    expect((await api.createUser(existing)).status()).toBe(201);

    await signupPage.goto();
    const response = await signupPage.signup({ ...fixedUser(), email: existing.email });
    expect(response.status()).toBe(400);
    await expect(signupPage.serverError).toBeVisible();
    await stabilise(signupPage);
    // Assumption: the alert is a Toastify toast that closes ~5 s after it appears, when an
    // invisible progress-bar animation ends, and hovering it pauses that timer. With
    // animations 'disabled' the animation would finish instantly and close the toast, so we
    // hover and allow animations instead.
    await signupPage.serverError.hover();
    // The seeded email is new on every run, so it's masked.
    await expect(signupPage.page).toHaveScreenshot('signup-server-error.png', {
      fullPage: true,
      animations: 'allow',
      mask: [signupPage.email],
    });
    // The toast is white on a white header and changes under the 1% diff limit, so the
    // screenshot alone would still pass without it. Check it's still there explicitly.
    await expect(signupPage.serverError).toBeVisible();
  });
});
