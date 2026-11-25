"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameDay, isSameMonth, addMonths, subMonths,
  startOfWeek, endOfWeek, parseISO, isWithinInterval,
} from "date-fns";
import type { Task } from "@/types";

interface Props {
  tasks: Task[];
}

const STATUS_DOT: Record<string, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-500",
  overdue: "bg-red-500",
  pending: "bg-muted-foreground",
};

export default function MiniCalendar({ tasks }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const today = new Date();

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPadding = getDay(startOfMonth(currentMonth));

  // Map "yyyy-MM-dd" → tasks due that day
  const deadlineMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      if (t.deadline) {
        const key = t.deadline.slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
    });
    return map;
  }, [tasks]);

  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const weekTasks = useMemo(() =>
    tasks.filter(t => {
      const created = parseISO(t.created_at);
      if (isWithinInterval(created, { start: weekStart, end: weekEnd })) return true;
      if (t.deadline) {
        const dl = parseISO(t.deadline);
        if (isWithinInterval(dl, { start: weekStart, end: weekEnd })) return true;
      }
      return false;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks]
  );

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">My Calendar</h3>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setView("month")}
            className={`p-1 rounded transition-colors ${view === "month" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}
            title="Month view"
          >
            <CalendarDays size={13} />
          </button>
          <button
            onClick={() => setView("week")}
            className={`p-1 rounded transition-colors ${view === "week" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}
            title="This week"
          >
            <List size={13} />
          </button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {view === "month" && (
        <>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-muted-foreground hover:text-foreground p-0.5 rounded">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-medium">{format(currentMonth, "MMMM yyyy")}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-muted-foreground hover:text-foreground p-0.5 rounded">
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const due = deadlineMap.get(format(day, "yyyy-MM-dd")) ?? [];

              return (
                <div
                  key={day.toISOString()}
                  title={due.length ? `Due: ${due.map(t => t.name).join(", ")}` : undefined}
                  className={`relative text-center text-xs rounded-full w-7 h-7 mx-auto flex items-center justify-center ${
                    isToday
                      ? "bg-brand text-white font-bold"
                      : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                  {/* Dot = something is due this day (details are in Upcoming Deadlines) */}
                  {due.length > 0 && (
                    <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? "bg-white" : "bg-brand"}`} />
                  )}
                </div>
              );
            })}
          </div>

        </>
      )}

      {/* WEEK VIEW */}
      {view === "week" && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </p>
          {weekTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No tasks this week</p>
          ) : (
            <div className="space-y-0.5">
              {weekTasks.map(t => (
                <div key={t.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${STATUS_DOT[t.status] ?? "bg-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {(t.project as any)?.name && (
                        <span className="text-[10px] text-muted-foreground truncate">{(t.project as any).name}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                        Due {format(parseISO(t.deadline), "MMM d")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
