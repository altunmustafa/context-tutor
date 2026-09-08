# Context Tutor

Context Tutor is a small, self-hosted learning application for developers who study technical material. A user pastes plain text, optionally generates a concise summary, and creates a multiple-choice quiz grounded in that text. The application uses a React and TypeScript frontend, a stateless Go API, and a deployment-controlled catalog of Gemini Flash models.

The project is intentionally narrow. Its engineering goals are:

1. production-minded Go API design;
2. defensive LLM integration with structured output and deterministic validation;
3. a complete, accessible React user flow;
4. reproducible self-hosted delivery with Docker.

## Product principles

- Prefer a small, finished system over a broad feature set.
- Treat model output as untrusted data.
- Keep scoring and all deterministic rules outside the model.
- Keep application data in the browser and disclose when data leaves the device.
- Make operational and security limits explicit instead of implying guarantees the application cannot provide.
- Keep repository code, documentation, and user-facing interface text in English.
- Generate summaries and quizzes in the predominant language of the source text.

## Primary user

The primary user is a developer studying technical documentation or notes.

## User flow

1. The user pastes plain text into the content field.
2. The application loads the deployment's available model IDs and default model from the API. The user selects a model below the content field.
3. The user may generate a summary. Summary generation is optional and quiz generation does not depend on it.
4. The user selects a target question count and generates a quiz directly from the source text.
5. The model returns no more than the requested number of meaningful questions. It may return fewer questions rather than padding the quiz with repetitions. The interface reports the actual count before the user starts.
6. All questions appear on one page. The user answers them in any order with native radio controls.
7. When the user finishes the quiz, the application reports correct, incorrect, and unanswered counts; shows the correct option for every question; and displays an exact source quote supporting each correct answer.
8. Finished answers are locked. A new attempt requires quiz regeneration.
9. `New content` clears the complete workspace and returns focus to the content field.

The page keeps the visual order `content → optional summary → quiz → results`.

## Editing and regeneration behavior

- A source-text change marks existing summary and quiz artifacts as `Outdated` instead of deleting them.
- An outdated quiz remains usable. The user may not lose an in-progress attempt merely because the source text changed.
- Outdated artifacts remain visibly muted and explain that they were generated from an earlier version of the content.
- Regenerating a summary replaces only the summary.
- Regenerating a quiz replaces the quiz, answers, and result. If any of those contain meaningful work, the application asks for confirmation first.
- Changing the selected model does not mutate or mark existing artifacts as outdated. It affects the next generation request only.
- Changing the target question count does not mutate or mark the existing quiz as outdated. It affects the next quiz request only.
- Every generated artifact records and displays the model ID used to create it. A summary and quiz may use different models.
- While an LLM request is active, the content field, model selector, question-count field, generation controls, and `New content` action are disabled. Only one browser-side LLM request may be active at a time.

## Input and output limits

- Accepted input: pasted plain text only.
- Source length: 200–20,000 Unicode code points.
- Target question count: 1–10.
- Summary: 1–6 non-empty bullet points, each at most 300 Unicode code points.
- Source quote: a non-empty, contiguous, verbatim substring of the source, at most 300 Unicode code points.
- Inputs over a limit are rejected; they are never silently truncated.
- Client-side constraints improve usability, but the Go API independently enforces every security-relevant limit.

The maximum content length and quiz size are deployment configuration. The values above are the example defaults.

## Browser state

The browser stores one versioned workspace record under `context-tutor.workspace.v1`. It contains:

- source text and its content hash;
- selected model ID;
- generated summary, its source hash, and its model ID;
- draft target question count;
- quiz questions, options, correct-option indexes, and source quotes;
- the quiz source hash, requested count, actual count, and model ID;
- selected answers;
- completion state and score data.

The question-count draft is distinct from the requested count recorded on an existing quiz. A model selection restored from storage is used only if it still exists in the API-provided model catalog; otherwise the API-provided default is selected.

