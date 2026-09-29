import { describe, expect, it } from "vitest";
import type { QuizQuestion } from "../api/contracts";
import { calculateScore } from "./score";

const question: QuizQuestion = {
  question: "Which?",
  options: ["A", "B", "C", "D"],
  correctOptionIndex: 2,
  sourceQuote: "C",
};
describe("calculateScore", () => {
  it("separates incorrect and missing answers and keeps every question in the total", () => {
    expect(
      calculateScore(
        Array.from({ length: 4 }, () => question),
        [2, 0, null],
      ),
    ).toEqual({ correct: 1, incorrect: 1, unanswered: 2, total: 4 });
  });
  it("handles an empty quiz", () => {
    expect(calculateScore([], [])).toEqual({
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      total: 0,
    });
  });
});
