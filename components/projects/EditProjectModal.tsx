"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from "@/components/ui/image-upload";
import { createClient } from "@/lib/supabase/client";
import type { Project, User } from "@/types";

interface EditProjectModalProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onUpdated: (updated: Project) => void;
}

export default function EditProjectModal({ open, project, onClose, onUpdated }: EditProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamLeadId, setTeamLeadId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!project || !open) return;
    setName(project.name);
    setDescription(project.description ?? "");
    setTeamLeadId(project.team_lead_id ?? "");
    setAvatarUrl(project.avatar_url ?? "");
    setError("");

    async function fetchMembers() {
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("*")
        .in("role", ["team_lead", "admin", "super_admin"])
        .order("name");
      if (data) setMembers(data as User[]);
    }
    fetchMembers();
  }, [project, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setError(""); setLoading(true);

    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("projects")
      .update({
        name,
        description: description || null,
        team_lead_id: teamLeadId || null,
        avatar_url: avatarUrl || null,
      })
      .eq("id", project.id)
      .select("*, team_lead:users!team_lead_id(name)")
      .single();

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    if (data) onUpdated(data as Project);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="flex justify-center">
            <ImageUpload
              currentUrl={avatarUrl || null}
              bucket="project-avatars"
              filePath={project?.id ?? "unknown"}
              shape="square"
              size="md"
              onUploaded={setAvatarUrl}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-proj-name">Project name *</Label>
            <Input
              id="edit-proj-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-proj-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="edit-proj-desc"
              placeholder="What is this project about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-team-lead">Team Lead <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={teamLeadId} onValueChange={(v) => setTeamLeadId(v ?? "")}>
              <SelectTrigger id="edit-team-lead">
                <SelectValue placeholder="Select a team lead" />
              </SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-status-overdue">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
