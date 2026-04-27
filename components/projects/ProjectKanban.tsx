"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskCard from "@/components/dashboard/TaskCard";
import NewTaskModal from "@/components/tasks/NewTaskModal";
import EditTaskModal from "@/components/tasks/EditTaskModal";
import { createClient } from "@/lib/supabase/client";
import { useTasks } from "@/lib/hooks/useTasks";
import type { Task, TaskStatus } from "@/types";

const columns: { status: TaskStatus; label: string; color: string }[] = [
  { status: "pending",     label: "Pending",     color: "bg-muted-foreground" },
  { status: "in_progress", label: "In Progress", color: "bg-status-in-progress" },
  { status: "overdue",     label: "Overdue",     color: "bg-status-overdue" },
  { status: "completed",   label: "Completed",   color: "bg-status-completed" },
];

export default function ProjectKanban({ projectId }: { projectId: string }) {
  const { tasks, loading, refetch } = useTasks(projectId);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("pending");
  const [editTask, setEditTask] = useState<Task | null>(null);

  async function handleMarkDone(task: Task) {
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString(), progress: 100 })
      .eq("id", task.id);
    refetch();
  }

  async function handleDelete(task: Task) {
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", task.id);
    refetch();
  }

  function openNewTask(status: TaskStatus) {
    setNewTaskStatus(status);
    setNewTaskOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Tasks</h3>
        <Button onClick={() => openNewTask("pending")} size="sm" className="bg-brand hover:bg-brand/90 text-white gap-1.5">
          <Plus size={16} /> New Task
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(({ status, label, color }) => {
          const columnTasks = tasks.filter(t => t.status === status);
          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">
                  {columnTasks.length}
                </span>
              </div>

              <div className="space-y-3 min-h-20">
                {loading ? (
                  [1, 2].map(i => (
                    <div key={i} className="bg-card border border-border rounded-lg p-4 h-24 animate-pulse" />
                  ))
                ) : (
                  columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMarkDone={handleMarkDone}
                      onEdit={setEditTask}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>

              {status !== "overdue" && status !== "completed" && (
                <button
                  onClick={() => openNewTask(status)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1"
                >
                  <Plus size={14} /> Add Task
                </button>
              )}
            </div>
          );
        })}
      </div>

      <NewTaskModal
        open={newTaskOpen}
        defaultStatus={newTaskStatus}
        defaultProjectId={projectId}
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
