import { UserFacingError } from "../errors/UserFacingError";
import { isRecord } from "../utils/isRecord";
import type {
  ModelsResponse,
  QuizRequest,
  QuizResponse,
  SummaryRequest,
  SummaryResponse,
} from "./contracts";
import { codePointLength } from "./limits";

function text(value: unknown, max = 20_000): value is string {
  return typeof value === "string" && value.trim().length > 0 && codePointLength(value) <= max;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

export function parseModelsResponse(value: unknown): ModelsResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.models) ||
    value.models.length === 0 ||
    !value.models.every((model) => text(model, 200)) ||
    new Set(value.models).size !== value.models.length ||
    typeof value.defaultModel !== "string" ||
    !value.models.includes(value.defaultModel)
  ) {
    throw new UserFacingError("The model catalog is invalid. Try again.");
  }
  return value as unknown as ModelsResponse;
}

export function parseSummaryResponse(value: unknown, input: SummaryRequest): SummaryResponse {
  if (
    !isRecord(value) ||
    value.model !== input.model ||
    !Array.isArray(value.summary) ||
    value.summary.length < 1 ||
    value.summary.length > 6 ||
    !value.summary.every((point) => text(point, 300))
  ) {
    throw new UserFacingError("The model returned an invalid summary. Try again.");
  }
  return value as unknown as SummaryResponse;
}

export function parseQuizResponse(value: unknown, input: QuizRequest): QuizResponse {
  if (
    !isRecord(value) ||
    value.model !== input.model ||
    !Array.isArray(value.questions) ||
    value.requestedQuestionCount !== input.questionCount ||
    value.actualQuestionCount !== value.questions.length ||
    value.questions.length > input.questionCount
  ) {
    throw new UserFacingError("The model returned an invalid quiz. Try again.");
  }

  const seen = new Set<string>();
  for (const question of value.questions) {
    if (
      !isRecord(question) ||
      !text(question.question) ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      !question.options.every((option) => text(option)) ||
      new Set(question.options.map(normalize)).size !== 4 ||
      !Number.isInteger(question.correctOptionIndex) ||
      Number(question.correctOptionIndex) < 0 ||
      Number(question.correctOptionIndex) > 3 ||
      !text(question.sourceQuote, 300) ||
      !input.content.includes(question.sourceQuote) ||
      seen.has(normalize(question.question))
    ) {
      throw new UserFacingError("The model returned an invalid quiz. Try again.");
    }
    seen.add(normalize(question.question));
  }

  return value as unknown as QuizResponse;
}
