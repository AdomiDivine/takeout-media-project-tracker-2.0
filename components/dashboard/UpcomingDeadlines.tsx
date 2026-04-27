"use client";

import { format, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface UpcomingDeadlinesProps {
  tasks: Task[];
}

const priorityStyles = {
  high:   "bg-status-overdue/20 text-status-overdue border-status-overdue/30",
  medium: "bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30",
  low:    "bg-status-completed/20 text-status-completed border-status-completed/30",
};

export default function UpcomingDeadlines({ tasks }: UpcomingDeadlinesProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Upcoming Deadlines</h3>
        <button className="text-xs text-brand hover:underline">View all</button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No upcoming deadlines.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const daysLeft = differenceInDays(new Date(task.deadline), new Date());
            const isUrgent = daysLeft <= 2;
            return (
              <div key={task.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{task.name}</p>
                  <p className={cn("text-[10px] mt-0.5", isUrgent ? "text-status-overdue" : "text-muted-foreground")}>
                    {format(new Date(task.deadline), "MMM d, yyyy")}
                    {daysLeft === 0 && " · Today"}
                    {daysLeft === 1 && " · Tomorrow"}
                    {daysLeft > 1 && ` · ${daysLeft}d left`}
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", priorityStyles[task.priority])}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
