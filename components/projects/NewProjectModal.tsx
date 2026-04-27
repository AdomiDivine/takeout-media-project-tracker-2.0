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
import { logActivity } from "@/lib/activity";
import type { User } from "@/types";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamLeadId, setTeamLeadId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Stable temp path for image upload before project ID exists
  const [tempPath] = useState(() => `temp-${Date.now()}`);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  function reset() {
    setName(""); setDescription(""); setTeamLeadId("");
    setAvatarUrl(""); setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase.from("projects").insert({
      name,
      description: description || null,
      created_by: user.id,
      team_lead_id: teamLeadId || null,
      avatar_url: avatarUrl || null,
    });

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    logActivity({ action: `Created project "${name}"` });
    reset(); onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Project image */}
          <div className="flex justify-center">
            <ImageUpload
              currentUrl={avatarUrl || null}
              bucket="project-avatars"
              filePath={tempPath}
              shape="square"
              size="md"
              onUploaded={setAvatarUrl}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-name">Project name *</Label>
            <Input
              id="proj-name"
              placeholder="e.g. Jaiz Bank Campaign"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="proj-desc"
              placeholder="What is this project about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-lead">Team Lead <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={teamLeadId} onValueChange={(v) => setTeamLeadId(v ?? "")}>
              <SelectTrigger id="team-lead" className="w-full">
                <SelectValue placeholder="Select a team lead">
                  {teamLeadId ? members.find(m => m.id === teamLeadId)?.name : undefined}
                </SelectValue>
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
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
