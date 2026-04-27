"use client";

import { useTaskStats } from "@/lib/hooks/useTaskStats";
import ProgressRing from "./ProgressRing";
import KanbanBoard from "./KanbanBoard";
import MiniCalendar from "./MiniCalendar";
import UpcomingDeadlines from "./UpcomingDeadlines";
import TaskDonutChart from "./TaskDonutChart";
import QuickActions from "./QuickActions";

export default function DashboardShell() {
  const { stats, upcomingTasks, loading } = useTaskStats();

  return (
    <div className="flex gap-5 h-full">
      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-5">
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
        <MiniCalendar />
        <UpcomingDeadlines tasks={upcomingTasks} />
        <TaskDonutChart stats={stats} />
        <QuickActions />
      </div>
    </div>
  );
}
