"use client";

import { useState, useEffect } from "react";
import { CheckSquare, MoreVertical, Calendar, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import EditTaskModal from "@/components/tasks/EditTaskModal";
import NewTaskModal from "@/components/tasks/NewTaskModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTasks } from "@/lib/hooks/useTasks";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus, Project } from "@/types";

type StatusFilter = TaskStatus | "all";

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "pending",     label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "overdue",     label: "Overdue" },
  { key: "completed",   label: "Completed" },
];

const priorityStyles: Record<string, string> = {
  high:   "bg-red-500/10 text-red-500 border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  low:    "bg-green-500/10 text-green-500 border-green-500/30",
};

const statusStyles: Record<string, string> = {
  pending:     "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  completed:   "bg-green-500/10 text-green-600 border-green-500/30",
  overdue:     "bg-red-500/10 text-red-500 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Completed", overdue: "Overdue",
};

export default function TasksPage() {
  const { tasks, loading, refetch } = useTasks();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: projData }, { data: { user } }] = await Promise.all([
        supabase.from("projects").select("*").eq("status", "active").order("name"),
        supabase.auth.getUser(),
      ]);
      if (projData) setProjects(projData as Project[]);
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
        if (profile) setIsAdmin(["super_admin", "admin", "team_lead"].includes(profile.role));
      }
    }
    fetchData();
  }, []);

  const filtered = tasks.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (projectFilter !== "all" && t.project_id !== projectFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  const counts: Record<string, number> = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    overdue: tasks.filter(t => t.status === "overdue").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  async function handleMarkDone(task: Task) {
    const supabase = createClient();
    await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString(), progress: 100 }).eq("id", task.id);
    refetch();
  }

  async function handleDelete(task: Task) {
    const supabase = createClient();
    await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", task.id);
    refetch();
  }

  async function handleStatusChange(task: Task, status: "pending" | "in_progress" | "completed") {
    const supabase = createClient();
    await supabase.from("tasks").update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      progress: status === "completed" ? 100 : status === "pending" ? 0 : task.progress,
    }).eq("id", task.id);
    refetch();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tasks</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All your tasks and assignments</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setNewTaskOpen(true)} size="sm" className="bg-brand hover:bg-brand/90 text-white gap-1.5">
            <Plus size={16} /> New Task
          </Button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {statusTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              "px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0",
              statusFilter === key
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            <span className="ml-1.5 text-xs opacity-60">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={projectFilter} onValueChange={(v) => v && setProjectFilter(v)}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="All projects">
              {projectFilter !== "all" ? projects.find(p => p.id === projectFilter)?.name : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id} label={p.name}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => v && setPriorityFilter(v)}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-2 text-muted-foreground">
          <CheckSquare size={40} className="opacity-30" />
          <p className="text-sm">No tasks match your filters.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header — desktop only */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned to</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deadline</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority / Status</span>
            <span />
          </div>

          {filtered.map((task, idx) => {
            const creator = (task as any).creator;
            const members = (task as any).members as any[] ?? [];
            const projectName = (task as any).project?.name ?? "";
            const deadlineDate = new Date(task.deadline + "T00:00:00");
            const isDeadlineSoon = (isPast(deadlineDate) || isToday(deadlineDate)) && task.status !== "completed";
            const canDelete = isAdmin || task.created_by === currentUserId;

            return (
              <div
                key={task.id}
                onClick={() => setEditTask(task)}
                className={cn(
                  "group cursor-pointer transition-colors hover:bg-muted/30",
                  idx !== filtered.length - 1 && "border-b border-border/60"
                )}
              >
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center">
                  {/* Task info */}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{task.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {projectName && (
                        <span className="text-xs text-muted-foreground truncate">{projectName}</span>
                      )}
                      {members.length > 0 && (
                        <span className="text-xs text-muted-foreground truncate">
                          · {members.map((m: any) => m.user?.name).filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                    {task.blocker && (
                      <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                        <AlertTriangle size={11} /> {task.blocker}
                      </p>
                    )}
                    {task.status === "in_progress" && task.progress > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-28">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{task.progress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned by */}
                  <span className="text-sm text-muted-foreground truncate">
                    {creator?.name ?? "—"}
                  </span>

                  {/* Deadline */}
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className={cn(isDeadlineSoon ? "text-red-500" : "text-muted-foreground")} />
                    <span className={cn("text-sm", isDeadlineSoon ? "text-red-500 font-medium" : "text-foreground")}>
                      {format(deadlineDate, "MMM d, yyyy")}
                    </span>
                  </div>

                  {/* Priority + Status */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={cn("text-xs capitalize", priorityStyles[task.priority])}>
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", statusStyles[task.status])}>
                      {statusLabels[task.status]}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      onClick={e => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity outline-none p-1"
                    >
                      <MoreVertical size={16} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => setEditTask(task)}>View details</DropdownMenuItem>
                      {task.status !== "completed" && (
                        <DropdownMenuItem onClick={() => handleMarkDone(task)}>Mark as done</DropdownMenuItem>
                      )}
                      {task.status === "pending" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(task, "in_progress")}>Start task</DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem onClick={() => handleDelete(task)} className="text-red-500">
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Mobile card */}
                <div className="md:hidden px-4 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{task.name}</p>
                      {projectName && <p className="text-xs text-muted-foreground mt-0.5">{projectName}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger onClick={e => e.stopPropagation()} className="text-muted-foreground outline-none shrink-0">
                        <MoreVertical size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setEditTask(task)}>View details</DropdownMenuItem>
                        {task.status !== "completed" && (
                          <DropdownMenuItem onClick={() => handleMarkDone(task)}>Mark as done</DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => handleDelete(task)} className="text-red-500">Delete</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    {creator?.name && <span>By {creator.name}</span>}
                    <span className={cn("flex items-center gap-1", isDeadlineSoon && "text-red-500 font-medium")}>
                      <Calendar size={11} /> {format(deadlineDate, "MMM d, yyyy")}
                    </span>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="outline" className={cn("text-xs capitalize", priorityStyles[task.priority])}>
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", statusStyles[task.status])}>
                      {statusLabels[task.status]}
                    </Badge>
                  </div>

                  {task.blocker && (
                    <p className="flex items-center gap-1 text-xs text-red-500">
                      <AlertTriangle size={11} /> {task.blocker}
                    </p>
                  )}

                  {task.status === "in_progress" && task.progress > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${task.progress}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{task.progress}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewTaskModal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onCreated={() => { setNewTaskOpen(false); refetch(); }}
      />

      <EditTaskModal
        open={!!editTask}
        task={editTask}
        onClose={() => setEditTask(null)}
        onUpdated={() => { setEditTask(null); refetch(); }}
      />
    </div>
  );
}
