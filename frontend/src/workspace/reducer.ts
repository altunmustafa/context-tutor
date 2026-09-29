import { sourceHash } from "./sourceHash";
import {
  createEmptyWorkspace,
  type CompletionState,
  type QuizArtifact,
  type SummaryArtifact,
  type WorkspaceV1,
} from "./model";

export type WorkspaceAction =
  | { type: "catalogLoaded"; models: string[]; defaultModel: string }
  | { type: "sourceChanged"; content: string }
  | { type: "modelSelected"; model: string }
  | { type: "questionCountChanged"; count: number }
  | { type: "answerSelected"; questionIndex: number; answer: number }
  | { type: "summaryGenerated"; summary: SummaryArtifact }
  | { type: "quizGenerated"; quiz: QuizArtifact }
  | { type: "completed"; completion: CompletionState }
  | { type: "reset"; selectedModel: string | null };

export function workspaceReducer(workspace: WorkspaceV1, action: WorkspaceAction): WorkspaceV1 {
  switch (action.type) {
    case "catalogLoaded": {
      const selectedModel =
        workspace.selectedModel && action.models.includes(workspace.selectedModel)
          ? workspace.selectedModel
          : action.defaultModel;

      return selectedModel === workspace.selectedModel
        ? workspace
        : { ...workspace, selectedModel };
    }
    case "sourceChanged":
      return {
        ...workspace,
        source: {
          content: action.content,
          hash: sourceHash(action.content),
        },
      };
    case "modelSelected":
      return { ...workspace, selectedModel: action.model };
    case "questionCountChanged":
      return { ...workspace, questionCountDraft: action.count };
    case "answerSelected":
      return {
        ...workspace,
        selectedAnswers: workspace.selectedAnswers.map((answer, index) =>
          index === action.questionIndex ? action.answer : answer,
        ),
      };
    case "summaryGenerated":
      return { ...workspace, summary: action.summary };
    case "quizGenerated":
      return {
        ...workspace,
        quiz: action.quiz,
        selectedAnswers: action.quiz.questions.map(() => null),
        completion: null,
      };
    case "completed":
      return { ...workspace, completion: action.completion };
    case "reset":
      return {
        ...createEmptyWorkspace(),
        selectedModel: action.selectedModel,
      };
  }
}
