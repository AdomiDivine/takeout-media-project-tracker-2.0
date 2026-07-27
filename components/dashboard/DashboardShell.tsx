"use client";

import { useState } from "react";
import { Plus, LayoutList, Calendar, AlertTriangle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTaskStats } from "@/lib/hooks/useTaskStats";
import ProgressRing from "./ProgressRing";
import MiniCalendar from "./MiniCalendar";
import UpcomingDeadlines from "./UpcomingDeadlines";
import TaskDonutChart from "./TaskDonutChart";
import QuickActions from "./QuickActions";
import NewTaskModal from "@/components/tasks/NewTaskModal";
import { format, differenceInDays, isPast, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

type StatusFilter = "all" | "in_progress" | "pending" | "overdue" | "completed";

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  completed:   "bg-green-500/10 text-green-600 border-green-500/30",
  overdue:     "bg-red-500/10 text-red-500 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Completed", overdue: "Overdue",
};

const PRIORITY_STYLES: Record<string, string> = {
  high:   "bg-red-500/10 text-red-500 border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  low:    "bg-green-500/10 text-green-500 border-green-500/30",
};

function daysLeftLabel(deadline: string): { label: string; color: string } {
  const d = parseISO(deadline);
  if (isPast(d) && !isToday(d)) return { label: "Overdue", color: "text-red-500" };
  if (isToday(d))               return { label: "Due today", color: "text-amber-500" };
  const days = differenceInDays(d, new Date());
  return { label: `${days}d left`, color: days <= 3 ? "text-amber-500" : "text-muted-foreground" };
}

function TaskRow({ task }: { task: Task }) {
  const { label, color } = daysLeftLabel(task.deadline);
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {(task as any).project?.name && (
            <span className="text-xs text-muted-foreground truncate">{(task as any).project.name}</span>
          )}
          {task.start_date && (
            <span className="text-xs text-muted-foreground">
              · {format(parseISO(task.start_date), "MMM d")} → {format(parseISO(task.deadline), "MMM d")}
            </span>
          )}
        </div>
      </div>
      <span className={cn("text-xs font-medium flex-shrink-0", color)}>{label}</span>
      <Badge variant="outline" className={cn("text-[10px] capitalize flex-shrink-0", PRIORITY_STYLES[task.priority])}>
        {task.priority}
      </Badge>
      <Badge variant="outline" className={cn("text-[10px] whitespace-nowrap flex-shrink-0", STATUS_STYLES[task.status])}>
        {STATUS_LABELS[task.status]}
      </Badge>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardShell({ userName }: { userName: string }) {
  const { stats, upcomingTasks, allTasks, loading } = useTaskStats();
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("in_progress");
  const router = useRouter();

  const filtered = statusFilter === "all"
    ? allTasks
    : allTasks.filter(t => t.status === statusFilter);

  const filterLabel: Record<StatusFilter, string> = {
    all: "All Tasks", in_progress: "In Progress", pending: "Pending",
    overdue: "Overdue", completed: "Completed",
  };

  return (
    <div className="flex gap-5 h-full">
      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-semibold">{getGreeting()}, {userName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's a look at your tasks for today.</p>
        </div>

        {/* Primary actions */}
        <div className="flex items-center gap-3">
          <Button onClick={() => setNewTaskOpen(true)} className="bg-brand hover:bg-brand/90 text-white gap-2">
            <Plus size={16} /> New Task
          </Button>
          <Button variant="outline" onClick={() => router.push("/tasks")} className="gap-2">
            <LayoutList size={16} /> View All Tasks
          </Button>
        </div>

        {/* Progress panel — chips are now clickable filters */}
        {loading ? (
          <div className="bg-card border border-border rounded-xl p-5 h-28 animate-pulse" />
        ) : (
          <ProgressRing stats={stats} activeFilter={statusFilter} onFilterChange={setStatusFilter} />
        )}

        {/* Filtered task list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">{filterLabel[statusFilter]}</h3>
            <span className="text-xs text-muted-foreground">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div className="space-y-0">
              {[1,2,3,4].map(i => <div key={i} className="h-14 border-b border-border/40 animate-pulse bg-muted/10" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
              {statusFilter === "overdue"     && <AlertTriangle size={32} className="opacity-30" />}
              {statusFilter === "in_progress" && <Clock size={32} className="opacity-30" />}
              {statusFilter === "pending"     && <Calendar size={32} className="opacity-30" />}
              <p className="text-sm">No {filterLabel[statusFilter].toLowerCase()} tasks.</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {filtered.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-64 flex-shrink-0 space-y-4">
        <MiniCalendar tasks={allTasks} />
        <UpcomingDeadlines tasks={upcomingTasks} />
        <TaskDonutChart stats={stats} />
        <QuickActions />
      </div>

      <NewTaskModal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onCreated={() => setNewTaskOpen(false)}
      />
    </div>
  );
}
