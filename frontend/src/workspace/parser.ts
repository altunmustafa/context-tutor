import type { QuizQuestion } from "../api/contracts";
import { isRecord } from "../utils/isRecord";
import { calculateScore } from "./score";
import { sourceHash } from "./sourceHash";
import {
  WORKSPACE_SCHEMA_VERSION,
  type CompletionState,
  type QuizArtifact,
  type ScoreData,
  type SummaryArtifact,
  type WorkspaceV1,
} from "./model";

function nonempty(value: unknown, max = 20_000): value is string {
  return typeof value === "string" && value.trim().length > 0 && Array.from(value).length <= max;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => nonempty(item, 300));
}

function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (!isRecord(value) || !Array.isArray(value.options) || value.options.length !== 4) {
    return false;
  }

  return (
    nonempty(value.question) &&
    value.options.every((option) => nonempty(option)) &&
    new Set(value.options.map((option) => String(option).trim().toLowerCase())).size === 4 &&
    Number.isInteger(value.correctOptionIndex) &&
    Number(value.correctOptionIndex) >= 0 &&
    Number(value.correctOptionIndex) <= 3 &&
    nonempty(value.sourceQuote, 300)
  );
}

function isSummary(value: unknown): value is SummaryArtifact | null {
  return (
    value === null ||
    (isRecord(value) &&
      isStringArray(value.points) &&
      value.points.length >= 1 &&
      value.points.length <= 6 &&
      typeof value.sourceHash === "string" &&
      typeof value.model === "string")
  );
}

function isQuiz(value: unknown): value is QuizArtifact | null {
  return (
    value === null ||
    (isRecord(value) &&
      Array.isArray(value.questions) &&
      value.questions.every(isQuizQuestion) &&
      typeof value.sourceHash === "string" &&
      Number.isInteger(value.requestedQuestionCount) &&
      Number(value.requestedQuestionCount) >= 1 &&
      Number(value.requestedQuestionCount) <= 10 &&
      Number.isInteger(value.actualQuestionCount) &&
      value.actualQuestionCount === value.questions.length &&
      Number(value.actualQuestionCount) <= Number(value.requestedQuestionCount) &&
      typeof value.model === "string")
  );
}

function isCompletion(value: unknown): value is CompletionState | null {
  if (value === null) return true;
  if (
    !isRecord(value) ||
    typeof value.completedAt !== "string" ||
    !Number.isFinite(Date.parse(value.completedAt)) ||
    !isRecord(value.score)
  ) {
    return false;
  }

  const score = value.score;
  const valuesAreCounts = ["correct", "incorrect", "unanswered", "total"].every(
    (key) => Number.isInteger(score[key]) && Number(score[key]) >= 0,
  );

  return (
    valuesAreCounts &&
    Number(score.correct) + Number(score.incorrect) + Number(score.unanswered) ===
      Number(score.total)
  );
}

export function parseWorkspace(value: unknown): WorkspaceV1 | null {
  if (!isRecord(value) || value.version !== WORKSPACE_SCHEMA_VERSION || !isRecord(value.source)) {
    return null;
  }

  const selectedAnswersAreValid =
    Array.isArray(value.selectedAnswers) &&
    value.selectedAnswers.every(
      (answer) =>
        answer === null || (Number.isInteger(answer) && Number(answer) >= 0 && Number(answer) <= 3),
    );

  if (
    typeof value.source.content !== "string" ||
    typeof value.source.hash !== "string" ||
    !(value.selectedModel === null || typeof value.selectedModel === "string") ||
    !isSummary(value.summary) ||
    !Number.isInteger(value.questionCountDraft) ||
    Number(value.questionCountDraft) < 1 ||
    Number(value.questionCountDraft) > 10 ||
    !isQuiz(value.quiz) ||
    !selectedAnswersAreValid ||
    !isCompletion(value.completion)
  ) {
    return null;
  }

  const workspace = value as unknown as WorkspaceV1;
  if (
    workspace.source.hash !== sourceHash(workspace.source.content) &&
    !(workspace.source.content === "" && workspace.source.hash === "")
  ) {
    return null;
  }
  if (
    (workspace.quiz === null && workspace.selectedAnswers.length !== 0) ||
    (workspace.quiz !== null &&
      workspace.selectedAnswers.length !== workspace.quiz.questions.length) ||
    (workspace.completion !== null && workspace.quiz === null) ||
    (workspace.completion !== null &&
      workspace.quiz !== null &&
      workspace.completion.score.total !== workspace.quiz.questions.length)
  ) {
    return null;
  }

  if (workspace.completion && workspace.quiz) {
    const expected = calculateScore(workspace.quiz.questions, workspace.selectedAnswers);
    if (
      (Object.keys(expected) as (keyof ScoreData)[]).some(
        (key) => expected[key] !== workspace.completion?.score[key],
      )
    ) {
      return null;
    }
  }

  return workspace;
}
