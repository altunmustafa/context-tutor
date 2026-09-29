import type { CompletionState, QuizArtifact } from "../workspace/model";

export function Quiz({
  quiz,
  selectedAnswers,
  completion,
  currentSourceHash,
  onAnswer,
  onFinish,
}: {
  quiz: QuizArtifact | null;
  selectedAnswers: (number | null)[];
  completion: CompletionState | null;
  currentSourceHash: string;
  onAnswer: (index: number, answer: number) => void;
  onFinish: () => void;
}) {
  if (!quiz) return null;
  const outdated = quiz.sourceHash !== currentSourceHash;
  return (
    <section aria-labelledby="quiz-heading" className={outdated ? "card outdated" : "card"}>
      <h2 id="quiz-heading">Quiz</h2>
      <p className="metadata">Model: {quiz.model}</p>
      {outdated && (
        <p className="notice">
          Outdated — generated from an earlier version of the content. You can continue this
          attempt.
        </p>
      )}
      <p role="status">
        {quiz.actualQuestionCount} of {quiz.requestedQuestionCount} requested questions generated.
      </p>
      {quiz.questions.length === 0 ? (
        <p>
          The content did not support a meaningful quiz. Add more detail and generate a new quiz.
        </p>
      ) : (
        <>
          {quiz.questions.map((question, index) => (
            <fieldset key={index} disabled={completion !== null}>
              <legend>
                {index + 1}. {question.question}
              </legend>
              {question.options.map((option, optionIndex) => (
                <label className="option" key={optionIndex}>
                  <input
                    type="radio"
                    name={`question-${index}`}
                    checked={selectedAnswers[index] === optionIndex}
                    onChange={() => onAnswer(index, optionIndex)}
                  />
                  <span>{option}</span>
                  {completion && (
                    <span className="answer-label">
                      {optionIndex === question.correctOptionIndex ? "✓ Correct answer" : ""}
                      {selectedAnswers[index] === optionIndex ? " · Your answer" : ""}
                    </span>
                  )}
                </label>
              ))}
              {completion && (
                <div className="evidence">
                  <p>
                    {selectedAnswers[index] === null
                      ? "Unanswered"
                      : selectedAnswers[index] === question.correctOptionIndex
                        ? "✓ Correct"
                        : "✕ Incorrect"}
                  </p>
                  <h3>Source evidence</h3>
                  <blockquote>{question.sourceQuote}</blockquote>
                </div>
              )}
            </fieldset>
          ))}
          {!completion && (
            <>
              <p>{selectedAnswers.filter((answer) => answer === null).length} unanswered</p>
              <button className="primary" onClick={onFinish}>
                Finish quiz
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