If stored state is malformed or has an unsupported schema version, the application removes that record, starts with an empty workspace, and informs the user. The first release does not implement storage migrations.

`New content` removes the entire workspace record after confirmation when meaningful work exists. No confirmation is needed for an empty workspace.

Correct answers are present in browser state before the quiz is finished. Context Tutor is a personal study aid, not a secure examination platform, and does not claim to prevent cheating.

## Data boundary and privacy

The server does not persist source text, summaries, quizzes, answers, or results. These values persist only in the user's browser. Source text still leaves the device during generation: it passes through the stateless Go API and is sent to the selected Gemini model.

Documentation must say that the application does not store content on its server. It must not claim that content stays on the user's device. The README links to Google's applicable Gemini API data terms rather than copying claims that may change.

## Architecture

### Components

- **React and TypeScript frontend:** owns the single-page workflow, versioned browser state, stale-artifact behavior, navigation-free quiz experience, and deterministic scoring.
- **`localStorage`:** provides browser-only workspace persistence and recovery after refresh.
- **Stateless Go API:** protects the Gemini API key, publishes the allowed model catalog, validates requests and model responses, enforces resource limits, and maps upstream failures to a stable application contract.
- **Gemini API:** generates structured summaries and quizzes from untrusted source text.
- **Static web server and reverse proxy:** serves the production frontend and forwards same-origin `/api` requests to Go.
- **Docker Compose:** starts the web and API containers on Linux with one documented command.

### Repository layout

```text
/
├── frontend/
│   ├── package.json
│   └── pnpm-lock.yaml
├── backend/
├── docs/
├── evals/
├── .github/
├── compose.yaml
├── Makefile
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── README.md
```

### Technology choices

- React, TypeScript, and Vite
- pnpm for frontend dependency management and commands
- React's built-in state mechanisms
- Native `fetch`
- Semantic HTML and plain CSS or CSS Modules
- ESLint and Prettier
- Go standard `net/http`
- Official `google.golang.org/genai` SDK
- `gofmt` and `go vet`
- Docker Compose and Linux containers
- A small `Makefile` for common contributor workflows

The frontend `package.json` defines the supported Node.js and pnpm versions and exposes frontend-specific commands. Its lockfile is stored in `frontend/pnpm-lock.yaml`. The root `Makefile` is the canonical entry point for repository-wide verification and invokes pnpm for the frontend and Go tooling for the backend.

## API contract

### Application endpoints

#### `GET /api/models`

Returns the deployment-controlled model catalog in configured order and the default model.

```json
{
  "models": [
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash"
  ],
  "defaultModel": "gemini-2.5-flash-lite"
}
```

The frontend loads its model catalog from this endpoint. If the request fails, locally stored work remains readable while model selection and generation stay unavailable until a user-controlled retry succeeds.

#### `POST /api/summary`

Accepts source text and an allowlisted model ID. It returns 1–6 concise summary points in the predominant language of the source and the model ID used.

```json
{
  "content": "Source text...",
  "model": "gemini-2.5-flash-lite"
}
```

```json
{
  "summary": ["First point", "Second point"],
  "model": "gemini-2.5-flash-lite"
}
```

#### `POST /api/quiz`

Accepts source text, a target count, and an allowlisted model ID. It returns no more than the requested count and records both requested and actual counts.

```json
{
  "content": "Source text...",
  "questionCount": 10,
  "model": "gemini-2.5-flash-lite"
}
```

```json
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctOptionIndex": 0,
      "sourceQuote": "An exact quote from the source text."
    }
  ],
  "requestedQuestionCount": 10,
  "actualQuestionCount": 1,
  "model": "gemini-2.5-flash-lite"
}
```

#### Errors

All errors use one safe response envelope:

```json
{
  "error": {
    "code": "MODEL_RATE_LIMITED",
    "message": "The model is temporarily unavailable.",
    "requestId": "request-id"
  }
}
```

