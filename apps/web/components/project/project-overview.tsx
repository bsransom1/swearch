"use client";

import { BookOpen, ExternalLink, FileText, Highlighter } from "lucide-react";
import type { ProjectGoogleDoc } from "@swearch/shared/types/project-google-doc";
import { findExportDoc } from "@swearch/shared/types/project-google-doc";
import {
  inferHighlightType,
  resolveProjectHighlightInsight,
} from "@swearch/shared/types/highlight-analysis";
import { formatRelativeDate } from "@/lib/utils";
import HighlightIndexRow from "./highlight-index-row";

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  updated_at: string | null;
}

interface PaperRow {
  id: string;
  paper_title: string | null;
  paper_url: string;
  highlight_count: number;
}

interface HighlightRow {
  id: string;
  highlight_text: string;
  ai_summary: string | null;
  ai_methodology: string | null;
  ai_findings: string | null;
  ai_limitations: string | null;
  ai_relevance: string | null;
  ai_sample_size: string | null;
  created_at: string | null;
  papers_analyzed: { id: string; paper_title: string; paper_url: string } | null;
}

interface Props {
  project: ProjectRow;
  highlights: HighlightRow[];
  papers: PaperRow[];
  linkedDocs: ProjectGoogleDoc[];
  lastSynced: string | null;
  onSelectHighlight: (id: string) => void;
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg px-4 py-3 text-center">
      <p className="text-xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-tertiary mt-0.5">{label}</p>
    </div>
  );
}

export default function ProjectOverview({
  project,
  highlights,
  papers,
  linkedDocs,
  lastSynced,
  onSelectHighlight,
}: Props) {
  const exportDocId = findExportDoc(linkedDocs);
  const exportDoc = linkedDocs.find((d) => d.google_doc_id === exportDocId);
  const recentHighlights = highlights.slice(0, 5);

  if (highlights.length === 0) {
    return (
      <div className="p-8 max-w-md space-y-4">
        <div className="w-12 h-12 rounded-xl bg-accent-50 border border-accent-200 flex items-center justify-center">
          <Highlighter size={22} strokeWidth={1.75} className="text-accent" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">No highlights yet</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Use the Chrome extension to highlight text on any research paper. Your highlights will
          appear here with AI-generated summaries and relevance assessments.
        </p>
        <a
          href="https://chrome.google.com/webstore"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          <ExternalLink size={13} strokeWidth={2} />
          Get the Chrome extension
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Description */}
      {project.description && (
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={papers.length} label="papers" />
        <StatCard value={highlights.length} label="highlights" />
        <StatCard value={linkedDocs.length} label="docs" />
      </div>

      {lastSynced && (
        <p className="text-[11px] text-text-tertiary -mt-3">
          Last activity {formatRelativeDate(lastSynced)}
        </p>
      )}

      {/* Recent highlights */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Highlighter size={14} strokeWidth={2} className="text-text-tertiary" />
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Recent highlights
          </p>
        </div>
        <div className="bg-surface-0 border border-border-subtle rounded-lg overflow-hidden divide-y divide-border-subtle">
          {recentHighlights.map((h) => (
            <HighlightIndexRow
              key={h.id}
              id={h.id}
              highlightText={h.highlight_text}
              type={inferHighlightType(h)}
              insight={resolveProjectHighlightInsight(h)}
              createdAt={h.created_at}
              selected={false}
              onSelect={onSelectHighlight}
            />
          ))}
        </div>
        {highlights.length > 5 && (
          <p className="text-[11px] text-text-tertiary mt-2 pl-1">
            + {highlights.length - 5} more highlights in the index →
          </p>
        )}
      </section>

      {/* Top papers */}
      {papers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={14} strokeWidth={2} className="text-text-tertiary" />
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Papers
            </p>
          </div>
          <div className="space-y-1">
            {[...papers]
              .sort((a, b) => b.highlight_count - a.highlight_count)
              .slice(0, 5)
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                  <p className="text-[13px] text-text-primary line-clamp-1 flex-1 min-w-0">
                    {p.paper_title ?? p.paper_url}
                  </p>
                  <span className="text-[11px] text-text-tertiary flex-shrink-0">
                    {p.highlight_count} highlight{p.highlight_count === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Export doc */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} strokeWidth={2} className="text-text-tertiary" />
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Export doc
          </p>
        </div>
        {exportDoc ? (
          <a
            href={`https://docs.google.com/document/d/${exportDoc.google_doc_id}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-text-primary hover:text-accent transition-colors"
          >
            <ExternalLink size={13} strokeWidth={2} />
            {exportDoc.title}
            <span className="text-[11px] text-text-tertiary">Open in Google Docs ↗</span>
          </a>
        ) : (
          <p className="text-[13px] text-text-tertiary">
            Link an export doc in the sidebar to enable one-click highlight export.
          </p>
        )}
      </section>
    </div>
  );
}
