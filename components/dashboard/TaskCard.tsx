"use client";

import { Calendar, MoreVertical, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onMarkDone?: (task: Task) => void;
  onStatusChange?: (task: Task, status: "pending" | "in_progress" | "completed") => void;
}

const priorityStyles = {
  high:   "bg-status-overdue/20 text-status-overdue border-status-overdue/30",
  medium: "bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30",
  low:    "bg-status-completed/20 text-status-completed border-status-completed/30",
};

const priorityLabels = { high: "High", medium: "Medium", low: "Low" };

export default function TaskCard({ task, onEdit, onDelete, onMarkDone, onStatusChange }: TaskCardProps) {
  const isOverdue = task.status === "overdue";
  const showProgress = task.status === "in_progress" || task.status === "overdue";

  return (
    <div className={cn(
      "bg-card border rounded-lg p-4 space-y-3 hover:border-border/80 transition-colors",
      isOverdue ? "border-status-overdue/50" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{task.name}</p>
        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground flex-shrink-0 outline-none">
            <MoreVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {task.status === "pending" && (
              <DropdownMenuItem onClick={() => onStatusChange?.(task, "in_progress")}>
                Move to In Progress
              </DropdownMenuItem>
            )}
            {(task.status === "in_progress" || task.status === "overdue") && (
              <DropdownMenuItem onClick={() => onStatusChange?.(task, "pending")}>
                Move to Pending
              </DropdownMenuItem>
            )}
            {task.status !== "completed" && (
              <DropdownMenuItem onClick={() => onMarkDone?.(task)}>
                Mark as Done
              </DropdownMenuItem>
            )}
            {task.status === "completed" && (
              <DropdownMenuItem onClick={() => onStatusChange?.(task, "in_progress")}>
                Reopen Task
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit?.(task)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.(task)} className="text-status-overdue">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Deadline */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar size={12} />
        <span className={cn(isOverdue && "text-status-overdue font-medium")}>
          {format(new Date(task.deadline), "MMM d, yyyy")}
        </span>
      </div>

      {/* Priority badge */}
      <Badge variant="outline" className={cn("text-xs", priorityStyles[task.priority])}>
        {priorityLabels[task.priority]}
      </Badge>

      {/* Assigned members */}
      {task.members && task.members.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User size={12} />
          <span className="truncate">
            {task.members.map((m: any) => m.user?.name).filter(Boolean).join(", ")}
          </span>
        </div>
      )}

      {/* Blocker */}
      {task.blocker && (
        <p className="text-xs text-status-overdue font-medium truncate">
          ⚠ {task.blocker}
        </p>
      )}

      {/* Progress bar */}
      {showProgress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-1.5" />
        </div>
      )}
    </div>
  );
}
