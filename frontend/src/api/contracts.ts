export interface ModelsResponse {
  models: string[];
  defaultModel: string;
}

export interface SummaryRequest {
  content: string;
  model: string;
}

export interface SummaryResponse {
  summary: string[];
  model: string;
}

export interface QuizRequest {
  content: string;
  questionCount: number;
  model: string;
}

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  sourceQuote: string;
}

export interface QuizResponse {
  questions: QuizQuestion[];
  requestedQuestionCount: number;
  actualQuestionCount: number;
  model: string;
}

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "CONTENT_TOO_SHORT"
  | "CONTENT_TOO_LONG"
  | "QUESTION_COUNT_OUT_OF_RANGE"
  | "UNSUPPORTED_MODEL"
  | "INVALID_MODEL_OUTPUT"
  | "MODEL_RATE_LIMITED"
  | "MODEL_UNSUPPORTED"
  | "UPSTREAM_FAILURE"
  | "UPSTREAM_TIMEOUT"
  | "CAPACITY_EXCEEDED";

export interface ApiErrorEnvelope {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
}
