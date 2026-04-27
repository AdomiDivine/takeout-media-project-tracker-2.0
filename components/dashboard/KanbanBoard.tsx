"use client";

import { useState } from "react";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TaskCard from "./TaskCard";
import NewTaskModal from "@/components/tasks/NewTaskModal";
import { createClient } from "@/lib/supabase/client";
import { useTasks } from "@/lib/hooks/useTasks";
import { startOfWeek, addDays, isSameDay, format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

const statusColors: Record<string, string> = {
  pending:     "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30",
  in_progress: "bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30",
  completed:   "bg-status-completed/20 text-status-completed border-status-completed/30",
  overdue:     "bg-status-overdue/20 text-status-overdue border-status-overdue/30",
};
const statusLabels: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Completed", overdue: "Overdue",
};

const columns: { status: TaskStatus; label: string; color: string }[] = [
  { status: "pending",     label: "Pending",     color: "bg-muted-foreground" },
  { status: "in_progress", label: "In Progress", color: "bg-status-in-progress" },
  { status: "overdue",     label: "Overdue",     color: "bg-status-overdue" },
  { status: "completed",   label: "Completed",   color: "bg-status-completed" },
];

type FilterTab = "all" | TaskStatus;

type BoardView = "board" | "week";

export default function KanbanBoard() {
  const { tasks, loading, refetch } = useTasks();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("pending");
  const [boardView, setBoardView] = useState<BoardView>("board");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const filteredTasks = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

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

  async function handleStatusChange(task: Task, status: "pending" | "in_progress" | "completed") {
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        progress: status === "completed" ? 100 : status === "pending" ? 0 : task.progress,
      })
      .eq("id", task.id);
    refetch();
  }

  function openNewTask(status: TaskStatus) {
    setNewTaskStatus(status);
    setNewTaskOpen(true);
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all",         label: "All" },
    { key: "pending",     label: "Pending" },
    { key: "in_progress", label: "In Progress" },
    { key: "overdue",     label: "Overdue" },
    { key: "completed",   label: "Completed" },
  ];

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd  = addDays(weekStart, 6);

  return (
    <div className="space-y-4">
      {/* Board header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-base">My Tasks</h3>
          {/* View toggle */}
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            {(["board", "week"] as BoardView[]).map(v => (
              <button key={v} onClick={() => setBoardView(v)}
                className={cn("px-2.5 py-1 text-xs rounded-md font-medium transition-colors capitalize",
                  boardView === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {v === "board" ? "Board" : "Week"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openNewTask("pending")} size="sm" className="bg-brand hover:bg-brand/90 text-white gap-1.5">
            <Plus size={16} />
            New Task
          </Button>
        </div>
      </div>

      {/* Week view */}
      {boardView === "week" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekStart(d => addDays(d, -7))} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">← Prev</button>
            <p className="text-xs font-medium text-muted-foreground">{format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}</p>
            <button onClick={() => setWeekStart(d => addDays(d, 7))}  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">Next →</button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day, i) => {
              const dayTasks = tasks.filter(t => isSameDay(new Date(t.deadline + "T00:00:00"), day));
              const isToday  = isSameDay(day, new Date());
              return (
                <div key={i} className="space-y-1.5">
                  <div className={cn("rounded-lg p-2 text-center border", isToday ? "bg-brand text-white border-brand" : "bg-muted/50 border-border")}>
                    <p className="text-[10px] font-medium opacity-70">{format(day, "EEE")}</p>
                    <p className="text-base font-bold leading-none mt-0.5">{format(day, "d")}</p>
                  </div>
                  <div className="space-y-1 min-h-[3rem]">
                    {dayTasks.map(t => (
                      <div key={t.id} className={cn("rounded p-1.5 border text-[10px] leading-tight", statusColors[t.status])}>
                        <p className="font-medium truncate">{t.name}</p>
                      </div>
                    ))}
                    {dayTasks.length === 0 && <div className="h-6 rounded border border-dashed border-border/50" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Board view */}
      {boardView === "board" && <>
      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === key
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-4 gap-4">
        {columns.map(({ status, label, color }) => {
          const columnTasks = filteredTasks.filter(t => t.status === status);
          return (
            <div key={status} className="space-y-3">
              {/* Column header */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">
                  {columnTasks.length}
                </span>
              </div>

              {/* Task cards */}
              <div className="space-y-3 min-h-24">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="bg-card border border-border rounded-lg p-4 h-28 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMarkDone={handleMarkDone}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>

              {/* Add task shortcut */}
              <button
                onClick={() => openNewTask(status)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1"
              >
                <Plus size={14} />
                Add Task
              </button>
            </div>
          );
        })}
      </div>

      </>}

      <NewTaskModal
        open={newTaskOpen}
        defaultStatus={newTaskStatus}
        onClose={() => setNewTaskOpen(false)}
        onCreated={() => { setNewTaskOpen(false); refetch(); }}
      />
    </div>
  );
}
