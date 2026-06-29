"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ResearchProject } from "@swearch/shared";

export function useProjects() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("research_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      setProjects(data || []);
      setLoading(false);
    }

    load();

    // TODO: Add Supabase Realtime subscription so web app updates live when extension saves highlights
    // const channel = supabase.channel('research_projects').on('postgres_changes', ...).subscribe()
  }, []);

  return { projects, loading };
}
