"use client";

import { Calendar, MoreVertical, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  currentUserId?: string;
  isAdmin?: boolean;
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

export default function TaskCard({ task, currentUserId, isAdmin, onEdit, onDelete, onMarkDone, onStatusChange }: TaskCardProps) {
  const isOverdue = task.status === "overdue";
  const canDelete  = isAdmin || task.created_by === currentUserId;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex:  isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit?.(task)}
      className={cn(
        "bg-card border rounded-lg px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer",
        isOverdue ? "border-status-overdue/50" : "border-border",
        isDragging ? "shadow-lg" : "hover:bg-muted/30 hover:border-border/80"
      )}
    >
      {/* Drag handle — stops click from opening modal */}
      <button
        {...listeners}
        {...attributes}
        onClick={e => e.stopPropagation()}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0 outline-none"
        tabIndex={-1}
      >
        <GripVertical size={14} />
      </button>

      {/* Task name */}
      <p className="font-medium text-sm leading-tight line-clamp-1 flex-1">{task.name}</p>

      {/* Priority badge */}
      <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", priorityStyles[task.priority])}>
        {priorityLabels[task.priority]}
      </Badge>

      {/* Due date */}
      <div className={cn("flex items-center gap-1 text-xs flex-shrink-0", isOverdue ? "text-status-overdue font-medium" : "text-muted-foreground")}>
        <Calendar size={11} />
        <span>{format(new Date(task.deadline + "T00:00:00"), "MMM d")}</span>
      </div>

      {/* 3-dot menu — stops click from opening modal */}
      <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground outline-none">
            <MoreVertical size={15} />
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
              <DropdownMenuItem onClick={() => onMarkDone?.(task)}>Mark as Done</DropdownMenuItem>
            )}
            {task.status === "completed" && (
              <DropdownMenuItem onClick={() => onStatusChange?.(task, "in_progress")}>Reopen Task</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit?.(task)}>Edit</DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem onClick={() => onDelete?.(task)} className="text-status-overdue">Delete</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
