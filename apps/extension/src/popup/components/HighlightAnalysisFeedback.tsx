import {
  type HighlightAnalysis,
  getAnalysisSections,
} from "@swearch/shared/types/highlight-analysis";

interface Props {
  analysis: HighlightAnalysis;
}

export default function HighlightAnalysisFeedback({ analysis }: Props) {
  const sections = getAnalysisSections(analysis);

  return (
    <div className="flex flex-col gap-2.5">
      {analysis.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-surface-2 border border-border-subtle text-[11px] text-text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {sections.map(({ key, label, accent, content }) => (
        <section
          key={key}
          className={`rounded-lg p-3 border ${
            accent
              ? "bg-accent-muted/40 border-accent/60"
              : "bg-surface-1 border-border-subtle"
          }`}
        >
          <h3
            className={`text-[11px] font-medium uppercase tracking-wide mb-1.5 ${
              accent ? "text-indigo-300" : "text-text-tertiary"
            }`}
          >
            {label}
          </h3>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </section>
      ))}

      {sections.length === 0 && analysis.summary && (
        <section className="rounded-lg p-3 border bg-surface-1 border-border-subtle">
          <h3 className="text-[11px] font-medium uppercase tracking-wide mb-1.5 text-text-tertiary">
            Summary
          </h3>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {analysis.summary}
          </p>
        </section>
      )}
    </div>
  );
}
