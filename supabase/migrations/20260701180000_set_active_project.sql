CREATE OR REPLACE FUNCTION public.set_active_project(project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.research_projects
  SET is_active = false, updated_at = NOW()
  WHERE user_id = auth.uid();

  UPDATE public.research_projects
  SET is_active = true, updated_at = NOW()
  WHERE id = project_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_project(UUID) TO authenticated;
