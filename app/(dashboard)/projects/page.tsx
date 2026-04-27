"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import NewProjectModal from "@/components/projects/NewProjectModal";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [userRole, setUserRole] = useState("");

  async function fetchProjects() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: proj }, { data: profile }] = await Promise.all([
      supabase.from("projects").select("*, team_lead:users!team_lead_id(name)").eq("status", "active").order("name"),
      supabase.from("users").select("role").eq("id", user.id).single(),
    ]);

    if (proj) setProjects(proj as Project[]);
    if (profile) setUserRole(profile.role);
    setLoading(false);
  }

  useEffect(() => { fetchProjects(); }, []);

  const canCreate = ["super_admin", "admin"].includes(userRole);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Projects</h2>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)} size="sm" className="bg-brand hover:bg-brand/90 text-white gap-1.5">
            <Plus size={16} /> New Project
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-card border border-border rounded-xl p-5 h-36 animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <FolderOpen size={40} className="opacity-30" />
          <p className="text-sm">No projects yet.</p>
          {canCreate && <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>Create your first project</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <a
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-brand/40 transition-colors block group"
            >
              {/* Project image or color banner */}
              {project.avatar_url ? (
                <div className="h-28 overflow-hidden">
                  <img
                    src={project.avatar_url}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-28 bg-brand/10 flex items-center justify-center">
                  <FolderOpen size={32} className="text-brand/40" />
                </div>
              )}

              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm leading-tight">{project.name}</p>
                  <Badge variant="outline" className="text-[10px] text-status-completed border-status-completed/30 bg-status-completed/10 flex-shrink-0">
                    Active
                  </Badge>
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                {(project as any).team_lead?.name && (
                  <p className="text-xs text-muted-foreground">Lead: {(project as any).team_lead.name}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { setModalOpen(false); fetchProjects(); router.refresh(); }}
      />
    </div>
  );
}
