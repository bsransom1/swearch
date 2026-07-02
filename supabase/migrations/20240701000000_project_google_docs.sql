-- Multiple Google Docs per research project with explicit roles
CREATE TABLE public.project_google_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_doc_id TEXT NOT NULL,
  title TEXT NOT NULL,
  cached_text TEXT,
  cached_at TIMESTAMP WITH TIME ZONE,
  role TEXT NOT NULL CHECK (role IN ('context', 'export', 'both')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (project_id, google_doc_id)
);

CREATE INDEX idx_project_google_docs_project_id ON public.project_google_docs(project_id);
CREATE INDEX idx_project_google_docs_user_id ON public.project_google_docs(user_id);

-- At most one export-capable doc per project
CREATE UNIQUE INDEX project_google_docs_one_export_per_project
  ON public.project_google_docs (project_id)
  WHERE role IN ('export', 'both');

ALTER TABLE public.project_google_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own project docs" ON public.project_google_docs
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER handle_project_google_docs_updated_at
  BEFORE UPDATE ON public.project_google_docs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Backfill from legacy single-doc columns
INSERT INTO public.project_google_docs (
  project_id,
  user_id,
  google_doc_id,
  title,
  cached_text,
  cached_at,
  role,
  sort_order
)
SELECT
  id,
  user_id,
  google_doc_id,
  COALESCE(google_doc_title, 'Untitled document'),
  google_doc_cached_text,
  google_doc_cached_at,
  'both',
  0
FROM public.research_projects
WHERE google_doc_id IS NOT NULL;
