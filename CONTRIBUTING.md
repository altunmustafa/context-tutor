# Contributing to Context Tutor

Thanks for contributing. This guide takes a focused change from local setup through review. Ask in the issue or pull request when a project rule is unclear.

## Set up the repository

You need Git, Go, Node.js, pnpm, and Docker. Use the versions declared by the project manifests:

- `frontend/package.json` for Node.js and pnpm;
- `backend/go.mod` for Go;
- `compose.yaml` and the Dockerfiles for container tooling.

Install JavaScript dependencies from the repository root:

```bash
pnpm --dir frontend install
```

Use pnpm for the React application, either from `frontend/` or with `pnpm --dir frontend` from the repository root.

Copy `.env.example` to `.env` only when running the application or live LLM evaluations. Never commit an API key. Automated tests and CI use a fake Gemini client and do not require credentials.

Read [`docs/project-outline.md`](docs/project-outline.md) before changing product scope or public behavior. Read component, API, and security documentation when the files referenced by the outline are present.

## Create a focused branch

Start from the canonical repository's default branch and create a short-lived branch:

```text
<type>/<short-kebab-description>
```

Use one of the [commit types](#commit-messages) for `<type>`. Keep the description lowercase, omit contributor names, and include an issue number first when useful.

```text
feat/source-evidence
fix/123-stale-quiz-state
docs/api-errors
```

Keep one coherent outcome per branch and pull request. Use separate worktrees when working on multiple branches, and never check out one branch in two worktrees.

## Develop test-first

1. Add or update a failing test that describes the intended behavior.
2. Implement the smallest change that makes it pass.
3. Refactor without weakening the test or the documented constraints.
4. Update documentation when public behavior, API contracts, configuration, or security boundaries change.
5. Run focused checks while iterating and the complete verification before requesting review.

Keep the LLM adapter behind its interface and use a fake in automated tests. Do not add real Gemini calls to the default test suite or CI. Changes to prompts, schemas, or model-response validation should include relevant evaluation fixtures or rubric updates.

## Verify the change

Use the frontend `package.json`, backend Go tooling, and root `Makefile` as the sources of truth for available commands. The implemented repository must expose the following canonical check; run focused checks while iterating, then run it before requesting review:

```bash
make verify
```

The Make target invokes pnpm for frontend formatting, linting, type checking, tests, and the production build. It invokes Go tooling directly for backend formatting, static checks, and tests.

Check Docker image builds separately, with the environment configured as described above:

```bash
make docker-build
```

Start the Compose application, wait for its healthchecks, and stop it when finished:

```bash
make docker-up
make docker-down
```

The implementation plan in `docs/project-outline.md` tracks the end-to-end tests and live evaluations planned for later phases.

Report only checks you actually ran. If verification fails, fix the cause or clearly document the unresolved failure before requesting review.

## Commit messages

Use Conventional Commits:

```text
<type>[optional scope]: <description>
```

Choose the type that best describes the commit:

- `build`: build tooling or external dependency changes;
- `chore`: repository maintenance that does not affect source or test code;
- `ci`: CI/CD workflow or automation changes;
- `docs`: documentation-only changes;
- `feat`: a new user-facing capability;
- `fix`: a bug or incorrect behavior fix;
- `perf`: a performance improvement without a behavior change;
- `refactor`: a code-structure change without a feature or bug fix;
- `revert`: a reverted change;
- `style`: formatting that does not affect behavior;
- `test`: test additions or corrections.

Keep headers, body entries, and footers concise, and do not hard-wrap prose.

## Open a pull request

Before submission:

1. Review the complete branch diff against the default branch.
2. Confirm that tests and documentation match the final scope.
3. Describe the outcome, checks actually run, and known risks in the pull request body. Use the repository template when one is present.
4. Confirm that the pull-request title follows the Conventional Commit format.

Create the pull request with its final title and body. Do not use placeholders or hard-wrap prose. Update the body only when scope, validation, or risk materially changes.

After review begins, add correction commits instead of rewriting shared history. Pull requests are squash-merged so each reviewed change becomes one commit on the default branch.

## Releases

Maintainers create version tags and GitHub releases after the documented release checks pass. Do not create or move release tags unless a maintainer explicitly asks you to participate in a release.
