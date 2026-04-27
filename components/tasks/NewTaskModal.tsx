"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Project, TaskPriority, TaskStatus } from "@/types";

interface NewTaskModalProps {
  open: boolean;
  defaultStatus?: TaskStatus;
  defaultProjectId?: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewTaskModal({ open, defaultStatus = "pending", defaultProjectId, onClose, onCreated }: NewTaskModalProps) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [blocker, setBlocker] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (defaultProjectId) { setProjectId(defaultProjectId); return; }
    async function fetchProjects() {
      const supabase = createClient();
      const { data } = await supabase.from("projects").select("*").eq("status", "active").order("name");
      if (data) setProjects(data as Project[]);
    }
    fetchProjects();
  }, [open, defaultProjectId]);

  function reset() {
    setName(""); setProjectId(""); setDeadline(""); setPriority("medium");
    setBlocker(""); setAttachmentUrl(""); setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) { setError("Please select a project."); return; }
    setError(""); setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase.from("tasks").insert({
      name,
      project_id: projectId,
      deadline,
      priority,
      blocker: blocker || null,
      attachment_url: attachmentUrl || null,
      status: defaultStatus,
      created_by: user.id,
    });

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }

    reset();
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="task-name">Task name *</Label>
            <Input id="task-name" placeholder="What needs to be done?" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          {!defaultProjectId && (
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} label={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline *</Label>
              <Input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={(v) => setPriority((v ?? "medium") as TaskPriority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blocker">Blocker <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="blocker" placeholder="Any blockers preventing progress?" value={blocker} onChange={e => setBlocker(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachment">Attachment link <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="attachment" type="url" placeholder="Google Drive, Figma, Docs link…" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} />
          </div>

          {error && <p className="text-sm text-status-overdue">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
