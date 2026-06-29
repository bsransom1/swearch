"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PaperAnalyzed } from "@swearch/shared";

export function usePapers(projectId: string | null) {
  const [papers, setPapers] = useState<PaperAnalyzed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    supabase
      .from("papers_analyzed")
      .select("*")
      .eq("project_id", projectId)
      .order("last_highlighted_at", { ascending: false })
      .then(({ data }) => {
        setPapers(data || []);
        setLoading(false);
      });
  }, [projectId]);

  return { papers, loading };
}