The documented error mapping includes `400`, `413`, `429`, `502`, and `504`. Stable application codes distinguish invalid input, unsupported models, invalid model output, rate limits, upstream failures, and timeouts. Internal or provider-specific details are not returned to the browser.

### Operational endpoint

`GET /healthz` reports whether the Go process is ready to serve HTTP. It does not call Gemini or test the API key.

## Gemini model catalog

The model catalog is deployment-controlled:

```dotenv
GEMINI_MODELS=gemini-2.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.7-flash
DEFAULT_GEMINI_MODEL=gemini-2.5-flash-lite
```

The Go process trims entries, rejects empty items and duplicates, and fails at startup unless `DEFAULT_GEMINI_MODEL` belongs to `GEMINI_MODELS`. Incoming model IDs must match an entry exactly; arbitrary model passthrough is forbidden.

Operators may add or remove models without rebuilding the frontend. Every configured model must support structured JSON output and `thinking_level=low`. Startup validates configuration locally; an incompatible configured model fails safely at generation time with `MODEL_UNSUPPORTED`.

The API sends `thinking_level=low` for every generation request and uses provider defaults for `temperature`, `top_p`, and `top_k`. The UI displays configured API IDs exactly.

## Structured generation and validation

Source content is delimited and explicitly treated as untrusted data. System instructions tell the model not to follow instructions found inside the source. This reduces prompt-injection risk but is not presented as complete prevention.

Quiz instructions require:

- no more than the requested number of questions;
- exactly four distinct options per question;
- exactly one correct option;
- no padding through paraphrased or trivial repetitions;
- an empty question list when the text supports no meaningful question;
- one short, contiguous, verbatim source quote supporting each correct answer;
- output in the predominant language of the source.

The Go API rejects the entire model response unless all deterministic rules pass:

- valid JSON matching the expected schema;
- non-empty strings within documented size limits;
- question count not greater than the request;
- exactly four distinct, non-empty options;
- `correctOptionIndex` between `0` and `3`;
- no duplicate questions after simple normalization;
- every `sourceQuote` occurs byte-for-byte as a contiguous substring of the submitted source and is no longer than 300 Unicode code points.

Partial recovery is intentionally unsupported. For example, one invalid source quote causes the complete response to fail with `INVALID_MODEL_OUTPUT`; silently dropping it would confuse model failure with legitimate under-generation.

Verbatim quote matching proves that a quote exists in the source. It does not prove that the quote logically supports the answer. Semantic grounding, factual correctness, option quality, and semantic duplication remain model-quality concerns evaluated through prompts and manual evaluation. The project does not claim otherwise.

Scoring is deterministic and runs in the browser. It never requires another model call.

## Request lifecycle and failure behavior

- A browser allows one active generation request at a time.
- The server propagates request cancellation to the Gemini SDK.
- The server enforces an approximately 30-second upstream timeout.
- There is no automatic retry. The user controls retries through `Try again`.
- If the model returns fewer valid questions than requested, the UI reports the actual count before the quiz.
- If it returns zero questions, the UI explains that the content did not support a meaningful quiz.
- If capacity is exhausted, requests are rejected with `429`; they are not queued.

Because the content editor is disabled while generation is active, a response cannot race with a source edit. Request-scoped source hashes still associate each stored artifact with the content version from which it was generated.

## Result behavior

The user may leave questions unanswered and move freely among all questions. Before finishing, the UI reports the unanswered count and asks for confirmation when it is non-zero. Unanswered questions count toward the denominator but are reported separately from incorrect answers.

The result summary uses the form `7 / 10 · 70%` with separate correct, incorrect, and unanswered counts. Each question identifies the selected answer, the correct answer, and a `Source evidence` blockquote. State is conveyed with text and icons as well as color.

## Security and resource controls

