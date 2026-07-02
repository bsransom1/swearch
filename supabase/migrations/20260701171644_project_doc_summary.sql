-- Add AI-generated summary columns to project_google_docs
-- These are populated by the summarize-project-doc edge function on sync.
-- The summary is used in prompts preferentially over raw cached_text excerpts.
ALTER TABLE public.project_google_docs
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS summary_at TIMESTAMPTZ;
