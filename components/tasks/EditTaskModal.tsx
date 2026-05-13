"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, X, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority, TaskStatus, User } from "@/types";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: { name: string };
}

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onUpdated: () => void;
}

const priorityColors: Record<string, string> = {
  high: "text-red-500",
  medium: "text-yellow-500",
  low: "text-green-500",
};

export default function EditTaskModal({ open, task, onClose, onUpdated }: EditTaskModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "comments">("details");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [progress, setProgress] = useState(0);
  const [blocker, setBlocker] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignedMembers, setAssignedMembers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!task || !open) return;
    setActiveTab("details");
    setName(task.name);
    setDescription(task.description ?? "");
    setDeadline(task.deadline);
    setPriority(task.priority);
    setStatus(task.status === "overdue" ? "in_progress" : task.status);
    setProgress(task.progress);
    setBlocker(task.blocker ?? "");
    setAttachmentUrl(task.attachment_url ?? "");
    setError("");
    fetchAll(task.id);
  }, [task, open]);

  async function fetchAll(taskId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
      if (profile) setCurrentUser(profile as User);
    }
    const { data: users } = await supabase.from("users").select("*").order("name");
    const membersRes = await fetch(`/api/tasks/members?taskId=${taskId}`);
    const members: User[] = membersRes.ok ? await membersRes.json() : [];
    setAssignedMembers(members);
    setAllUsers((users ?? []) as User[]);
    fetchComments(taskId);
  }

  async function fetchComments(taskId: string) {
    const res = await fetch(`/api/tasks/comments?taskId=${taskId}`);
    if (res.ok) setComments(await res.json());
  }

  const isAdmin = ["super_admin", "admin", "team_lead"].includes(currentUser?.role ?? "");

  async function handleAddComment() {
    if (!newComment.trim() || !task) return;
    setSubmittingComment(true);
    const res = await fetch("/api/tasks/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, content: newComment.trim() }),
    });
    if (res.ok) {
      setNewComment("");
      await fetchComments(task.id);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSubmittingComment(false);
  }

  async function handleAddMember() {
    if (!addUserId || !task) return;
    setAddingMember(true);
    const supabase = createClient();
    const { data: { user: me } } = await supabase.auth.getUser();
    const addedUser = allUsers.find(u => u.id === addUserId);
    const res = await fetch("/api/tasks/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, userIds: [addUserId] }),
    });
    if (res.ok) {
      if (addedUser) setAssignedMembers(prev => [...prev, addedUser]);
      const assigneeName = addedUser?.name ?? "a member";
      logActivity({ action: `Assigned ${assigneeName} to "${task.name}"`, taskId: task.id, projectId: task.project_id });
      fetch("/api/email/task-assigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, assignedUserId: addUserId, assignedById: me?.id }),
      }).catch(() => {});
      setAddUserId("");
    }
    setAddingMember(false);
  }

  async function handleRemoveMember(userId: string) {
    if (!task) return;
    setAssignedMembers(prev => prev.filter(m => m.id !== userId));
    await fetch("/api/tasks/assign", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, userId }),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setError(""); setLoading(true);

    const base = {
      taskId: task.id,
      status,
      progress: status === "completed" ? 100 : progress,
      blocker: blocker || null,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    };

    const body = isAdmin
      ? { ...base, name, description: description || null, deadline, priority, attachment_url: attachmentUrl || null }
      : base;

    const res = await fetch("/api/tasks/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save changes");
      return;
    }
    logActivity({ action: `Updated task "${name}"`, taskId: task.id, projectId: task.project_id });
    onUpdated();
  }

  const unassigned = allUsers.filter(u => !assignedMembers.some(m => m.id === u.id));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border -mx-1 px-1">
          {(["details", "comments"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px",
                activeTab === tab
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {tab === "comments" && comments.length > 0 && (
                <span className="ml-1.5 text-xs opacity-60">{comments.length}</span>
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">

          {/* ── DETAILS TAB ── */}
          {activeTab === "details" && (
            <>
              {/* Task name */}
              <div className="space-y-2">
                <Label>Task name</Label>
                {isAdmin ? (
                  <Input value={name} onChange={e => setName(e.target.value)} required />
                ) : (
                  <p className="text-sm font-medium px-3 py-2 bg-muted rounded-md leading-snug">{name}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                {isAdmin ? (
                  <Textarea
                    placeholder="Describe the task…"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                ) : (
                  <p className="text-sm px-3 py-2 bg-muted rounded-md leading-relaxed whitespace-pre-wrap min-h-[64px]">
                    {description || <span className="text-muted-foreground italic">No description provided.</span>}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => v && setStatus(v as TaskStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  {isAdmin ? (
                    <Select value={priority} onValueChange={(v) => v && setPriority(v as TaskPriority)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className={cn("text-sm font-semibold px-3 py-2 bg-muted rounded-md capitalize", priorityColors[priority])}>
                      {priority}
                    </p>
                  )}
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label>Deadline</Label>
                {isAdmin ? (
                  <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
                ) : (
                  <p className="text-sm font-medium px-3 py-2 bg-muted rounded-md">
                    {deadline ? format(new Date(deadline + "T00:00:00"), "EEEE, MMMM d yyyy") : "—"}
                  </p>
                )}
              </div>

              {/* Progress */}
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

              {/* Blocker */}
              <div className="space-y-2">
                <Label>Blocker <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea
                  placeholder="Describe any blockers…"
                  value={blocker}
                  onChange={e => setBlocker(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Attachment — admins only */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label>Attachment link <span className="text-muted-foreground">(optional)</span></Label>
                  <Input type="url" placeholder="Google Drive, Figma, Docs…" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} />
                </div>
              )}

              {/* Member assignment — admins only */}
              {isAdmin && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <Label>Assigned members</Label>
                  {assignedMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {assignedMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-sm">
                          <span>{member.name}</span>
                          <button type="button" onClick={() => handleRemoveMember(member.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors">
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
                      <Select value={addUserId} onValueChange={(v) => v && setAddUserId(v)}>
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
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 h-9 flex-shrink-0"
                        disabled={!addUserId || addingMember} onClick={handleAddMember}>
                        <UserPlus size={14} />
                        {addingMember ? "Adding…" : "Add"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── COMMENTS TAB ── */}
          {activeTab === "comments" && (
            <div className="space-y-3">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No comments yet. Start the conversation.</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-semibold">{c.user.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(c.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-snug">{c.content}</p>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>
              <div className="flex gap-2 items-end">
                <Textarea
                  placeholder="Write a comment… (Enter to send, Shift+Enter for new line)"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  rows={2}
                  className="resize-none text-sm flex-1"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); }
                  }}
                />
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                  disabled={!newComment.trim() || submittingComment} onClick={handleAddComment}>
                  <Send size={14} />
                </Button>
              </div>
            </div>
          )}

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
