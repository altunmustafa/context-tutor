import type { RefObject } from "react";

import type { ModelsResponse } from "../../api/contracts";
import type { WorkspaceV1 } from "../../workspace/model";
import { GenerationControls } from "./GenerationControls";
import { GenerationStatus } from "./GenerationStatus";
import { ModelSelector } from "./ModelSelector";
import { SourceEditor } from "./SourceEditor";
import type { GenerationFailure, GenerationKind } from "./types";

export type { GenerationFailure, GenerationKind } from "./types";

interface ContentPanelProps {
  source: WorkspaceV1["source"];
  selectedModel: string | null;
  questionCount: number;
  hasSummary: boolean;
  hasQuiz: boolean;
  catalog: ModelsResponse | null;
  catalogError: string | null;
  activeGeneration: GenerationKind | null;
  generationFailure: GenerationFailure | null;
  contentLength: number;
  contentIsValid: boolean;
  canGenerate: boolean;
  contentFieldRef: RefObject<HTMLTextAreaElement | null>;
  onNewContent: () => void;
  onSourceChange: (content: string) => void;
  onModelChange: (model: string) => void;
  onQuestionCountChange: (count: number) => void;
  onGenerate: (kind: GenerationKind) => void;
  onRetryCatalog: () => void;
}

export function ContentPanel({
  source,
  selectedModel,
  questionCount,
  hasSummary,
  hasQuiz,
  catalog,
  catalogError,
  activeGeneration,
  generationFailure,
  contentLength,
  contentIsValid,
  canGenerate,
  contentFieldRef,
  onNewContent,
  onSourceChange,
  onModelChange,
  onQuestionCountChange,
  onGenerate,
  onRetryCatalog,
}: ContentPanelProps) {
  return (
    <section className="card" aria-labelledby="content-heading">
      <div className="section-header">
        <h2 id="content-heading">Your content</h2>
        <button disabled={activeGeneration !== null} onClick={onNewContent}>
          New content
        </button>
      </div>
      <SourceEditor
        content={source.content}
        contentLength={contentLength}
        contentIsValid={contentIsValid}
        disabled={activeGeneration !== null}
        contentFieldRef={contentFieldRef}
        onSourceChange={onSourceChange}
      />
      <ModelSelector
        selectedModel={selectedModel}
        catalog={catalog}
        catalogError={catalogError}
        disabled={activeGeneration !== null}
        onModelChange={onModelChange}
        onRetryCatalog={onRetryCatalog}
      />
      <GenerationControls
        questionCount={questionCount}
        hasSummary={hasSummary}
        hasQuiz={hasQuiz}
        isGenerating={activeGeneration !== null}
        canGenerate={canGenerate}
        onQuestionCountChange={onQuestionCountChange}
        onGenerate={onGenerate}
      />
      <GenerationStatus
        activeGeneration={activeGeneration}
        generationFailure={generationFailure}
        canGenerate={canGenerate}
        onGenerate={onGenerate}
      />
    </section>
  );
}
