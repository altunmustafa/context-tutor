import { UserFacingError } from "../errors/UserFacingError";
import { isRecord } from "../utils/isRecord";
import type {
  ModelsResponse,
  QuizRequest,
  QuizResponse,
  SummaryRequest,
  SummaryResponse,
} from "./contracts";
import {
  HttpClient,
  HttpClientError,
  HttpNetworkError,
  HttpResponseError,
  HttpResponseParseError,
} from "./HttpClient";
import { parseModelsResponse, parseQuizResponse, parseSummaryResponse } from "./responseParsers";

const errorMessages: Record<string, string> = {
  INVALID_REQUEST: "Check the content and generation settings.",
  CONTENT_TOO_SHORT: "The source text is too short.",
  CONTENT_TOO_LONG: "The source text exceeds the server's content limit.",
  QUESTION_COUNT_OUT_OF_RANGE: "Choose a smaller question count.",
  UNSUPPORTED_MODEL: "This model is no longer available. Reload the model catalog.",
  INVALID_MODEL_OUTPUT: "The model returned an invalid response. Try again.",
  MODEL_RATE_LIMITED: "The model is temporarily rate limited. Try again later.",
  MODEL_UNSUPPORTED: "This model does not support the required generation settings.",
  UPSTREAM_FAILURE: "The model service is unavailable. Try again.",
  UPSTREAM_TIMEOUT: "Generation timed out. Try again.",
  CAPACITY_EXCEEDED: "The server is busy. Try again later.",
};

function throwUserFacingApiError(error: unknown): never {
  if (!(error instanceof HttpClientError)) throw error;

  if (error instanceof HttpNetworkError) {
    throw new UserFacingError(
      "The request could not be completed. Check your connection and try again.",
      { cause: error },
    );
  }
  if (error instanceof HttpResponseParseError) {
    throw new UserFacingError("The server returned an unreadable response. Try again.", {
      cause: error,
    });
  }

  if (!(error instanceof HttpResponseError)) throw error;

  const value = error.responseBody;
  const code =
    isRecord(value) && isRecord(value.error) && typeof value.error.code === "string"
      ? value.error.code
      : "";
  throw new UserFacingError(errorMessages[code] ?? "The request failed. Try again.", {
    cause: error,
  });
}

export class ContextTutorApi {
  constructor(private readonly httpClient: HttpClient) {}

  async getModels(signal: AbortSignal): Promise<ModelsResponse> {
    try {
      const value = await this.httpClient.get("models", signal);
      return parseModelsResponse(value);
    } catch (error) {
      throwUserFacingApiError(error);
    }
  }

  async generateSummary(input: SummaryRequest, signal: AbortSignal): Promise<SummaryResponse> {
    try {
      const value = await this.httpClient.post("summary", input, signal);
      return parseSummaryResponse(value, input);
    } catch (error) {
      throwUserFacingApiError(error);
    }
  }

  async generateQuiz(input: QuizRequest, signal: AbortSignal): Promise<QuizResponse> {
    try {
      const value = await this.httpClient.post("quiz", input, signal);
      return parseQuizResponse(value, input);
    } catch (error) {
      throwUserFacingApiError(error);
    }
  }
}
