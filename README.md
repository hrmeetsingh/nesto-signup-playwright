# nesto signup: E2E test suite

An automated test suite for the nesto **signup page** on the QA environment, in English (`/signup`) and French (`/fr/signup`), at `https://app.qa.nesto.ca`.

The suite is written with Playwright and TypeScript. Every test talks to the real backend: there are no mocks and no request interception. Each happy-path test creates a new, real account in QA. In total the suite runs about **270 tests** across desktop browsers, mobile devices, the API, accessibility, visual and performance checks.

---

## Tech stack

### Manual testing

| Tool | Used for |
|---|---|
| **Google Chrome** | Exploring the signup form in EN and FR; DevTools to watch the network calls, the DOM and the accessibility tree |
| **Mozilla Firefox** | The same exploration in a second browser engine, to spot browser-specific behaviour |
| **Bruno** | Calling `POST /api/accounts` directly to see what the backend accepts and rejects, independently of the UI |

### Automation

| Tool | Version | Used for |
|---|---|---|
| [Playwright Test](https://playwright.dev) | 1.65.0 | Test runner, browsers (Chromium, Firefox, WebKit) and mobile emulation (Pixel 7, iPhone 15) |
| TypeScript | 7.0 | Test code, type-checked with `npm run typecheck` |
| Node.js | ≥ 22.18 | Runtime (pinned in `.nvmrc`) |
| [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) | 4.14 | Accessibility scans (WCAG 2.1 A/AA) |
| [Lighthouse](https://github.com/GoogleChrome/lighthouse) | 12.8 | Performance, accessibility, best-practices and SEO scores |
| Playwright screenshots | built in | Visual regression against committed baselines |
| [Allure Report 3](https://allurereport.org) | `allure` 3.33, `allure-playwright` 3.14 | Rich HTML report with history and trends |
| Playwright HTML report | built in | Quick local report with traces, screenshots and videos |
| Docker (`mcr.microsoft.com/playwright:v1.65.0-noble`) | 1.65.0 | Same rendering everywhere for visual tests; also the CI container |
| GitHub Actions + GitHub Pages | n/a | CI on every push and pull request; publishes the Allure report |

---

## Testing approach: explore first, then automate

**1. Manual exploration of the signup page.**
Before writing any automation, I went through the signup page by hand in Chrome and Firefox, in both English and French, to get familiar with it:

- the fields, their labels in each language, and which ones are required or optional;
- the validation rules (name characters and length, phone format, email format, password length and complexity, password confirmation) and the exact error message for each, in EN and FR;
- what happens on a successful signup (`201` from `POST /api/accounts`, then a redirect to the auth page);
- what happens on failure (a generic error toast for a duplicate email), keyboard and tab order, and focus after an invalid submit.

**2. Manual API exploration with Bruno.**
I called `POST /api/accounts` directly to learn the request body the UI sends and how the backend responds: `201` for a valid account, `400` for a duplicate email or wrong `Content-Type`, `422` for an invalid email or region. This also showed which rules are enforced only in the browser and not by the backend.

**3. Turning the findings into automation.**
The findings from both steps shaped the suite:

- the valid, boundary and invalid values in `src/data/users.ts` (each invalid value breaks exactly one rule);
- the EN and FR labels and error messages in `src/data/i18n.ts`;
- the page object's behaviour, for example waiting for the page to finish loading before typing (an early submit is silently ignored) and handling the auto-closing error toast;
- then the specs themselves, listed below.

---

## What is automated

### Requested scope

The assignment asked for positive and negative signup scenarios with a focus on the `201` API response, runnable against both the English and French pages.

| Area | What is checked | Spec |
|---|---|---|
| **Positive** | Fill the form with a valid user and submit → `POST /api/accounts` returns **201**, the request body contains what was typed, and the page redirects away from `/signup` | `tests/e2e/signup.positive.spec.ts` |
| **Boundary values** | Same flow with edge values: 12- and 32-character passwords, a 63-character name, accented and hyphenated names (`Émilie`, `Jean-Luc`, `O'Brien`) | `tests/e2e/signup.positive.spec.ts` |
| **Negative: validation** | One invalid field per test (names, phone, email, password, confirmation): the right error message shows in the active language, the field is marked invalid, and **no** request is sent | `tests/e2e/signup.negative.spec.ts` |
| **Negative: form-level** | Empty form shows every required error; a double click sends only one request; an already-registered email shows the server error | `tests/e2e/signup.negative.spec.ts` |
| **API** | Valid user → 201 (with no password in the response); duplicate email → 400; invalid email or region → 422; wrong `Content-Type` → 400 | `tests/api/signup.api.spec.ts` |
| **English and French** | All UI tests run on `/signup` and, through the `chromium-fr` project, on `/fr/signup` with French labels and messages | `playwright.config.ts` (`appLocale`) |

### Additional coverage

Beyond the requested scenarios, I added these checks to widen coverage:

| Area | What is checked | Spec |
|---|---|---|
| **Accessibility** | axe scans (WCAG 2.1 A/AA) on page load and after an invalid submit, with serious or critical issues failing the test; errors linked to their inputs; focus moves to the first invalid field; Tab order follows the form; Enter submits | `tests/a11y/signup.a11y.spec.ts` |
| **Google Lighthouse** | EN and FR pages must reach minimum scores: Performance 70, Accessibility 90, Best Practices 90, SEO 80. The HTML report is attached to each test | `tests/perf/signup.perf.spec.ts` |
| **Visual regression** | Full-page screenshots compared with baselines: empty form (EN, FR), validation errors (EN, FR), filled form, and the server-error toast | `tests/visual/signup.visual.spec.ts` |
| **Cross-browser and mobile** | The e2e and accessibility specs run on Chromium, Firefox, WebKit, Pixel 7 and iPhone 15 | `playwright.config.ts` |

### Playwright projects

| Project | Browser / device | Runs |
|---|---|---|
| `api` | none (HTTP only) | API spec |
| `chromium`, `firefox`, `webkit` | Desktop Chrome, Firefox, Safari | positive, negative, accessibility |
| `pixel-7`, `iphone-15` | Mobile emulation | positive, negative, accessibility |
| `chromium-fr` | Desktop Chrome, French page | positive, negative, accessibility |
| `visual` | Desktop Chrome | visual spec |
| `perf` | Desktop Chrome (one worker) | Lighthouse spec |

---

## AI assistance

I used **Claude Opus 5.5** (Anthropic), through Claude Code, to scaffold and set up this project and its documentation 

The testing itself (manual exploration of the signup page in English and French, the API exploration in Bruno, the choice of scenarios and the bug report) is my own work, and I reviewed and ran every test in the suite. The type of coverage and organization of framework is decided by me and I can explain the rational behind the choices.

---

## Bug report

Issues found during manual and automated testing are written up in the [**`Bug Report`**](Bug%20Report/) folder. The suite deliberately doesn't include failing tests for those bugs, so it stays green and catches regressions.

---

## Project structure

```
src/                         # support code (no tests)
  fixtures.ts                # extends Playwright's `test` with signupPage, api, appLocale
  pages/
    BasePage.ts              # shared header + open(path) with a ready check
    SignupPage.ts            # signup form locators and actions
  api/SignupApi.ts           # direct calls to POST /api/accounts
  data/
    i18n.ts                  # EN/FR labels, error messages, paths
    users.ts                 # valid, boundary and invalid test data
tests/                       # specs only, one folder per test type
  e2e/                       # positive + negative business flows
  api/
  a11y/
  visual/                    # + baselines/ (committed screenshots)
  perf/
playwright.config.ts         # projects, reporters, base URL
allurerc.mjs                 # Allure report config
.github/workflows/playwright.yml
Bug Report/                  # bug report for the issues found
```

---

## Running the suite

### 1. Prerequisites

- **Node.js 22.18 or newer.** With nvm: `nvm install && nvm use` (reads `.nvmrc`).
- **Docker**, only for the visual tests.
- Network access to `https://app.qa.nesto.ca`.

### 2. Install

```bash
npm ci
npx playwright install --with-deps
```

### 3. Configure (optional)

The suite targets `https://app.qa.nesto.ca` by default and needs no secrets. To point it at another environment, set `BASE_URL`:

```bash
BASE_URL=https://another-env.example npx playwright test
```

### 4. Run the tests

| Command | What it runs |
|---|---|
| `npm test` | Everything: all projects and all browsers |
| `npm run test:api` | API tests only |
| `npm run test:fr` | Positive, negative and accessibility tests on the French page (Chromium) |
| `npm run test:a11y` | Accessibility tests on every browser |
| `npm run test:perf` | Lighthouse tests (about 1–2 minutes) |
| `npm run test:visual` | Visual tests, inside the Playwright Docker image |
| `npm run test:visual:update` | Regenerate the visual baselines (in Docker; review the diffs before committing) |
| `npm run typecheck` | Type-check the code without running tests |

Useful variations:

```bash
# One browser only
npx playwright test --project=chromium

# One test by name
npx playwright test -g "valid user creates an account" --project=chromium

# One test type on one browser
npx playwright test tests/e2e --project=firefox

# Watch the browser while it runs
npx playwright test --project=chromium --headed

# Step through a test in the Playwright UI
npx playwright test --ui
```

> **Visual tests must run in Docker.** Baselines are generated inside `mcr.microsoft.com/playwright:v1.65.0-noble`, and fonts render differently on macOS and Windows, so a local (non-Docker) run will report differences.

### 5. View the reports

**Playwright HTML report** (written after every run):

```bash
npm run report
```

**Allure report**, with history, tags, attachments (axe JSON, Lighthouse HTML) and failure screenshots, videos and traces:

```bash
# Clean, run everything, build and open the report
npm run test:allure

# Or for a subset, e.g. the API tests
npm run allure:clean
npx playwright test --project=api
npm run allure:generate
npm run allure:open
```

Allure results build up across runs, so run `npm run allure:clean` before a fresh report.

### 6. Continuous integration

`.github/workflows/playwright.yml` runs on every push and pull request to `main`, and on manual dispatch. It runs inside the same Playwright Docker image, so the visual baselines match.

1. `npm ci` and `npm run typecheck`
2. API tests first (a fast check that the backend contract still holds), then every other test
3. Uploads the Playwright report and test results as build artifacts
4. Builds the Allure report with history from previous runs. On `main` it is published to GitHub Pages; pull requests get it as a downloadable artifact.

One-time setup for the published report: in the GitHub repository, go to **Settings → Pages → Source** and select **GitHub Actions**.

---

## Notes

- **Real accounts.** Every successful signup creates a real QA account with an email like `assignment+<timestamp>-…@harmeet.test`. There's no delete endpoint, so these accounts stay in QA.
- **Province** is pre-selected from the visitor's IP, so tests always select `QC` explicitly.
- **Lighthouse performance** scores vary by machine and network, so expect them to move a few points between runs, especially on shared CI runners.
- **Retries.** On CI each failing test is retried up to twice, and a trace is recorded on the first retry.
