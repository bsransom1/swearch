-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research projects
CREATE TABLE public.research_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  google_doc_id TEXT,
  google_doc_title TEXT,
  google_doc_cached_text TEXT,
  google_doc_cached_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Papers analyzed
CREATE TABLE public.papers_analyzed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  paper_title TEXT,
  paper_url TEXT NOT NULL,
  paper_doi TEXT,
  paper_authors TEXT[],
  paper_year INTEGER,
  paper_abstract TEXT,
  highlight_count INTEGER DEFAULT 0,
  first_highlighted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_highlighted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- TODO: Add paper upsert logic to handle duplicate URLs per project
  UNIQUE (user_id, paper_url, project_id)
);

-- Highlights + AI extractions
CREATE TABLE public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES public.papers_analyzed(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  highlight_text TEXT NOT NULL,
  ai_summary TEXT,
  ai_methodology TEXT,
  ai_findings TEXT,
  ai_limitations TEXT,
  ai_relevance TEXT,
  ai_sample_size TEXT,
  exported_to_google_doc BOOLEAN DEFAULT false,
  google_doc_exported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paper recommendations
CREATE TABLE public.paper_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_paper_id UUID REFERENCES public.papers_analyzed(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  recommended_title TEXT NOT NULL,
  recommended_url TEXT,
  recommended_authors TEXT[],
  recommended_year INTEGER,
  recommended_abstract TEXT,
  relevance_reason TEXT,
  semantic_scholar_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_research_projects_user_id ON public.research_projects(user_id);
CREATE INDEX idx_research_projects_is_active ON public.research_projects(user_id, is_active);
CREATE INDEX idx_papers_analyzed_project_id ON public.papers_analyzed(project_id);
CREATE INDEX idx_highlights_paper_id ON public.highlights(paper_id);
CREATE INDEX idx_highlights_project_id ON public.highlights(project_id);
CREATE INDEX idx_highlights_created_at ON public.highlights(user_id, created_at DESC);
CREATE INDEX idx_paper_recommendations_project_id ON public.paper_recommendations(project_id);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers_analyzed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can CRUD own projects" ON public.research_projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own papers" ON public.papers_analyzed
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own highlights" ON public.highlights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own recommendations" ON public.paper_recommendations
  FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_projects_updated_at BEFORE UPDATE ON public.research_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- TODO: Add increment_highlight_count RPC function to Supabase migration
CREATE OR REPLACE FUNCTION public.increment_highlight_count(paper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.papers_analyzed
  SET
    highlight_count = highlight_count + 1,
    last_highlighted_at = NOW()
  WHERE id = paper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
