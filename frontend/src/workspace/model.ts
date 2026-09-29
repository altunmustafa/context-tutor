import type { QuizQuestion } from "../api/contracts";

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

export function createEmptyWorkspace(): WorkspaceV1 {
  return {
    version: WORKSPACE_SCHEMA_VERSION,
    source: { content: "", hash: "" },
    selectedModel: null,
    summary: null,
    questionCountDraft: 5,
    quiz: null,
    selectedAnswers: [],
    completion: null,
  };
}
