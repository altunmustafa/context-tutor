import type { QuizQuestion } from "../api/contracts";
import type { ScoreData } from "./model";

/** Missing answers count toward the denominator without counting as incorrect. */
export function calculateScore(questions: QuizQuestion[], answers: (number | null)[]): ScoreData {
  const score = {
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    total: questions.length,
  };
  questions.forEach((question, index) => {
    const answer = answers[index];
    if (answer === null || answer === undefined) score.unanswered++;
    else if (answer === question.correctOptionIndex) score.correct++;
    else score.incorrect++;
  });
  return score;
}
