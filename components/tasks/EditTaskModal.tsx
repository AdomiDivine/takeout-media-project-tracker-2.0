"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskPriority, TaskStatus, User } from "@/types";

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditTaskModal({ open, task, onClose, onUpdated }: EditTaskModalProps) {
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [progress, setProgress] = useState(0);
  const [blocker, setBlocker] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [assignedMembers, setAssignedMembers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (!task || !open) return;
    setName(task.name);
    setDeadline(task.deadline);
    setPriority(task.priority);
    setStatus(task.status === "overdue" ? "in_progress" : task.status);
    setProgress(task.progress);
    setBlocker(task.blocker ?? "");
    setAttachmentUrl(task.attachment_url ?? "");
    setError("");
    fetchMembersAndUsers(task.id);
  }, [task, open]);

  async function fetchMembersAndUsers(taskId: string) {
    const supabase = createClient();
    const [{ data: members }, { data: users }] = await Promise.all([
      supabase.from("task_members").select("user:users(*)").eq("task_id", taskId),
      supabase.from("users").select("*").order("name"),
    ]);
    setAssignedMembers(((members ?? []) as any[]).map(m => m.user).filter(Boolean) as User[]);
    setAllUsers((users ?? []) as User[]);
  }

  async function handleAddMember() {
    if (!addUserId || !task) return;
    setAddingMember(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("task_members").insert({ task_id: task.id, user_id: addUserId });
    if (!insertError) {
      await fetchMembersAndUsers(task.id);
      // Fire assignment email (best-effort — don't block UI if it fails)
      fetch("/api/email/task-assigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, assignedUserId: addUserId }),
      }).catch(() => {});
      setAddUserId("");
    }
    setAddingMember(false);
  }

  async function handleRemoveMember(userId: string) {
    if (!task) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("task_members").delete().eq("task_id", task.id).eq("user_id", userId);
    if (!deleteError) setAssignedMembers(prev => prev.filter(m => m.id !== userId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setError(""); setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.from("tasks").update({
      name,
      deadline,
      priority,
      status,
      progress: status === "completed" ? 100 : progress,
      blocker: blocker || null,
      attachment_url: attachmentUrl || null,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    }).eq("id", task.id);

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    onUpdated();
  }

  const unassigned = allUsers.filter(u => !assignedMembers.some(m => m.id === u.id));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Task name *</Label>
            <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger id="edit-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-deadline">Deadline *</Label>
            <Input id="edit-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
          </div>

          {status === "in_progress" && (
            <div className="space-y-2">
              <Label>Progress: {progress}%</Label>
              <input
                type="range" min={0} max={100} value={progress}
                onChange={e => setProgress(Number(e.target.value))}
                className="w-full accent-brand"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-blocker">Blocker <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="edit-blocker" placeholder="Any blockers?" value={blocker} onChange={e => setBlocker(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-attachment">Attachment link <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="edit-attachment" type="url" placeholder="Google Drive, Figma, Docs…" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} />
          </div>

          {/* Member assignment */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Label>Assigned members</Label>

            {assignedMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignedMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-sm">
                    <span>{member.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No members assigned yet.</p>
            )}

            {unassigned.length > 0 && (
              <div className="flex gap-2">
                <Select value={addUserId} onValueChange={setAddUserId}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Add a member…">
                      {addUserId ? unassigned.find(u => u.id === addUserId)?.name : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {unassigned.map(u => (
                      <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 flex-shrink-0"
                  disabled={!addUserId || addingMember}
                  onClick={handleAddMember}
                >
                  <UserPlus size={14} />
                  {addingMember ? "Adding…" : "Add"}
                </Button>
              </div>
            )}
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
