import { createClient } from "@supabase/supabase-js";
import type { Database } from "@swearch/shared/types/database";

// Anon key is safe to bundle in the extension — Supabase RLS enforces data access
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
