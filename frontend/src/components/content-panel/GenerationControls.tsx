import { limits } from "../../api/limits";
import type { GenerationKind } from "./types";

interface GenerationControlsProps {
  questionCount: number;
  hasSummary: boolean;
  hasQuiz: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  onQuestionCountChange: (count: number) => void;
  onGenerate: (kind: GenerationKind) => void;
}

export function GenerationControls({
  questionCount,
  hasSummary,
  hasQuiz,
  isGenerating,
  canGenerate,
  onQuestionCountChange,
  onGenerate,
}: GenerationControlsProps) {
  return (
    <>
      <div className="generation-controls">
        <button disabled={!canGenerate} onClick={() => onGenerate("summary")}>
          {hasSummary ? "Regenerate summary" : "Generate summary"}
        </button>
        <div>
          <label htmlFor="question-count">Target questions</label>
          <select
            id="question-count"
            disabled={isGenerating}
            value={questionCount}
            onChange={(event) => onQuestionCountChange(Number(event.target.value))}
          >
            {Array.from({ length: limits.maxQuestions }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </div>
        <button className="primary" disabled={!canGenerate} onClick={() => onGenerate("quiz")}>
          {hasQuiz ? "Regenerate quiz" : "Generate quiz"}
        </button>
      </div>
      <p className="metadata">Summary is optional. Quizzes always use your source text.</p>
    </>
  );
}
