import { test, expect } from "@playwright/test";

const content =
  "A transaction groups changes into one unit. It either commits all changes or rolls them back. Isolation controls how concurrent transactions see each other's changes. Durability preserves committed changes after a restart.";
const question = {
  question: "What groups changes?",
  options: ["A transaction", "A file", "A view", "A key"],
  correctOptionIndex: 0,
  sourceQuote: "A transaction groups changes into one unit.",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/models", (route) =>
    route.fulfill({
      json: { models: ["model-a", "model-b"], defaultModel: "model-a" },
    }),
  );
});

test("complete study workflow, persistence, stale state and keyboard reset", async ({
  page,
}, testInfo) => {
  await page.route("**/api/summary", (route) =>
    route.fulfill({
      json: { summary: ["Transactions group changes."], model: "model-a" },
    }),
  );
  await page.route("**/api/quiz", (route) =>
    route.fulfill({
      json: {
        questions: [question],
        model: "model-a",
        requestedQuestionCount: 5,
        actualQuestionCount: 1,
      },
    }),
  );
  await page.goto("/");
  await page.getByLabel("Source text").fill(content);
  await page.getByRole("button", { name: "Generate summary", exact: true }).click();
  await expect(page.getByText("Transactions group changes.")).toBeVisible();
  await page.getByRole("button", { name: "Generate quiz", exact: true }).click();
  await expect(page.getByText("1 of 5 requested questions generated.")).toBeVisible();
  await expect(page.getByText("Source evidence")).toHaveCount(0);
  await page.getByRole("radio", { name: "A transaction", exact: true }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Finish quiz" }).click();
  await expect(page.getByText("1 / 1 · 100%")).toBeVisible();
  await expect(page.getByRole("radio").first()).toBeDisabled();
  await expect(page.getByText("Source evidence")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: testInfo.outputPath("completed-quiz.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByText("1 / 1 · 100%")).toBeVisible();
  await page.getByLabel("Generation model").selectOption("model-b");
  await expect(page.getByText(/Outdated/)).toHaveCount(0);
  await page.getByLabel("Source text").fill(`${content} More detail.`);
  await expect(page.getByText(/Outdated/)).toHaveCount(2);
  await page.getByRole("button", { name: "New content" }).click();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New content" })).toBeFocused();
  await page.getByRole("button", { name: "New content" }).click();
  await page.getByRole("button", { name: "Clear workspace" }).click();
  await expect(page.getByLabel("Source text")).toBeFocused();
  expect(
    await page.evaluate(() => {
      const stored = localStorage.getItem("context-tutor.workspace.v1");
      return stored ? JSON.parse(stored) : null;
    }),
  ).toMatchObject({
    source: { content: "", hash: "" },
    summary: null,
    quiz: null,
    selectedAnswers: [],
    completion: null,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("failure keeps source, manual retry handles empty output, and a new request never auto-retries", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/quiz", async (route) => {
    attempts++;
    await route.fulfill(
      attempts === 1
        ? {
            status: 504,
            json: {
              error: {
                code: "UPSTREAM_TIMEOUT",
                message: "sensitive provider details",
              },
            },
          }
        : {
            json: {
              questions: [],
              model: "model-a",
              requestedQuestionCount: 5,
              actualQuestionCount: 0,
            },
          },
    );
  });
  await page.goto("/");
  await page.getByLabel("Source text").fill(content);
  await page.getByRole("button", { name: "Generate quiz", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Generation timed out");
  await expect(page.getByLabel("Source text")).toHaveValue(content);
  expect(attempts).toBe(1);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText(/did not support a meaningful quiz/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish quiz" })).toHaveCount(0);
  expect(attempts).toBe(2);
});
