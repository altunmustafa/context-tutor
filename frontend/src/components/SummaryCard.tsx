import type { SummaryArtifact } from "../workspace/model";

export function SummaryCard({
  summary,
  currentSourceHash,
}: {
  summary: SummaryArtifact | null;
  currentSourceHash: string;
}) {
  if (!summary) return null;
  const outdated = summary.sourceHash !== currentSourceHash;

  return (
    <section aria-labelledby="summary-heading" className={outdated ? "card outdated" : "card"}>
      <h2 id="summary-heading">Summary</h2>
      <p className="metadata">Model: {summary.model}</p>
      {outdated && (
        <p className="notice">Outdated — generated from an earlier version of the content.</p>
      )}
      <ul>
        {summary.points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </section>
  );
}
