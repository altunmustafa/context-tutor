import { useEffect, useReducer, useRef, useState } from "react";

import type { ContextTutorApi } from "./api/ContextTutorApi";
import type { ModelsResponse } from "./api/contracts";
import { codePointLength, limits } from "./api/limits";
import { Confirmation } from "./components/Confirmation";
import {
  ContentPanel,
  type GenerationFailure,
  type GenerationKind,
} from "./components/content-panel/ContentPanel";
import { Quiz } from "./components/Quiz";
import { ResultsCard } from "./components/ResultsCard";
import { SummaryCard } from "./components/SummaryCard";
import { DEFAULT_USER_FACING_ERROR_MESSAGE, UserFacingError } from "./errors/UserFacingError";
import type { WorkspaceV1 } from "./workspace/model";
import { workspaceReducer } from "./workspace/reducer";
import type { WorkspaceRepository } from "./workspace/repository";
import { calculateScore } from "./workspace/score";
import { useWorkspacePersistence } from "./workspace/useWorkspacePersistence";

type ConfirmAction = "reset" | "quiz" | "finish";

export function App({
  apiClient,
  workspaceRepository,
  initialWorkspace,
  initialStorageNotice,
}: {
  apiClient: ContextTutorApi;
  workspaceRepository: WorkspaceRepository;
  initialWorkspace: WorkspaceV1;
  initialStorageNotice: string | null;
}) {
  const [workspace, dispatchWorkspace] = useReducer(workspaceReducer, initialWorkspace);
  const [catalog, setCatalog] = useState<ModelsResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [active, setActive] = useState<GenerationKind | null>(null);
  const [failure, setFailure] = useState<GenerationFailure | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);
  const request = useRef<AbortController | null>(null);
  const contentField = useRef<HTMLTextAreaElement>(null);
  const results = useRef<HTMLElement>(null);
  const focusContent = useRef(false);
  const storageNotice = useWorkspacePersistence({
    repository: workspaceRepository,
    workspace,
    initialNotice: initialStorageNotice,
  });

  useEffect(() => {
    const controller = new AbortController();
    void apiClient
      .getModels(controller.signal)
      .then((models) => {
        if (controller.signal.aborted) return;
        setCatalog(models);
        dispatchWorkspace({
          type: "catalogLoaded",
          models: models.models,
          defaultModel: models.defaultModel,
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setCatalogError(
            error instanceof UserFacingError ? error.message : DEFAULT_USER_FACING_ERROR_MESSAGE,
          );
        }
      });
    return () => controller.abort();
  }, [apiClient, catalogAttempt]);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (workspace.completion) results.current?.focus();
  }, [workspace.completion]);

  useEffect(() => {
    if (confirmation === null && focusContent.current) {
      contentField.current?.focus();
      focusContent.current = false;
    }
  }, [confirmation, workspace]);

  const contentLength = codePointLength(workspace.source.content);
  const contentIsValid = contentLength >= limits.minContent && contentLength <= limits.maxContent;
  const canGenerate =
    contentIsValid && catalog !== null && workspace.selectedModel !== null && !active;
  const meaningfulWork =
    workspace.source.content.length > 0 || workspace.summary !== null || workspace.quiz !== null;

  async function generate(kind: GenerationKind) {
    if (request.current || !canGenerate || !workspace.selectedModel) return;
    const model = workspace.selectedModel;
    const controller = new AbortController();
    request.current = controller;
    setActive(kind);
    setFailure(null);
    const snapshot = workspace;
    try {
      const input = {
        content: snapshot.source.content,
        model,
      };
      if (kind === "summary") {
        const response = await apiClient.generateSummary(input, controller.signal);
        if (!controller.signal.aborted) {
          dispatchWorkspace({
            type: "summaryGenerated",
            summary: {
              points: response.summary,
              sourceHash: snapshot.source.hash,
              model: response.model,
            },
          });
        }
      } else {
        const response = await apiClient.generateQuiz(
          { ...input, questionCount: snapshot.questionCountDraft },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          dispatchWorkspace({
            type: "quizGenerated",
            quiz: { ...response, sourceHash: snapshot.source.hash },
          });
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setFailure({
          kind,
          message:
            error instanceof UserFacingError ? error.message : DEFAULT_USER_FACING_ERROR_MESSAGE,
        });
      }
    } finally {
      if (!controller.signal.aborted) setActive(null);
      request.current = null;
    }
  }

  function askGeneration(kind: GenerationKind) {
    if (kind === "quiz" && workspace.quiz && workspace.quiz.questions.length > 0) {
      setConfirmation("quiz");
    } else {
      void generate(kind);
    }
  }

  function reset() {
    dispatchWorkspace({
      type: "reset",
      selectedModel: catalog?.defaultModel ?? null,
    });
    setFailure(null);
    focusContent.current = true;
    setConfirmation(null);
  }

  function finish() {
    if (!workspace.quiz || workspace.completion) return;
    dispatchWorkspace({
      type: "completed",
      completion: {
        completedAt: new Date().toISOString(),
        score: calculateScore(workspace.quiz.questions, workspace.selectedAnswers),
      },
    });
  }

  function confirm() {
    const action = confirmation;
    setConfirmation(null);
    if (action === "reset") reset();
    else if (action === "quiz") void generate("quiz");
    else finish();
  }

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Source-grounded study</p>
        <h1>Context Tutor</h1>
        <p className="lede">Understand your notes. Test what stays.</p>
      </header>
      <main>
        <p className="privacy">
          Work is saved in this browser. During generation, source text is sent through the server
          to Gemini. The application does not store content on its server.
        </p>
        {storageNotice && (
          <p role="alert" className="notice">
            {storageNotice}
          </p>
        )}
        <ContentPanel
          source={workspace.source}
          selectedModel={workspace.selectedModel}
          questionCount={workspace.questionCountDraft}
          hasSummary={workspace.summary !== null}
          hasQuiz={workspace.quiz !== null}
          catalog={catalog}
          catalogError={catalogError}
          activeGeneration={active}
          generationFailure={failure}
          contentLength={contentLength}
          contentIsValid={contentIsValid}
          canGenerate={canGenerate}
          contentFieldRef={contentField}
          onNewContent={() => (meaningfulWork ? setConfirmation("reset") : reset())}
          onSourceChange={(content) => dispatchWorkspace({ type: "sourceChanged", content })}
          onModelChange={(model) => dispatchWorkspace({ type: "modelSelected", model })}
          onQuestionCountChange={(count) =>
            dispatchWorkspace({ type: "questionCountChanged", count })
          }
          onGenerate={askGeneration}
          onRetryCatalog={() => {
            setCatalogError(null);
            setCatalogAttempt((attempt) => attempt + 1);
          }}
        />
        <SummaryCard summary={workspace.summary} currentSourceHash={workspace.source.hash} />
        <Quiz
          quiz={workspace.quiz}
          selectedAnswers={workspace.selectedAnswers}
          completion={workspace.completion}
          currentSourceHash={workspace.source.hash}
          onAnswer={(questionIndex, answer) =>
            dispatchWorkspace({
              type: "answerSelected",
              questionIndex,
              answer,
            })
          }
          onFinish={() =>
            workspace.selectedAnswers.includes(null) ? setConfirmation("finish") : finish()
          }
        />
        <ResultsCard ref={results} completion={workspace.completion} />
      </main>
      <footer>
        Personal study, at your pace. Answers are stored in your browser; this is not a secure
        examination platform.
      </footer>
      {confirmation && (
        <Confirmation
          title={
            confirmation === "reset"
              ? "Clear this workspace?"
              : confirmation === "quiz"
                ? "Replace this quiz?"
                : "Finish with unanswered questions?"
          }
          message={
            confirmation === "reset"
              ? "This removes your content, summary, quiz, answers, and results."
              : confirmation === "quiz"
                ? "A successful generation replaces the quiz, answers, and results. If it fails, your existing work is kept."
                : `${workspace.selectedAnswers.filter((answer) => answer === null).length} questions are unanswered. They count toward the total. Answers will be locked.`
          }
          confirmLabel={
            confirmation === "reset"
              ? "Clear workspace"
              : confirmation === "quiz"
                ? "Replace quiz"
                : "Finish attempt"
          }
          onCancel={() => setConfirmation(null)}
          onConfirm={confirm}
        />
      )}
    </>
  );
}
