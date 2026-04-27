"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Archive, FolderOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Project } from "@/types";

export default function ArchivePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);

  async function fetchData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: proj }, { data: profile }] = await Promise.all([
      supabase.from("projects").select("*, team_lead:users!team_lead_id(name)").eq("status", "archived").order("name"),
      supabase.from("users").select("role").eq("id", user.id).single(),
    ]);

    if (proj) setProjects(proj as Project[]);
    if (profile) setUserRole(profile.role);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleRestore(id: string) {
    setRestoring(id);
    const supabase = createClient();
    await supabase.from("projects").update({ status: "active" }).eq("id", id);
    await fetchData();
    router.refresh();
    setRestoring(null);
  }

  const canRestore = ["super_admin", "admin"].includes(userRole);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-24 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Archive</h2>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <Archive size={40} className="opacity-30" />
          <p className="text-sm">No archived projects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <div key={project.id} className="bg-card border border-border rounded-xl p-5 space-y-3 opacity-75 hover:opacity-90 transition-opacity">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={18} className="text-muted-foreground" />
                </div>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Archived</Badge>
              </div>

              <div>
                <p className="font-semibold text-sm">{project.name}</p>
                {(project as any).team_lead?.name && (
                  <p className="text-xs text-muted-foreground mt-0.5">Lead: {(project as any).team_lead.name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Created {format(new Date(project.created_at), "MMM d, yyyy")}
                </p>
              </div>

              {canRestore && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 text-xs h-8"
                  disabled={restoring === project.id}
                  onClick={() => handleRestore(project.id)}
                >
                  <RotateCcw size={12} />
                  {restoring === project.id ? "Restoring…" : "Restore project"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
