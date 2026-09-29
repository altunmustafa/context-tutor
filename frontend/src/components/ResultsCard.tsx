import { forwardRef } from "react";

import type { CompletionState } from "../workspace/model";

export const ResultsCard = forwardRef<
  HTMLElement,
  {
    completion: CompletionState | null;
  }
>(function ResultsCard({ completion }, ref) {
  if (!completion) return null;

  const percentage = completion.score.total
    ? Math.round((completion.score.correct / completion.score.total) * 100)
    : 0;

  return (
    <section ref={ref} tabIndex={-1} className="card results" aria-labelledby="results-heading">
      <h2 id="results-heading">Results</h2>
      <p className="score">
        {completion.score.correct} / {completion.score.total} · {percentage}%
      </p>
      <p>
        {completion.score.correct} correct · {completion.score.incorrect} incorrect ·{" "}
        {completion.score.unanswered} unanswered
      </p>
      <p>This attempt is locked. Regenerate the quiz to start a new attempt.</p>
    </section>
  );
});
