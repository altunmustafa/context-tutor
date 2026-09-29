import { describe, expect, it } from "vitest";

import { createEmptyWorkspace } from "./model";
import { parseWorkspace } from "./parser";

const emptyWorkspace = createEmptyWorkspace();

describe("parseWorkspace", () => {
  it("rejects internally inconsistent quiz state", () => {
    expect(parseWorkspace({ ...emptyWorkspace, selectedAnswers: [0] })).toBeNull();
  });

  it("rejects a score that adds up but disagrees with the answers", () => {
    expect(
      parseWorkspace({
        ...emptyWorkspace,
        quiz: {
          questions: [
            {
              question: "Which?",
              options: ["A", "B", "C", "D"],
              correctOptionIndex: 0,
              sourceQuote: "A",
            },
          ],
          sourceHash: "",
          model: "model",
          requestedQuestionCount: 1,
          actualQuestionCount: 1,
        },
        selectedAnswers: [0],
        completion: {
          completedAt: "2026-09-21T12:00:00.000Z",
          score: { correct: 0, incorrect: 1, unanswered: 0, total: 1 },
        },
      }),
    ).toBeNull();
  });
});
