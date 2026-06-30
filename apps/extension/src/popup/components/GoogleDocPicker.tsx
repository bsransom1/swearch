import { useMemo, useState } from "react";
import type { GoogleDocSummary } from "../../lib/google-docs";
import GoogleDocPickerRow from "./GoogleDocPickerRow";

interface Props {
  docs: GoogleDocSummary[];
  selectedDocId: string;
  loading: boolean;
  error: string | null;
  onSelect: (docId: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-2.5 px-2.5 py-2">
          <div className="w-4 h-4 rounded bg-surface-2 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-surface-2 rounded animate-pulse w-4/5" />
            <div className="h-2.5 bg-surface-2 rounded animate-pulse w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GoogleDocPicker({
  docs,
  selectedDocId,
  loading,
  error,
  onSelect,
  onRefresh,
  onClose,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((doc) => doc.name.toLowerCase().includes(q));
  }, [docs, searchQuery]);

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg overflow-hidden">
      <div className="sticky top-0 bg-surface-1 border-b border-border-subtle p-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
            Choose a document
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh list"
              className="p-1 text-text-tertiary hover:text-text-secondary disabled:opacity-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label="Close picker"
            >
              ✕
            </button>
          </div>
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents..."
          className="w-full px-2.5 py-1.5 bg-surface-0 border border-border-subtle rounded-md text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 px-3 py-2 border-b border-border-subtle">{error}</p>
      )}

      <div className="max-h-[200px] overflow-y-auto">
        {loading ? (
          <SkeletonRows />
        ) : filteredDocs.length === 0 ? (
          <p className="text-xs text-text-tertiary px-3 py-4 text-center">
            {searchQuery.trim()
              ? `No documents match "${searchQuery.trim()}"`
              : "No Google Docs found in your Drive."}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5 p-1">
            {filteredDocs.map((doc) => (
              <GoogleDocPickerRow
                key={doc.id}
                doc={doc}
                selected={doc.id === selectedDocId}
                onSelect={() => onSelect(doc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {!loading && docs.length > 0 && (
        <p className="text-[10px] text-text-tertiary px-3 py-2 border-t border-border-subtle">
          Showing {docs.length} most recent document{docs.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
