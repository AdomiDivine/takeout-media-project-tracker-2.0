"use client";

import { useState, useEffect } from "react";
import { CheckSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskCard from "@/components/dashboard/TaskCard";
import EditTaskModal from "@/components/tasks/EditTaskModal";
import NewTaskModal from "@/components/tasks/NewTaskModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTasks } from "@/lib/hooks/useTasks";
import type { Task, TaskStatus, Project } from "@/types";

type StatusFilter = TaskStatus | "all";

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "pending",     label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "overdue",     label: "Overdue" },
  { key: "completed",   label: "Completed" },
];

export default function TasksPage() {
  const { tasks, loading, refetch } = useTasks();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    async function fetchProjects() {
      const supabase = createClient();
      const { data } = await supabase.from("projects").select("*").eq("status", "active").order("name");
      if (data) setProjects(data as Project[]);
    }
    fetchProjects();
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

  async function handleProgressChange(task: Task, progress: number) {
    const supabase = createClient();
    await supabase.from("tasks").update({ progress }).eq("id", task.id);
    refetch();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Tasks</h2>
        <Button onClick={() => setNewTaskOpen(true)} size="sm" className="bg-brand hover:bg-brand/90 text-white gap-1.5">
          <Plus size={16} /> New Task
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {statusTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0 ${
              statusFilter === key
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs opacity-60">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
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

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <CheckSquare size={40} className="opacity-30" />
          <p className="text-sm">No tasks match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={setEditTask}
              onMarkDone={handleMarkDone}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onProgressChange={handleProgressChange}
            />
          ))}
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
