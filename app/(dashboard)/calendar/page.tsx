"use client";

import { useState } from "react";
import { useTasks } from "@/lib/hooks/useTasks";
import { format, addDays, isToday, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

const ganttBarColors: Record<string, string> = {
  pending:     "bg-muted-foreground/50",
  in_progress: "bg-status-in-progress",
  completed:   "bg-status-completed",
  overdue:     "bg-status-overdue",
};

const statusLabels: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Completed", overdue: "Overdue",
};

const DAY_W   = 38;
const ROW_H   = 44;
const LABEL_W = 220;
const DAYS    = 35;

export default function SchedulePage() {
  const { tasks, loading } = useTasks();
  const today = new Date();

  const [rangeStart, setRangeStart] = useState(() => today);

  const rangeEnd  = addDays(rangeStart, DAYS - 1);
  const days      = Array.from({ length: DAYS }, (_, i) => addDays(rangeStart, i));
  const todayCol  = differenceInDays(today, rangeStart);
  const totalWidth = LABEL_W + DAYS * DAY_W;

  const sortedTasks = [...tasks]
    .filter(t => !t.deleted_at)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Schedule</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All tasks mapped across time</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRangeStart(d => addDays(d, -DAYS))}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors border border-border"
          >← Prev</button>
          <span className="text-sm font-medium px-3">
            {format(rangeStart, "MMM d")} – {format(rangeEnd, "MMM d, yyyy")}
          </span>
          <button
            onClick={() => setRangeStart(d => addDays(d, DAYS))}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors border border-border"
          >Next →</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 flex-wrap">
        {Object.entries(statusLabels).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("w-3 h-3 rounded-sm inline-block", ganttBarColors[k])} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-px h-3 bg-brand inline-block" /> Today
        </span>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-96 bg-muted rounded-xl animate-pulse" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: totalWidth }}>

              {/* Month row */}
              <div className="flex border-b border-border bg-muted/30" style={{ minWidth: totalWidth }}>
                <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="sticky left-0 z-20 bg-muted/30 border-r border-border" />
                {days.map((day, i) => (
                  <div key={i} style={{ width: DAY_W, minWidth: DAY_W }}
                    className={cn("border-r border-border/40 text-center py-1", isToday(day) && "bg-brand/10")}>
                    {(i === 0 || day.getDate() === 1) && (
                      <span className="text-[10px] font-semibold text-brand block">{format(day, "MMM yyyy")}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Day number row */}
              <div className="flex border-b border-border" style={{ minWidth: totalWidth }}>
                <div style={{ width: LABEL_W, minWidth: LABEL_W }}
                  className="sticky left-0 z-20 bg-card border-r border-border flex items-center px-4">
                  <span className="text-xs font-medium text-muted-foreground">Task</span>
                </div>
                {days.map((day, i) => (
                  <div key={i} style={{ width: DAY_W, minWidth: DAY_W }}
                    className={cn("border-r border-border/40 text-center py-1.5", isToday(day) && "bg-brand/10")}>
                    <span className={cn("text-xs", isToday(day) ? "text-brand font-bold" : "text-muted-foreground")}>
                      {format(day, "d")}
                    </span>
                    <span className={cn("block text-[9px]", isToday(day) ? "text-brand/70" : "text-muted-foreground/50")}>
                      {format(day, "EEE")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Empty state */}
              {sortedTasks.length === 0 && (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <p className="text-sm">No tasks to display.</p>
                </div>
              )}

              {/* Task rows */}
              {sortedTasks.map((task, rowIdx) => {
                const startOffset  = differenceInDays(new Date(task.created_at), rangeStart);
                const endOffset    = differenceInDays(new Date(task.deadline + "T00:00:00"), rangeStart);
                const clampedStart = Math.max(0, startOffset);
                const clampedEnd   = Math.min(DAYS - 1, endOffset);
                const isVisible    = clampedEnd >= 0 && clampedStart <= DAYS - 1 && clampedEnd >= clampedStart;
                const barLeft      = clampedStart * DAY_W + 2;
                const barWidth     = isVisible ? Math.max((clampedEnd - clampedStart + 1) * DAY_W - 4, 8) : 0;
                const rowBg        = rowIdx % 2 === 0 ? "bg-card" : "bg-muted/10";

                return (
                  <div key={task.id} className={cn("flex items-center border-b border-border/50 last:border-0", rowBg)}
                    style={{ height: ROW_H, minWidth: totalWidth }}>

                    {/* Task label */}
                    <div style={{ width: LABEL_W, minWidth: LABEL_W, height: ROW_H }}
                      className={cn("sticky left-0 z-10 border-r border-border flex flex-col justify-center px-4", rowBg)}>
                      <p className="text-xs font-medium truncate leading-tight">{task.name}</p>
                      {(task as any).project?.name && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{(task as any).project.name}</p>
                      )}
                    </div>

                    {/* Bar area */}
                    <div className="relative flex-1" style={{ height: ROW_H }}>
                      {/* Today line */}
                      {todayCol >= 0 && todayCol < DAYS && (
                        <div style={{ left: todayCol * DAY_W + DAY_W / 2 }}
                          className="absolute top-0 bottom-0 w-px bg-brand/50 z-10 pointer-events-none" />
                      )}

                      {/* Column lines */}
                      {days.map((day, i) => (
                        <div key={i} style={{ left: i * DAY_W, width: DAY_W, height: ROW_H }}
                          className={cn("absolute top-0 border-r border-border/20", isToday(day) && "bg-brand/5")} />
                      ))}

                      {/* Task bar */}
                      {isVisible && (
                        <div style={{ left: barLeft, width: barWidth, top: 8, height: ROW_H - 16 }}
                          className={cn("absolute rounded-md overflow-hidden flex items-center", ganttBarColors[task.status])}>
                          {task.progress > 0 && task.status !== "completed" && (
                            <div style={{ width: `${task.progress}%` }}
                              className="absolute left-0 top-0 bottom-0 bg-white/25 rounded-md" />
                          )}
                          {barWidth > 48 && (
                            <span className="relative z-10 text-[10px] text-white font-medium px-2 truncate">
                              {task.status === "completed" ? "Done" : task.progress > 0 ? `${task.progress}%` : format(new Date(task.deadline + "T00:00:00"), "MMM d")}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Out-of-range hints */}
                      {!isVisible && endOffset < 0 && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">← before range</div>
                      )}
                      {!isVisible && startOffset >= DAYS && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">after range →</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
