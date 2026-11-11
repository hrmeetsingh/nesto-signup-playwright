# nesto signup E2E suite

Playwright + TypeScript tests for the nesto signup page on QA (app.qa.nesto.ca), EN (/signup) and FR (/fr/signup).
README.md has setup, commands and coverage. This file is how to change the suite.

## Ground rules
- Tests hit the real backend. Requests are never mocked or routed.
- Every happy-path test signs up a fresh user via `validUser()` / `uniqueEmail()`. Reuse an email only to create a duplicate on purpose.
- QA accounts can't be deleted, so add account-creating tests only where they add coverage.

## Where code goes
- `tests/<type>/` holds specs only. Everything else lives in `src/`.
- Specs import `test` and `expect` from `src/fixtures.ts` (adds `signupPage`, `api`, `appLocale`).
- Locators live in page objects (`src/pages/`). Specs call page-object methods; assertions stay in specs.
- Values come from `src/data/users.ts`; UI text from `src/data/i18n.ts`. Every label or message is added in both en-CA and fr-CA.
- New invalid input = one row in `INVALID_CASES` that breaks exactly one rule; the negative spec loops over it.
- A new test type gets its own `tests/<type>/` folder and a project in `playwright.config.ts` (projects select specs by file-name regex).

## Writing tests
- Locate by role, label, text or test id (`data-testid`), with `exact: true` on names.
- Assert with web-first `expect(locator)`; wait on a state (locator, response, URL), never on a timer.
- Tag each test with its kind (`@positive` / `@negative`) and area (`@api`, `@a11y`, `@visual`, `@perf`).
- Comments use `//`. State any assumption the test relies on with an `Assumption:` comment.
- Check playwright.dev before using a Playwright API you're unsure of.

## App behaviour behind the existing code
- **Hydration:** before the page hydrates every input has `id="field-1"` and a submit is silently ignored. Open the page with `signupPage.goto()` (waits for Confirm password + networkidle).
- **Province** is pre-selected from the visitor's IP; always select `QC`.
- **Success** = 201 from `POST /api/accounts`, then a redirect to auth.qa.nesto.ca that can take >5 s; give that URL assertion `timeout: 30_000`.
- **Field errors** are linked by `aria-describedby`; use `signupPage.fieldError(field)`.
- **Server error** is a Toastify toast that closes after ~5 s. The page also has an empty `role="alert"` (Next.js route announcer), so find the toast by its text. For screenshots, hover it to pause the timer and use `animations: 'allow'`.
- **Firefox + axe:** rules `label` and `select-name` crash the page; they're disabled there with an annotation. Detect Firefox via `page.context().browser()?.browserType().name()` (device presets leave `browserName` empty).
- **Known app bugs** (backend skips name/phone/password validation, `{}` body → 500, 11+ digit phones accepted, FR phone-country label in English) are reported in `Bug Report/`. The suite deliberately has no tests for them, so it stays green and catches regressions.

## Versions and environments
- Dependencies are pinned exactly. The Playwright version appears in three places that move together: `package.json`, the Docker image tag in `package.json` scripts, and `.github/workflows/playwright.yml`.
- `lighthouse` stays on 12.x (13.x needs Node ≥ 22.19); the Allure CLI needs Node ≥ 22.18 (`.nvmrc`).
- Visual baselines are generated and compared only in Docker (`npm run test:visual`, `test:visual:update`). Review the diff images before committing new baselines.

## Done means
- `npm run typecheck` passes.
- `npx playwright test <changed spec> --project=chromium --repeat-each=3` passes; UI-text changes also pass on `chromium-fr`.
- README.md is updated when commands, coverage or structure change.
