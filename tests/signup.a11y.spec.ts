import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from './fixtures';
import { validUser } from './data/users';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const FAIL_IMPACTS = ['serious', 'critical'];

async function expectNoViolations(page: Page, testInfo: TestInfo, state: string) {
  let axe = new AxeBuilder({ page }).withTags(TAGS);
  if (page.context().browser()?.browserType().name() === 'firefox') {
    // These two axe rules crash the page in Firefox (an axe/Firefox problem, not the app).
    axe = axe.disableRules(['label', 'select-name']);
    testInfo.annotations.push({
      type: 'axe-workaround',
      description: 'label and select-name rules disabled on Firefox',
    });
  }
  const results = await axe.analyze();
  await testInfo.attach(`axe-${state}.json`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  const failing = results.violations.filter((v) => FAIL_IMPACTS.includes(v.impact ?? ''));
  const report = failing
    .map((v) => `${v.id} (${v.impact}) ${v.helpUrl}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`)
    .join('\n');
  expect(failing, `axe violations in "${state}":\n${report}`).toEqual([]);
}

test.describe('signup: accessibility', { tag: '@a11y' }, () => {
  test.beforeEach(async ({ signupPage }) => {
    await signupPage.goto();
  });

  test('initial load has no serious violations', { tag: '@positive' }, async ({ signupPage }, testInfo) => {
    await expectNoViolations(signupPage.page, testInfo, 'initial');
  });

  test('after an invalid submit has no serious violations', { tag: '@negative' }, async ({ signupPage }, testInfo) => {
    await signupPage.submit();
    await expect(signupPage.firstName).toHaveAttribute('aria-invalid', 'true');
    await expectNoViolations(signupPage.page, testInfo, 'invalid-submit');
  });

  test('errors are linked to their inputs and focus moves to the first invalid field', { tag: '@negative' }, async ({ signupPage }) => {
    await signupPage.submit();
    await expect(signupPage.firstName).toBeFocused();
    await expect(signupPage.firstName).toHaveAttribute('aria-invalid', 'true');
    await expect(signupPage.firstName).toHaveAttribute('aria-describedby', /^form-error-message-/);
    await expect(await signupPage.fieldError('firstName')).toBeVisible();
  });

  test('Tab moves through the fields in order and reaches submit', { tag: '@positive' }, async ({ signupPage, browserName, isMobile }) => {
    test.skip(browserName === 'webkit' || isMobile, 'Safari and mobile do not Tab to form controls by default');
    const order = [
      signupPage.lastName,
      signupPage.phoneCountry,
      signupPage.phone,
      signupPage.province,
      signupPage.email,
      signupPage.password,
      signupPage.passwordConfirmation,
      signupPage.consent,
      signupPage.submitButton,
    ];
    await signupPage.firstName.focus();
    for (const next of order) {
      await signupPage.page.keyboard.press('Tab');
      await expect(next).toBeFocused();
    }
  });

  test('Enter submits the form', { tag: '@positive' }, async ({ signupPage }) => {
    const requests = signupPage.countSignupRequests();
    await signupPage.fill(validUser({ email: 'not-an-email' }));
    await signupPage.passwordConfirmation.press('Enter');
    // Enter triggers validation (the email is invalid on purpose, so no account is created).
    await expect(signupPage.email).toHaveAttribute('aria-invalid', 'true');
    expect(requests()).toBe(0);
  });
});
