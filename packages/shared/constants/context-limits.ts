export const CONTEXT_LIMITS = {
  maxContextDocsPerProject: 10,
  maxCachedTextChars: 150_000,
  perDocExcerptChars: 500,
  perDocSummaryChars: 400,
  totalDocContentChars: 3000,
  maxHighlightsFetched: 50,
  maxHighlightsInPrompt: { chat: 15, analyze: 10, ask: 8, claims: 3 } as Record<string, number>,
  maxHighlightEntryChars: 300,
  totalHighlightChars: 2000,
  maxSavedPapersFetched: 10,
  maxSavedPapersInPrompt: 10,
  perPaperExcerptChars: 400,
  totalSavedPaperChars: 3000,
  /** Minimum ms between consecutive brain (find related papers) searches in one session. */
  relatedPapersSearchCooldownMs: 60_000,
} as const;
