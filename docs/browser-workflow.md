# Browser workflow

The Phase 2 frontend implements the content → optional summary → quiz → results workflow in the [project outline](project-outline.md). Generation uses same-origin `/api` requests. Production model-catalog and generation handlers belong to Phase 3; the browser tests intercept those requests and never call Gemini.

## State and persistence

[`main.tsx`](../frontend/src/main.tsx) obtains the browser's native `Storage` object once, catches a denied storage getter, constructs `WorkspaceRepository`, and loads the workspace before rendering React. The repository owns serialization, schema validation, score verification, and exception handling. React owns the active workspace and saves every workspace change, including the initial and catalog-normalized values.

The repository exposes `load`, `save`, and `remove`. A load distinguishes `missing`, `loaded`, `invalid`, and `unavailable`. Invalid records are removed when possible; the result separately reports removal failure. Failed loads do not delete unread records. Saves and removals return `WorkspaceSaveResult` with `success` or `unavailable`. An unavailable repository still allows work in memory, with a visible warning about restoration, saving, or removal.

[`calculateScore`](../frontend/src/workspace/score.ts) is a pure function shared by completion and restoration. Correct, incorrect, unanswered, and total counts are recomputed from questions and selected answers. A stored score that differs is invalid even if its counts add up. Unsupported records follow reset-and-notify; there are no migrations.

Source fingerprints use deterministic 64-bit FNV-1a over Unicode code points. They identify source versions for stale-artifact presentation; they are not cryptographic, do not hide text, and are not a security or anti-tampering boundary. Hash collisions are theoretically possible. Storage also contains the original source text. Only one workspace is supported; simultaneous tabs are not synchronized.

## Editing and generation

Editing content retains artifacts and answers. Hash differences label the summary or quiz `Outdated`; an outdated attempt remains usable. Restoring the exact source makes the corresponding artifact current again. Model and target-count changes affect only the next request. Each artifact retains its generation model and requested/actual counts.

The catalog is deployment-controlled. Removed selections fall back to its default. Catalog failure leaves restored work readable and generation disabled, with a manual retry. The UI uses the outline's example input limits declared in [`limits.ts`](../frontend/src/api/limits.ts); the API contract does not expose deployment limits. A deployment with stricter limits must reject incompatible requests independently. Unicode code points are counted without truncating text.

Only one generation request can run in a browser. Content, generation settings, generation buttons, and reset are disabled during it. Existing quiz answers remain usable; a late summary response preserves those edits. Requests are aborted on unmount, have a browser timeout, and never retry automatically. Invalid or failed responses preserve previous artifacts. Provider messages are replaced with application-owned text.

Quiz regeneration confirms replacement when a nonempty quiz exists. Successful generation replaces the quiz, answers, and results; failed generation keeps them. Zero questions are a valid empty outcome and cannot be finished. Summary regeneration replaces only the summary.

## Completion and accessibility

Native radio groups use `fieldset` and `legend`. All questions appear together. Finishing with unanswered questions requires confirmation; they count toward the denominator separately from incorrect answers. Completion locks answers, displays correct options and verbatim evidence as text, and focuses results. Correct answers already exist in browser state, so this is a personal study tool, not a secure exam.

Confirmations use native modal `dialog`, focus the Cancel button, support Escape, and restore focus. Confirmed `New content` replaces the saved record with an empty workspace and focuses the content editor. Empty workspaces reset without confirmation. Stale, loading, error, empty, and answer states include visible text. Status and error messages use live-region semantics. Model output is rendered as text without HTML or Markdown interpretation.

## Verification boundaries

Vitest tests cover storage failures, score mismatches, response validation, and component transitions. Playwright runs mocked successful and failed flows on desktop Chromium and a mobile Chromium viewport, including real dialog dismissal and reload persistence. These tests do not prove Gemini quality, backend validation, screen-reader behavior across all assistive technologies, or production generation. See [CONTRIBUTING](../CONTRIBUTING.md) for commands and [Phase 2 verification](phase-2-testing.md) for the step-by-step browser checks.
