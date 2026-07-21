"use client";

import { useState } from "react";
import { Plus, LayoutList } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTaskStats } from "@/lib/hooks/useTaskStats";
import ProgressRing from "./ProgressRing";
import KanbanBoard from "./KanbanBoard";
import MiniCalendar from "./MiniCalendar";
import UpcomingDeadlines from "./UpcomingDeadlines";
import TaskDonutChart from "./TaskDonutChart";
import QuickActions from "./QuickActions";
import NewTaskModal from "@/components/tasks/NewTaskModal";

export default function DashboardShell() {
  const { stats, upcomingTasks, allTasks, loading } = useTaskStats();
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="flex gap-5 h-full">
      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Primary actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setNewTaskOpen(true)}
            className="bg-brand hover:bg-brand/90 text-white gap-2"
          >
            <Plus size={16} />
            New Task
          </Button>
          <Button variant="outline" onClick={() => router.push("/tasks")} className="gap-2">
            <LayoutList size={16} />
            View Tasks
          </Button>
        </div>

        {/* Progress panel */}
        {loading ? (
          <div className="bg-card border border-border rounded-xl p-5 h-28 animate-pulse" />
        ) : (
          <ProgressRing stats={stats} />
        )}

        {/* Kanban board */}
        <KanbanBoard />
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
