# Phase 2 verification

Run these commands from the repository root. Browser tests use intercepted API responses; they do not call Gemini. Live model-catalog and generation handlers belong to Phase 3. Opening the development app without those handlers will show a catalog error and disable generation; this alone is not a Phase 2 regression.

## 1. Check code without opening a browser

```bash
make frontend-verify backend-verify
```

Expect formatting, lint, TypeScript, unit/component tests, frontend build, Go formatting, `go vet`, and Go tests to pass. This command does not run Playwright. `make verify` also runs browser tests.

## 2. Prepare the browser runner

Install dependencies if needed and install the Chromium build matching the locked Playwright version:

```bash
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend exec playwright install chromium
```

Use the runtimes specified in `frontend/package.json`. Linux needs Playwright's browser system dependencies. Resolve installation or missing-library errors before treating a failed browser launch as a product failure.

## 3. Run the mocked browser suite

```bash
make frontend-e2e
```

Keep the port in `frontend/playwright.config.ts` free. The runner builds the application, starts its preview server, and closes it after the tests. Expect four passing cases: a successful workflow and a failure/retry workflow, each in desktop and mobile Chromium.

The successful workflow checks summary and quiz generation, fewer-than-requested questions, evidence hidden before completion, keyboard radio selection, locked results, reload persistence, model changes, outdated artifacts, dialog cancellation with Escape, empty-workspace persistence after reset, focus return, and horizontal overflow.

The failure workflow checks timeout messaging, source preservation, no automatic retry, manual retry, and a valid empty quiz without a Finish action.

## 4. Inspect the desktop flow visibly

```bash
pnpm --dir frontend exec playwright test --project=chromium --headed --debug
```

Use Playwright Inspector's step and resume controls. Observe:

1. Content, summary, quiz, and results appear in that order.
2. Each question is a labelled radio group; Space selects the focused option.
3. Source evidence appears only after finishing.
4. Completion locks answers and moves focus to results.
5. Reload restores results. Changing the model does not mark artifacts outdated; changing the source does.
6. Opening the reset dialog focuses Cancel. Escape closes it and returns focus to New content.
7. Confirming reset stores an empty workspace and focuses Source text.
8. In the failure case, the source remains intact and retry happens only after Try again.

The route fixtures intentionally use fixed model IDs and counts. Arbitrarily changing generation settings while stepping through the scripted flow can make its fixture incompatible with the request; that is not a live-model test. Use component tests for additional model/count transitions.

## 5. Inspect the mobile layout

```bash
pnpm --dir frontend exec playwright test --project=mobile-chromium --headed --debug
```

Look for horizontal scrolling, clipped labels, overlapping generation controls, unreadable evidence, and hidden dialog actions. Check that state is communicated through text as well as color. Mobile Chromium emulation is not a substitute for a physical-device or screen-reader audit.

Completed-quiz screenshots are written under `frontend/test-results/`. Failed cases retain traces there; use the `playwright show-trace` command printed by the runner to inspect one.

## 6. Verify a running frontend deployment when needed

```bash
PLAYWRIGHT_BASE_URL=http://localhost:8080 pnpm --dir frontend test:e2e
```

Set the URL to the deployment you want to test. With this variable, Playwright does not start a preview server. The same mocked flows test the deployment's served frontend assets, not its backend or actual Gemini integration.

Record failures with the command, browser project, expected behavior, actual behavior, and relevant trace or screenshot. Broader screen-reader testing, real-provider evaluations, proxy/log privacy checks, and clean-host deployment checks remain separate work in the project plan.
