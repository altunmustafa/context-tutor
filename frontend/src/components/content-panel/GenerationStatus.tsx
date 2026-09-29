import type { GenerationFailure, GenerationKind } from "./types";

interface GenerationStatusProps {
  activeGeneration: GenerationKind | null;
  generationFailure: GenerationFailure | null;
  canGenerate: boolean;
  onGenerate: (kind: GenerationKind) => void;
}

export function GenerationStatus({
  activeGeneration,
  generationFailure,
  canGenerate,
  onGenerate,
}: GenerationStatusProps) {
  return (
    <>
      <div role="status" aria-live="polite">
        {activeGeneration &&
          `Generating ${activeGeneration}… Controls will be available when the request finishes.`}
      </div>
      {generationFailure && (
        <div role="alert" className="notice">
          <p>{generationFailure.message}</p>
          <button disabled={!canGenerate} onClick={() => onGenerate(generationFailure.kind)}>
            Try again
          </button>
        </div>
      )}
    </>
  );
}
