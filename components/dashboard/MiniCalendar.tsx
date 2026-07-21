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
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const today = new Date();

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPadding = getDay(startOfMonth(currentMonth));

  // Map "yyyy-MM-dd" → tasks created that day
  const createdMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      const key = format(parseISO(t.created_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [tasks]);

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

  const selKey = format(selectedDay, "yyyy-MM-dd");
  const selCreated = createdMap.get(selKey) ?? [];
  const selDue = deadlineMap.get(selKey) ?? [];

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

  function TaskRow({ task, label }: { task: Task; label?: string }) {
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[task.status] ?? "bg-muted-foreground"}`} />
        <span className="text-xs truncate flex-1">{task.name}</span>
        {label && <span className="text-[10px] text-muted-foreground flex-shrink-0">{label}</span>}
      </div>
    );
  }

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
              const isSelected = isSameDay(day, selectedDay);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`text-center text-xs rounded-full w-7 h-7 mx-auto flex items-center justify-center transition-colors ${
                    isToday
                      ? "bg-brand text-white font-bold"
                      : isSelected
                      ? "ring-1 ring-brand bg-muted text-foreground"
                      : isCurrentMonth
                      ? "text-foreground hover:bg-muted"
                      : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Day detail */}
          <div className="mt-3 pt-3 border-t border-border min-h-[40px]">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{format(selectedDay, "MMMM d, yyyy")}</p>
            {selCreated.length === 0 && selDue.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks on this day</p>
            ) : (
              <>
                {/* deduplicate tasks that appear in both lists */}
                {Array.from(new Map([...selCreated, ...selDue].map(t => [t.id, t])).values()).map(t => (
                  <TaskRow key={t.id} task={t} label={(t.project as any)?.name} />
                ))}
              </>
            )}
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
