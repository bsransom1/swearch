-- Allow multiple export (and both) docs per project; roles are independent.
DROP INDEX IF EXISTS public.project_google_docs_one_export_per_project;