- The Gemini API key exists only in the Go process environment. It never enters React build variables, frontend assets, logs, or the repository.
- Request bodies, source length, question count, generated strings, and output collections have server-side bounds.
- The HTTP server has explicit header, read, write, idle, and shutdown timeouts.
- The API applies an in-memory limit of 10 requests per minute per client IP by default.
- At most two Gemini calls run concurrently by default.
- Proxy-provided client IP headers are honored only when the deployment explicitly configures trusted proxies.
- Safe response headers and same-origin routing reduce browser attack surface. Cross-origin API access is disabled by default.
- Model responses are rendered as text. The application does not render model-provided HTML or Markdown.
- Errors do not expose secrets, prompts, upstream response bodies, or internal details.
- Source text, generated text, source quotes, answers, API keys, and client IP addresses are excluded from logs.

The in-memory rate limiter protects one process only. The application has no authentication and is intended for local, private-network, or externally protected deployment. It must not be described as safe to expose directly to an untrusted public network.

## Configuration

The server reads deployment settings from its environment. `.env` is ignored by Git and `.env.example` contains no secret.

Required or documented settings include:

- `GEMINI_API_KEY`
- `GEMINI_MODELS`
- `DEFAULT_GEMINI_MODEL`
- `MAX_CONTENT_LENGTH`
- `MAX_QUIZ_QUESTIONS`
- request timeout
- per-IP rate limit
- global Gemini concurrency limit
- trusted proxy configuration

Invalid configuration fails fast with an actionable startup error that contains no secret values.

## Logging and observability

The API writes structured JSON logs using the Go standard library. Request logs may contain:

- request ID;
- route and HTTP status;
- duration;
- model ID and model-error class;
- generated question count;
- numeric token usage when the SDK provides it.

The first release does not include Prometheus, OpenTelemetry, or an external log service.

## Accessibility and interface quality

- Content, model selection, and question count use visible labels and native form controls.
- Each question uses `<fieldset>` and `<legend>` with native radio inputs.
- Source evidence uses `<blockquote>` and appears only after the quiz is finished so it does not reveal answers early.
- Loading, empty, stale, error, success, and disabled states are communicated in text and not by color alone.
- Focus states are clearly visible.
- Destructive actions use an accessible native `<dialog>` confirmation.
- The single-column interface is responsive and supports current evergreen browsers without legacy polyfills.
- The first release has no theme system or interface localization.

## Docker deployment

The documented production path is `docker compose up --build` on Linux. The deployment uses separate web/reverse-proxy and Go API containers with same-origin `/api` routing.

Images use pinned base-image versions, multi-stage builds, non-root runtime users, healthchecks, minimal runtime contents, and read-only filesystems where practical. Container startup validates configuration before accepting traffic.

## Test strategy

### Automated tests

- Go unit tests cover configuration parsing, allowlisting, request validation, model-response validation, rate limits, and error mapping.
- `httptest` covers success and failure contracts for all API endpoints.
- The Gemini client sits behind a small interface with deterministic fakes; CI never requires a real API key.
- Vitest and React Testing Library cover state restoration, stale artifacts, model selection, generation states, scoring, and error handling.
- Playwright covers one complete mocked happy path and one mocked failure path.
- Docker images must build successfully in CI.

Coverage percentage is not a goal by itself. Tests target critical behavior and failure branches.

### LLM evaluations

The repository includes 5–8 short, original evaluation passages, including English, Turkish, insufficient content, repetitive content, and prompt-injection-like text. Evaluation data is written for this repository and distributed under its MIT license.

- `make eval` runs the dataset against `DEFAULT_GEMINI_MODEL`.
- `make eval-all` runs it against every entry in `GEMINI_MODELS`.
- Commands report the number of API calls before starting and warn that calls may incur charges. They do not prompt interactively.
- Reports include requested and actual question counts, schema pass rate, verbatim-quote match rate, normalized exact duplicates, latency, and SDK-provided token usage.
- A short human rubric covers factual correctness, whether the quote supports the correct answer, option quality, and semantic repetition.
- Model responses and historical evaluation results are not automatically committed.

## Continuous integration

GitHub Actions runs:

