-- OpenAlex work ID + dedupe saved papers per project by URL
ALTER TABLE public.paper_recommendations
  ADD COLUMN IF NOT EXISTS openalex_work_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS paper_recommendations_project_url_unique
  ON public.paper_recommendations (project_id, recommended_url)
  WHERE recommended_url IS NOT NULL;
