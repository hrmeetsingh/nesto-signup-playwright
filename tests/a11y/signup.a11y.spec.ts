import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from '../../src/fixtures';
import { validUser } from '../../src/data/users';

// Assumption: the target is WCAG 2.1 level AA. Only serious and critical violations fail a
// test; moderate and minor ones are still in the attached JSON, but don't block the build.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const FAIL_IMPACTS = ['serious', 'critical'];

async function expectNoViolations(page: Page, testInfo: TestInfo, state: string) {
  let axe = new AxeBuilder({ page }).withTags(TAGS);
  // Firefox is detected from the running browser: device presets (Pixel, iPhone) set
  // defaultBrowserType, so project.use.browserName can be empty.
  if (page.context().browser()?.browserType().name() === 'firefox') {
    // Assumption: the `label` and `select-name` rules crash the page because of an axe/Firefox
    // problem, not an app bug. They still run on Chromium and WebKit, so labels stay covered.
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
    // Assumption: all errors render together, so First name turning invalid means the
    // error state is complete before axe scans it.
    await expect(signupPage.firstName).toHaveAttribute('aria-invalid', 'true');
    await expectNoViolations(signupPage.page, testInfo, 'invalid-submit');
  });

  // Assumption: First name is the first field in the form, so an empty submit focuses it.
  test('errors are linked to their inputs and focus moves to the first invalid field', { tag: '@negative' }, async ({ signupPage }) => {
    await signupPage.submit();
    await expect(signupPage.firstName).toBeFocused();
    await expect(signupPage.firstName).toHaveAttribute('aria-invalid', 'true');
    await expect(signupPage.firstName).toHaveAttribute('aria-describedby', /^form-error-message-/);
    await expect(await signupPage.fieldError('firstName')).toBeVisible();
  });

  test('Tab moves through the fields in order and reaches submit', { tag: '@positive' }, async ({ signupPage, browserName, isMobile }) => {
    // Skipped because Safari only Tabs to form controls when a system setting is on, and
    // mobile has no Tab key. Desktop Chromium and Firefox cover keyboard order.
    test.skip(browserName === 'webkit' || isMobile, 'Safari and mobile do not Tab to form controls by default');
    // Assumption: this is the visual order of the form, and nothing focusable (links, hidden
    // buttons, tooltips) sits between these fields. A new tab stop would fail this test.
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
    // The email is invalid on purpose so no account is created.
    // Assumption: client-side validation stops the submit, so a validation error proves Enter
    // triggered the submit, and zero requests proves nothing reached the backend.
    await signupPage.fill(validUser({ email: 'not-an-email' }));
    await signupPage.passwordConfirmation.press('Enter');
    await expect(signupPage.email).toHaveAttribute('aria-invalid', 'true');
    expect(requests()).toBe(0);
  });
});