- frontend installation from `frontend/pnpm-lock.yaml` with pnpm's frozen-lockfile mode;
- frontend ESLint, Prettier check, typecheck, unit tests, and production build through pnpm;
- backend `gofmt` check, `go vet`, and tests;
- Playwright against mocked APIs;
- Docker image builds;
- dependency caching.

Dependabot is enabled. Real Gemini calls, CodeQL, a container registry, coverage services, and release automation are outside the first release.

## Documentation and open-source delivery

- `README.md`: value proposition, demo GIF, quick start, data flow, privacy boundary, security limits, and links to detailed docs.
- `docs/architecture.md`: component responsibilities, browser state model, request flow, and compact Mermaid diagrams.
- `docs/api.md`: request, response, validation, and error contracts.
- `SECURITY.md`: threat boundary, secret handling, supported security reports, and safe exposure guidance.
- `CONTRIBUTING.md`: a concise local-development and quality-check workflow.
- `.env.example`: non-secret configuration defaults.
- `LICENSE`: MIT.
- GitHub issue and pull-request templates.

The demo is a short GIF showing content entry, model selection, quiz generation, answering, and results in roughly 30 seconds.

## Explicit non-goals

- authentication, authorization, accounts, JWT, or OAuth;
- multiple saved workspaces or history;
- file upload, URL ingestion, or PDF parsing;
- streaming responses;
- chat;
- RAG, embeddings, or a vector database;
- shareable quiz links;
- server-side content or result persistence;
- non-Gemini model providers;
- secure-exam or anti-cheating behavior;
- a theme system or interface localization;
- PWA or offline operation;
- a hosted public demo;
- a mobile application.

## Implementation plan

### Phase 1 — Repository and contracts

1. Create the frontend and backend applications, frontend pnpm setup, repository tooling, and Docker development skeleton.
2. Define API DTOs, stable errors, configuration parsing, model catalog, and browser-state schema.
3. Add fake Gemini responses and contract fixtures before UI integration.

### Phase 2 — Browser workflow

1. Build the content, model, optional-summary, quiz, and result sections.
2. Implement versioned persistence, restoration, stale artifacts, regeneration confirmation, and `New content`.
3. Implement all-at-once quiz answering, deterministic scoring, evidence display, and accessibility states.
4. Add React unit/component tests and mocked Playwright flows.

### Phase 3 — Go and Gemini integration

1. Implement model-catalog, summary, quiz, and health endpoints.
2. Add the official Gemini client adapter, structured schemas, prompts, `thinking_level=low`, cancellation, and timeouts.
3. Add deterministic response validation, stable error mapping, rate limiting, concurrency limiting, and safe logging.
4. Cover endpoint and failure contracts with fakes and `httptest`.

### Phase 4 — Evaluation and hardening

1. Add the original evaluation dataset, automated measurements, and human rubric.
2. Verify configured models with manual eval runs.
3. Complete keyboard, screen-reader-semantic, responsive, privacy, and log-redaction checks.
4. Verify Docker startup, healthchecks, non-root execution, and clean Linux installation.

### Phase 5 — Open-source release

1. Complete the README, architecture, API, security, contributing, and license files.
2. Record the demo GIF using non-sensitive sample content.
3. Run the full CI-equivalent quality suite and perform a clean Compose installation.
4. Publish the repository and create a manually written `v0.1.0` GitHub release.

## Definition of Done

A vertical feature is complete only when:

- its main user path works;
- its loading, empty, error, and recovery states are implemented;
- it is usable by keyboard and has appropriate screen-reader semantics;
- relevant unit, HTTP, UI, or end-to-end tests exist;
- logs contain no sensitive content;
- the behavior works in the Docker deployment;
- user-visible behavior is reflected in the relevant documentation;
- lint, format, typecheck, tests, and builds pass.

The `v0.1.0` release is complete when all phases above meet this definition, the demo GIF is present, no API key or user content appears in the repository, and a fresh Linux host can start the application from the documented instructions.
