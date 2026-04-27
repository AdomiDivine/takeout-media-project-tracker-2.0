"use client";

import { Calendar, MoreVertical, User, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onMarkDone?: (task: Task) => void;
  onStatusChange?: (task: Task, status: "pending" | "in_progress" | "completed") => void;
  onProgressChange?: (task: Task, progress: number) => void;
}

const priorityStyles = {
  high:   "bg-status-overdue/20 text-status-overdue border-status-overdue/30",
  medium: "bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30",
  low:    "bg-status-completed/20 text-status-completed border-status-completed/30",
};

const priorityLabels = { high: "High", medium: "Medium", low: "Low" };

export default function TaskCard({ task, onEdit, onDelete, onMarkDone, onStatusChange, onProgressChange }: TaskCardProps) {
  const isOverdue = task.status === "overdue";
  const showProgress = task.status === "in_progress" || task.status === "overdue";

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    onProgressChange?.(task, Math.max(0, Math.min(100, pct)));
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border rounded-lg p-4 space-y-3 transition-colors",
        isOverdue ? "border-status-overdue/50" : "border-border",
        isDragging ? "shadow-lg" : "hover:border-border/80"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 outline-none"
          tabIndex={-1}
        >
          <GripVertical size={14} />
        </button>

        <p className="font-semibold text-sm leading-tight line-clamp-2 flex-1">{task.name}</p>

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

      {/* Clickable progress bar */}
      {showProgress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-muted cursor-pointer group relative overflow-hidden"
            onClick={handleProgressClick}
            title="Click to set progress"
          >
            <div
              className="h-full rounded-full bg-brand transition-all pointer-events-none"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/60">Click bar to update</p>
        </div>
      )}
    </div>
  );
}
