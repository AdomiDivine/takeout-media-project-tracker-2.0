"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FolderOpen, Archive, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useTasks } from "@/lib/hooks/useTasks";
import ProjectKanban from "@/components/projects/ProjectKanban";
import EditProjectModal from "@/components/projects/EditProjectModal";
import { format } from "date-fns";
import type { Project } from "@/types";

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { tasks } = useTasks(id);

  useEffect(() => {
    async function fetchProject() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data }, { data: profile }] = await Promise.all([
        supabase.from("projects").select("*, team_lead:users!team_lead_id(name)").eq("id", id).single(),
        user ? supabase.from("users").select("role").eq("id", user.id).single() : Promise.resolve({ data: null }),
      ]);
      if (data) setProject(data as Project);
      if (profile) setUserRole(profile.role);
      setLoading(false);
    }
    fetchProject();
  }, [id]);

  const canManage = ["super_admin", "admin"].includes(userRole);

  async function handleArchive() {
    if (!project) return;
    setArchiving(true);
    const supabase = createClient();
    await supabase.from("projects").update({ status: "archived" }).eq("id", project.id);
    router.push("/projects");
  }

  const stats = {
    total:       tasks.length,
    completed:   tasks.filter(t => t.status === "completed").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    pending:     tasks.filter(t => t.status === "pending").length,
    overdue:     tasks.filter(t => t.status === "overdue").length,
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <FolderOpen size={40} className="opacity-30" />
        <p className="text-sm">Project not found.</p>
        <button onClick={() => router.push("/projects")} className="text-sm text-brand hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/projects")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} /> Back to Projects
      </button>

      {/* Project header card */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-brand/10">
          {project.avatar_url ? (
            <img src={project.avatar_url} alt={project.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FolderOpen size={24} className="text-brand/30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-xl font-bold leading-tight">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
            )}
            <p className="text-xs text-muted-foreground pt-1">
              {(project as any).team_lead?.name && `Lead: ${(project as any).team_lead.name} · `}
              Created {format(new Date(project.created_at), "MMM d, yyyy")}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-[10px] text-status-completed border-status-completed/30 bg-status-completed/10">
              Active
            </Badge>
            {canManage && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => setEditOpen(true)}>
                  <Pencil size={12} /> Edit
                </Button>
                <Button
                  size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                  disabled={archiving} onClick={handleArchive}
                >
                  <Archive size={12} />
                  {archiving ? "Archiving…" : "Archive"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Tasks"  value={stats.total}       color="text-foreground" />
        <StatCard label="Completed"    value={stats.completed}   color="text-status-completed" />
        <StatCard label="In Progress"  value={stats.in_progress} color="text-status-in-progress" />
        <StatCard label="Pending"      value={stats.pending}     color="text-muted-foreground" />
        <StatCard label="Overdue"      value={stats.overdue}     color="text-status-overdue" />
      </div>

      {/* Kanban */}
      <div className="bg-card border border-border rounded-xl p-5">
        <ProjectKanban projectId={id} />
      </div>

      <EditProjectModal
        open={editOpen}
        project={project}
        onClose={() => setEditOpen(false)}
        onUpdated={(updated) => { setProject(updated); setEditOpen(false); }}
      />
    </div>
  );
}
