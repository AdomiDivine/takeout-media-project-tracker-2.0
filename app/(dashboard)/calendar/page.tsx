"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/lib/hooks/useTasks";
import { format, isSameDay, startOfWeek, addDays, isThisWeek, isThisMonth, isPast, isToday, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

type View = "month" | "week" | "gantt";

const statusColors: Record<string, string> = {
  pending:     "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30",
  in_progress: "bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30",
  completed:   "bg-status-completed/20 text-status-completed border-status-completed/30",
  overdue:     "bg-status-overdue/20 text-status-overdue border-status-overdue/30",
};
const statusLabels: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Completed", overdue: "Overdue",
};
const priorityColors: Record<string, string> = {
  high: "text-status-overdue", medium: "text-status-in-progress", low: "text-status-completed",
};

const ganttBarColors: Record<string, string> = {
  pending:     "bg-muted-foreground/50",
  in_progress: "bg-status-in-progress",
  completed:   "bg-status-completed",
  overdue:     "bg-status-overdue",
};

function MiniTask({ task }: { task: Task }) {
  return (
    <div className={cn("border rounded-lg p-2.5 space-y-1 bg-card text-xs", task.status === "overdue" ? "border-status-overdue/40" : "border-border")}>
      <div className="flex items-start justify-between gap-1.5">
        <p className="font-medium leading-snug">{task.name}</p>
        <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", statusColors[task.status])}>
          {statusLabels[task.status]}
        </Badge>
      </div>
      {(task as any).project?.name && (
        <p className="text-muted-foreground">{(task as any).project.name}</p>
      )}
      <p className={cn("font-medium", priorityColors[task.priority])}>
        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority
      </p>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ tasks, today }: { tasks: Task[]; today: Date }) {
  const [navDate, setNavDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);

  const year = navDate.getFullYear();
  const month = navDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; outside: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), outside: true });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), outside: false });
  while (cells.length % 7 !== 0)
    cells.push({ date: new Date(year, month + 1, cells.length - daysInMonth - firstDay + 1), outside: true });

  const selectedTasks = tasks.filter(t => isSameDay(new Date(t.deadline + "T00:00:00"), selected));

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setNavDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">← Prev</button>
          <p className="text-sm font-semibold">{format(navDate, "MMMM yyyy")}</p>
          <button onClick={() => setNavDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Next →</button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map(({ date, outside }, i) => {
            const isSel  = isSameDay(date, selected);
            const isTod  = isSameDay(date, today);
            const isOvd  = tasks.some(t => t.status === "overdue" && isSameDay(new Date(t.deadline + "T00:00:00"), date));
            const hasDue = tasks.some(t => isSameDay(new Date(t.deadline + "T00:00:00"), date));
            return (
              <button key={i} onClick={() => setSelected(date)}
                className={cn(
                  "relative flex flex-col items-center justify-center h-10 rounded-md text-sm transition-colors",
                  isSel  && "bg-brand text-white",
                  isTod  && !isSel && "bg-muted font-semibold",
                  !isSel && "hover:bg-muted",
                  outside && "opacity-30"
                )}>
                {date.getDate()}
                {hasDue && !isSel && (
                  <span className={cn("absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full", isOvd ? "bg-status-overdue" : "bg-brand")} />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-brand inline-block" /> Tasks due</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-status-overdue inline-block" /> Overdue</span>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-medium text-sm">
          {format(selected, "EEEE, MMMM d")}
          {selectedTasks.length > 0 && (
            <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}</span>
          )}
        </h3>
        {selectedTasks.length === 0
          ? <div className="flex items-center justify-center py-6 text-muted-foreground bg-card border border-border rounded-xl"><p className="text-sm">No tasks due on this day.</p></div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{selectedTasks.map(t => <MiniTask key={t.id} task={t} />)}</div>
        }
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({ tasks, today }: { tasks: Task[]; today: Date }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(d => addDays(d, -7))}
          className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">← Prev week</button>
        <p className="text-sm font-semibold">{format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}</p>
        <button onClick={() => setWeekStart(d => addDays(d, 7))}
          className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Next week →</button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const dayTasks = tasks.filter(t => isSameDay(new Date(t.deadline + "T00:00:00"), day));
          const isTodayDay = isSameDay(day, today);
          return (
            <div key={i} className="space-y-2">
              <div className={cn("rounded-lg p-2 text-center border", isTodayDay ? "bg-brand text-white border-brand" : "bg-card border-border")}>
                <p className="text-[10px] font-medium opacity-80">{format(day, "EEE")}</p>
                <p className="text-lg font-bold leading-none mt-0.5">{format(day, "d")}</p>
                {dayTasks.length > 0 && <p className="text-[10px] mt-0.5 opacity-70">{dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}</p>}
              </div>
              <div className="space-y-1.5">
                {dayTasks.map(task => (
                  <div key={task.id} className={cn("rounded-md p-1.5 border text-[10px] leading-snug", statusColors[task.status])}>
                    <p className="font-medium truncate">{task.name}</p>
                    {(task as any).project?.name && <p className="opacity-70 truncate">{(task as any).project.name}</p>}
                  </div>
                ))}
                {dayTasks.length === 0 && <div className="h-8 rounded-md border border-dashed border-border" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Gantt View ───────────────────────────────────────────────────────────────
const DAY_W   = 38;   // px per day column
const ROW_H   = 44;   // px per task row
const LABEL_W = 220;  // px for the task name sidebar
const DAYS    = 35;   // days visible at once

function GanttView({ tasks, today }: { tasks: Task[]; today: Date }) {
  const [rangeStart, setRangeStart] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const rangeEnd = addDays(rangeStart, DAYS - 1);
  const days     = Array.from({ length: DAYS }, (_, i) => addDays(rangeStart, i));
  const todayCol = differenceInDays(today, rangeStart);

  const sortedTasks = [...tasks]
    .filter(t => !t.deleted_at)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  // Group day headers by month
  const totalWidth = LABEL_W + DAYS * DAY_W;

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setRangeStart(d => addDays(d, -DAYS))}
          className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >← Prev</button>
        <p className="text-sm font-semibold">
          {format(rangeStart, "MMM d")} – {format(rangeEnd, "MMM d, yyyy")}
        </p>
        <button
          onClick={() => setRangeStart(d => addDays(d, DAYS))}
          className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >Next →</button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries({ pending: "Pending", in_progress: "In Progress", completed: "Completed", overdue: "Overdue" }).map(([k, label]) => (
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
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: totalWidth }}>

            {/* Month header */}
            <div className="flex border-b border-border bg-muted/30" style={{ minWidth: totalWidth }}>
              <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="sticky left-0 z-20 bg-muted/30 border-r border-border" />
              {days.map((day, i) => (
                <div
                  key={i}
                  style={{ width: DAY_W, minWidth: DAY_W }}
                  className={cn("border-r border-border/40 text-center py-1", isToday(day) && "bg-brand/10")}
                >
                  {(i === 0 || day.getDate() === 1) && (
                    <span className="text-[10px] font-semibold text-brand block">{format(day, "MMM yyyy")}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Day number header */}
            <div className="flex border-b border-border" style={{ minWidth: totalWidth }}>
              <div
                style={{ width: LABEL_W, minWidth: LABEL_W }}
                className="sticky left-0 z-20 bg-card border-r border-border flex items-center px-4"
              >
                <span className="text-xs font-medium text-muted-foreground">Task</span>
              </div>
              {days.map((day, i) => (
                <div
                  key={i}
                  style={{ width: DAY_W, minWidth: DAY_W }}
                  className={cn(
                    "border-r border-border/40 text-center py-1.5",
                    isToday(day) ? "bg-brand/10" : ""
                  )}
                >
                  <span className={cn("text-xs", isToday(day) ? "text-brand font-bold" : "text-muted-foreground")}>
                    {format(day, "d")}
                  </span>
                  <span className={cn("block text-[9px]", isToday(day) ? "text-brand/70" : "text-muted-foreground/50")}>
                    {format(day, "EEE")}
                  </span>
                </div>
              ))}
            </div>

            {/* Task rows */}
            {sortedTasks.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm">No tasks to display.</p>
              </div>
            ) : (
              sortedTasks.map((task, rowIdx) => {
                const taskStart   = new Date(task.created_at);
                const taskDeadline = new Date(task.deadline + "T00:00:00");

                const startOffset = differenceInDays(taskStart, rangeStart);
                const endOffset   = differenceInDays(taskDeadline, rangeStart);

                const clampedStart = Math.max(0, startOffset);
                const clampedEnd   = Math.min(DAYS - 1, endOffset);
                const isVisible    = clampedEnd >= 0 && clampedStart <= DAYS - 1 && clampedEnd >= clampedStart;

                const barLeft  = clampedStart * DAY_W + 2;
                const barWidth = isVisible ? Math.max((clampedEnd - clampedStart + 1) * DAY_W - 4, 8) : 0;

                const rowBg = rowIdx % 2 === 0 ? "bg-card" : "bg-muted/10";

                return (
                  <div
                    key={task.id}
                    className={cn("flex items-center border-b border-border/50 last:border-0", rowBg)}
                    style={{ height: ROW_H, minWidth: totalWidth }}
                  >
                    {/* Task label — sticky */}
                    <div
                      style={{ width: LABEL_W, minWidth: LABEL_W, height: ROW_H }}
                      className={cn("sticky left-0 z-10 border-r border-border flex flex-col justify-center px-4", rowBg)}
                    >
                      <p className="text-xs font-medium truncate leading-tight">{task.name}</p>
                      {(task as any).project?.name && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{(task as any).project.name}</p>
                      )}
                    </div>

                    {/* Bar area */}
                    <div className="relative flex-1" style={{ height: ROW_H }}>
                      {/* Today vertical line */}
                      {todayCol >= 0 && todayCol < DAYS && (
                        <div
                          style={{ left: todayCol * DAY_W + DAY_W / 2 }}
                          className="absolute top-0 bottom-0 w-px bg-brand/50 z-10 pointer-events-none"
                        />
                      )}

                      {/* Column zebra lines */}
                      {days.map((day, i) => (
                        <div
                          key={i}
                          style={{ left: i * DAY_W, width: DAY_W, height: ROW_H }}
                          className={cn("absolute top-0 border-r border-border/20", isToday(day) && "bg-brand/5")}
                        />
                      ))}

                      {/* Task bar */}
                      {isVisible && (
                        <div
                          style={{ left: barLeft, width: barWidth, top: 8, height: ROW_H - 16 }}
                          className={cn("absolute rounded-md overflow-hidden flex items-center", ganttBarColors[task.status])}
                        >
                          {/* Progress fill overlay */}
                          {task.progress > 0 && task.status !== "completed" && (
                            <div
                              style={{ width: `${task.progress}%` }}
                              className="absolute left-0 top-0 bottom-0 bg-white/25 rounded-md"
                            />
                          )}
                          {/* Label inside bar */}
                          {barWidth > 48 && (
                            <span className="relative z-10 text-[10px] text-white font-medium px-2 truncate">
                              {task.status === "completed" ? "Done" : task.progress > 0 ? `${task.progress}%` : format(new Date(task.deadline + "T00:00:00"), "MMM d")}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Out-of-range indicator */}
                      {!isVisible && endOffset < 0 && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">← before range</div>
                      )}
                      {!isVisible && startOffset >= DAYS && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">after range →</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { tasks, loading } = useTasks();
  const [view, setView] = useState<View>("gantt");
  const today = new Date();

  const views: { key: View; label: string }[] = [
    { key: "month", label: "Month" },
    { key: "week",  label: "Week"  },
    { key: "gantt", label: "Gantt" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendar</h2>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {views.map(({ key, label }) => (
            <button key={key} onClick={() => setView(key)}
              className={cn("px-3 py-1.5 text-sm rounded-md transition-colors font-medium",
                view === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-96 bg-muted rounded-xl animate-pulse" />
      ) : (
        <>
          {view === "month" && <MonthView tasks={tasks} today={today} />}
          {view === "week"  && <WeekView  tasks={tasks} today={today} />}
          {view === "gantt" && <GanttView tasks={tasks} today={today} />}
        </>
      )}
    </div>
  );
}
