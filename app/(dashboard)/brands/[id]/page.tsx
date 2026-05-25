"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, FolderOpen, Plus, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import NewProjectModal from "@/components/projects/NewProjectModal";
import EditBrandModal from "@/components/brands/EditBrandModal";
import type { Brand, Project } from "@/types";

export default function BrandPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editBrandOpen, setEditBrandOpen] = useState(false);

  async function fetchData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const [{ data: brandData }, { data: projectsData }, { data: profile }] = await Promise.all([
      supabase.from("brands").select("*, brand_manager:users!brand_manager_id(id,name,email,role,avatar_url,created_at)").eq("id", id).single(),
      supabase.from("projects").select("*, team_lead:users!team_lead_id(name)").eq("brand_id", id).eq("status", "active").order("name"),
      user ? supabase.from("users").select("role").eq("id", user.id).single() : Promise.resolve({ data: null }),
    ]);

    if (brandData) setBrand(brandData as Brand);
    if (projectsData) setProjects(projectsData as Project[]);
    if (profile) setUserRole(profile.role);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [id]);

  const canManage = ["super_admin", "admin"].includes(userRole);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-muted rounded-xl h-36 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Building2 size={40} className="opacity-30" />
        <p className="text-sm">Brand not found.</p>
        <button onClick={() => router.push("/brands")} className="text-sm text-brand hover:underline">
          Back to Brands
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/brands")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} /> Back to Brands
      </button>

      {/* Brand header */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-brand/10">
          {brand.avatar_url ? (
            <img src={brand.avatar_url} alt={brand.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 size={24} className="text-brand/30" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-xl font-bold leading-tight">{brand.name}</h2>
            {brand.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{brand.description}</p>
            )}
            <p className="text-xs text-muted-foreground pt-1">
              {(brand as any).brand_manager?.name && `Manager: ${(brand as any).brand_manager.name} · `}
              Created {format(new Date(brand.created_at), "MMM d, yyyy")}
            </p>
          </div>

          {canManage && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 flex-shrink-0" onClick={() => setEditBrandOpen(true)}>
              <Pencil size={12} /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Projects under this brand */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Projects <span className="text-muted-foreground font-normal">({projects.length})</span></h3>
          {canManage && (
            <Button size="sm" className="bg-brand hover:bg-brand/90 text-white gap-1.5" onClick={() => setNewProjectOpen(true)}>
              <Plus size={14} /> New Project
            </Button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 bg-card border border-border rounded-xl">
            <FolderOpen size={32} className="opacity-30" />
            <p className="text-sm">No projects under this brand yet.</p>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setNewProjectOpen(true)}>Add a project</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <a
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-brand/40 transition-colors block group"
              >
                {project.avatar_url ? (
                  <div className="h-28 overflow-hidden">
                    <img src={project.avatar_url} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
      </div>

      <NewProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={() => { setNewProjectOpen(false); fetchData(); router.refresh(); }}
        defaultBrandId={id}
      />

      <EditBrandModal
        open={editBrandOpen}
        brand={brand}
        onClose={() => setEditBrandOpen(false)}
        onUpdated={(updated) => { setBrand(updated); setEditBrandOpen(false); }}
      />
    </div>
  );
}
