"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("*, team_lead:users!team_lead_id(*)")
        .eq("status", "active")
        .order("name");
      if (data) setProjects(data as Project[]);
      setLoading(false);
    }
    fetch();
  }, []);

  return { projects, loading };
}
