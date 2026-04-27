"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/lib/hooks/useTasks";
import { format, isSameDay, startOfWeek, addDays, isThisWeek, isThisMonth, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

type View = "month" | "week" | "timeline";

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
        {/* Nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setNavDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">← Prev</button>
          <p className="text-sm font-semibold">{format(navDate, "MMMM yyyy")}</p>
          <button onClick={() => setNavDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Next →</button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map(({ date, outside }, i) => {
            const isSel    = isSameDay(date, selected);
            const isTod    = isSameDay(date, today);
            const isOvd    = tasks.some(t => t.status === "overdue" && isSameDay(new Date(t.deadline + "T00:00:00"), date));
            const hasDue   = tasks.some(t => isSameDay(new Date(t.deadline + "T00:00:00"), date));
            return (
              <button key={i} onClick={() => setSelected(date)}
                className={cn(
                  "relative flex flex-col items-center justify-center h-10 rounded-md text-sm transition-colors",
                  isSel   && "bg-brand text-white",
                  isTod   && !isSel && "bg-muted font-semibold",
                  !isSel  && "hover:bg-muted",
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

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-brand inline-block" /> Tasks due</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-status-overdue inline-block" /> Overdue</span>
        </div>
      </div>

      {/* Selected day tasks */}
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
      {/* Nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(d => addDays(d, -7))}
          className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">← Prev week</button>
        <p className="text-sm font-semibold">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </p>
        <button onClick={() => setWeekStart(d => addDays(d, 7))}
          className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Next week →</button>
      </div>

      {/* 7 columns */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const dayTasks = tasks.filter(t => isSameDay(new Date(t.deadline + "T00:00:00"), day));
          const isToday  = isSameDay(day, today);
          return (
            <div key={i} className="space-y-2">
              {/* Day header */}
              <div className={cn("rounded-lg p-2 text-center border", isToday ? "bg-brand text-white border-brand" : "bg-card border-border")}>
                <p className="text-[10px] font-medium opacity-80">{format(day, "EEE")}</p>
                <p className="text-lg font-bold leading-none mt-0.5">{format(day, "d")}</p>
                {dayTasks.length > 0 && (
                  <p className="text-[10px] mt-0.5 opacity-70">{dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}</p>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-1.5">
                {dayTasks.map(task => (
                  <div key={task.id} className={cn("rounded-md p-1.5 border text-[10px] leading-snug", statusColors[task.status])}>
                    <p className="font-medium truncate">{task.name}</p>
                    {(task as any).project?.name && <p className="opacity-70 truncate">{(task as any).project.name}</p>}
                  </div>
                ))}
                {dayTasks.length === 0 && (
                  <div className="h-8 rounded-md border border-dashed border-border" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Timeline View ────────────────────────────────────────────────────────────
function TimelineView({ tasks, today }: { tasks: Task[]; today: Date }) {
  const active = tasks.filter(t => t.status !== "completed");

  const groups: { label: string; tasks: Task[] }[] = [
    { label: "Overdue",    tasks: active.filter(t => t.status === "overdue") },
    { label: "Today",      tasks: active.filter(t => t.status !== "overdue" && isToday(new Date(t.deadline + "T00:00:00"))) },
    { label: "This Week",  tasks: active.filter(t => t.status !== "overdue" && !isToday(new Date(t.deadline + "T00:00:00")) && isThisWeek(new Date(t.deadline + "T00:00:00"), { weekStartsOn: 1 })) },
    { label: "This Month", tasks: active.filter(t => t.status !== "overdue" && !isThisWeek(new Date(t.deadline + "T00:00:00"), { weekStartsOn: 1 }) && isThisMonth(new Date(t.deadline + "T00:00:00"))) },
    { label: "Later",      tasks: active.filter(t => {
      const d = new Date(t.deadline + "T00:00:00");
      return t.status !== "overdue" && !isThisMonth(d) && !isPast(d);
    })},
  ].filter(g => g.tasks.length > 0);

  if (groups.length === 0)
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
        <p className="text-sm">No upcoming tasks.</p>
      </div>
    );

  return (
    <div className="space-y-6">
      {groups.map(({ label, tasks: groupTasks }) => (
        <div key={label} className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-2 top-6 bottom-0 w-px bg-border" />

          {/* Group label */}
          <div className="flex items-center gap-2 mb-3">
            <div className={cn("absolute left-0 w-4 h-4 rounded-full border-2 border-background",
              label === "Overdue" ? "bg-status-overdue" :
              label === "Today"   ? "bg-brand" :
              "bg-muted-foreground/40"
            )} />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{groupTasks.length}</span>
          </div>

          {/* Tasks */}
          <div className="space-y-2">
            {groupTasks.map(task => (
              <div key={task.id} className={cn("bg-card border rounded-lg p-3 flex items-start justify-between gap-3", task.status === "overdue" ? "border-status-overdue/40" : "border-border")}>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium leading-snug">{task.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {(task as any).project?.name && <span>{(task as any).project.name}</span>}
                    <span>·</span>
                    <span>Due {format(new Date(task.deadline + "T00:00:00"), "MMM d")}</span>
                    <span className={cn("font-medium", priorityColors[task.priority])}>· {task.priority} priority</span>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", statusColors[task.status])}>
                  {statusLabels[task.status]}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { tasks, loading } = useTasks();
  const [view, setView] = useState<View>("month");
  const today = new Date();

  const views: { key: View; label: string }[] = [
    { key: "month",    label: "Month" },
    { key: "week",     label: "Week" },
    { key: "timeline", label: "Timeline" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendar</h2>
        {/* View toggle */}
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
          {view === "month"    && <MonthView    tasks={tasks} today={today} />}
          {view === "week"     && <WeekView     tasks={tasks} today={today} />}
          {view === "timeline" && <TimelineView tasks={tasks} today={today} />}
        </>
      )}
    </div>
  );
}
