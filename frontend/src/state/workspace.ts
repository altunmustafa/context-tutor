import type { QuizQuestion } from "../api/contracts";

export const WORKSPACE_STORAGE_KEY = "context-tutor.workspace.v1";
export const WORKSPACE_SCHEMA_VERSION = 1 as const;

export interface SummaryArtifact {
  points: string[];
  sourceHash: string;
  model: string;
}

export interface QuizArtifact {
  questions: QuizQuestion[];
  sourceHash: string;
  requestedQuestionCount: number;
  actualQuestionCount: number;
  model: string;
}

export interface ScoreData {
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
}

export interface CompletionState {
  completedAt: string;
  score: ScoreData;
}

export interface WorkspaceV1 {
  version: typeof WORKSPACE_SCHEMA_VERSION;
  source: {
    content: string;
    hash: string;
  };
  selectedModel: string | null;
  summary: SummaryArtifact | null;
  questionCountDraft: number;
  quiz: QuizArtifact | null;
  selectedAnswers: (number | null)[];
  completion: CompletionState | null;
}

export type WorkspaceReadResult =
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "restored"; workspace: WorkspaceV1 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (
    !isRecord(value) ||
    !Array.isArray(value.options) ||
    value.options.length !== 4
  ) {
    return false;
  }

  return (
    typeof value.question === "string" &&
    value.options.every((option) => typeof option === "string") &&
    Number.isInteger(value.correctOptionIndex) &&
    Number(value.correctOptionIndex) >= 0 &&
    Number(value.correctOptionIndex) <= 3 &&
    typeof value.sourceQuote === "string"
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
      Number(value.actualQuestionCount) <=
        Number(value.requestedQuestionCount) &&
      typeof value.model === "string")
  );
}

function isCompletion(value: unknown): value is CompletionState | null {
  if (value === null) {
    return true;
  }

  if (
    !isRecord(value) ||
    typeof value.completedAt !== "string" ||
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
    Number(score.correct) +
      Number(score.incorrect) +
      Number(score.unanswered) ===
      Number(score.total)
  );
}

export function parseWorkspace(value: unknown): WorkspaceV1 | null {
  if (
    !isRecord(value) ||
    value.version !== WORKSPACE_SCHEMA_VERSION ||
    !isRecord(value.source)
  ) {
    return null;
  }

  const selectedAnswersAreValid =
    Array.isArray(value.selectedAnswers) &&
    value.selectedAnswers.every(
      (answer) =>
        answer === null ||
        (Number.isInteger(answer) &&
          Number(answer) >= 0 &&
          Number(answer) <= 3),
    );

  if (
    typeof value.source.content !== "string" ||
    typeof value.source.hash !== "string" ||
    !(
      value.selectedModel === null || typeof value.selectedModel === "string"
    ) ||
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

  return workspace;
}

export function readWorkspace(storage: Storage): WorkspaceReadResult {
  const storedValue = storage.getItem(WORKSPACE_STORAGE_KEY);

  if (storedValue === null) {
    return { status: "empty" };
  }

  try {
    const workspace = parseWorkspace(JSON.parse(storedValue) as unknown);

    if (workspace !== null) {
      return { status: "restored", workspace };
    }
  } catch {
    // The invalid record is removed below.
  }

  storage.removeItem(WORKSPACE_STORAGE_KEY);
  return { status: "invalid" };
}

export function writeWorkspace(storage: Storage, workspace: WorkspaceV1): void {
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}
