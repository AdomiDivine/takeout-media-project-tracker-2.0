"use client";

import { useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/lib/hooks/useTasks";
import { useProjects } from "@/lib/hooks/useProjects";
import { createClient } from "@/lib/supabase/client";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  format, startOfWeek, addDays, isSameDay, subWeeks,
  startOfMonth, startOfQuarter, startOfYear, isAfter,
} from "date-fns";
import { cn } from "@/lib/utils";

type ReportView   = "overview" | "weekly";
type DateRange    = "all" | "month" | "quarter" | "year";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all:     "All Time",
  month:   "This Month",
  quarter: "This Quarter",
  year:    "This Year",
};

const STATUS_COLORS: Record<string, string> = {
  completed:   "#22C55E",
  in_progress: "#F97316",
  pending:     "#6B7280",
  overdue:     "#EF4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   "#EF4444",
  medium: "#F97316",
  low:    "#22C55E",
};

const STATUS_LABELS: Record<string, string> = {
  completed:   "Completed",
  in_progress: "In Progress",
  pending:     "Pending",
  overdue:     "Overdue",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} tasks</p>
    </div>
  );
};

const statusColors: Record<string, string> = {
  pending:     "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30",
  in_progress: "bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30",
  completed:   "bg-status-completed/20 text-status-completed border-status-completed/30",
  overdue:     "bg-status-overdue/20 text-status-overdue border-status-overdue/30",
};

function getRangeStart(range: DateRange): Date | null {
  const now = new Date();
  if (range === "month")   return startOfMonth(now);
  if (range === "quarter") return startOfQuarter(now);
  if (range === "year")    return startOfYear(now);
  return null;
}

export default function ReportsPage() {
  const { tasks: allTasks, loading } = useTasks();
  const { projects } = useProjects();
  const [exporting, setExporting]   = useState(false);
  const [view, setView]             = useState<ReportView>("overview");
  const [dateRange, setDateRange]   = useState<DateRange>("all");

  const rangeStart = getRangeStart(dateRange);
  const tasks = rangeStart
    ? allTasks.filter(t => isAfter(new Date(t.created_at), rangeStart))
    : allTasks;

  const total      = tasks.length;
  const completed  = tasks.filter(t => t.status === "completed").length;
  const overdue    = tasks.filter(t => t.status === "overdue").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const pending    = tasks.filter(t => t.status === "pending").length;
  const completion = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statusData = [
    { name: "Completed",   value: completed,  color: STATUS_COLORS.completed },
    { name: "In Progress", value: inProgress, color: STATUS_COLORS.in_progress },
    { name: "Pending",     value: pending,    color: STATUS_COLORS.pending },
    { name: "Overdue",     value: overdue,    color: STATUS_COLORS.overdue },
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: "High",   value: tasks.filter(t => t.priority === "high").length,   color: PRIORITY_COLORS.high },
    { name: "Medium", value: tasks.filter(t => t.priority === "medium").length, color: PRIORITY_COLORS.medium },
    { name: "Low",    value: tasks.filter(t => t.priority === "low").length,    color: PRIORITY_COLORS.low },
  ].filter(d => d.value > 0);

  const projectData = projects
    .map(p => ({
      name:  p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
      total: tasks.filter(t => t.project_id === p.id).length,
      done:  tasks.filter(t => t.project_id === p.id && t.status === "completed").length,
    }))
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  async function handleExport() {
    setExporting(true);

    // Fetch user names to include in export
    const supabase = createClient();
    const { data: users } = await supabase.from("users").select("id, name");
    const userMap = new Map((users ?? []).map(u => [u.id, u.name as string]));

    const XLSX = await import("xlsx");
    const rows = tasks.map(t => ({
      "Task Name":    t.name,
      "Person":       userMap.get(t.created_by) ?? "—",
      "Status":       STATUS_LABELS[t.status] ?? t.status,
      "Priority":     t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
      "Progress":     `${t.progress}%`,
      "Start Date":   (t as any).start_date ?? "—",
      "Deadline":     t.deadline,
      "Project":      (t as any).project?.name ?? "—",
      "Created":      format(new Date(t.created_at), "MMM d, yyyy"),
      "Completed At": t.completed_at ? format(new Date(t.completed_at), "MMM d, yyyy") : "—",
    }));

    const rangeLabel = dateRange === "all" ? "all-time" : dateRange;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, `tm-workroom-report-${rangeLabel}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    setExporting(false);
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-28 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1,2].map(i => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: title + view toggle */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Reports</h2>
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            {(["overview", "weekly"] as ReportView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn("px-3 py-1 text-xs rounded-md font-medium transition-colors capitalize",
                  view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {v === "overview" ? "Overview" : "Weekly"}
              </button>
            ))}
          </div>
        </div>

        {/* Right: date range + export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            {(["all", "month", "quarter", "year"] as DateRange[]).map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className={cn("px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                  dateRange === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {DATE_RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting || tasks.length === 0}
            size="sm" variant="outline" className="gap-1.5"
          >
            <Download size={15} />
            {exporting ? "Exporting…" : "Export"}
          </Button>
        </div>
      </div>

      {view === "overview" && <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Tasks"    value={total}       sub={`${completion}% complete`} />
        <StatCard label="Completed"      value={completed}   />
        <StatCard label="In Progress"    value={inProgress}  />
        <StatCard label="Overdue"        value={overdue}     />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-medium text-sm">Tasks by Status</h3>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-medium text-sm">Tasks by Priority</h3>
          {priorityData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={priorityData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {projectData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">Tasks per Project</h3>
            <TrendingUp size={14} className="text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={projectData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Bar dataKey="done"  name="Completed" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} barSize={14} />
              <Bar dataKey="total" name="Total"     stackId="b" fill="#F97316" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground">Orange = total tasks · Green = completed</p>
        </div>
      )}
      </>}

      {view === "weekly" && (() => {
        const today = new Date();
        const weeks = Array.from({ length: 8 }, (_, i) => {
          const ws = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
          const we = addDays(ws, 6);
          const days = Array.from({ length: 7 }, (_, d) => addDays(ws, d));
          const weekTasks = tasks.filter(t => {
            const d = new Date(t.deadline + "T00:00:00");
            return d >= ws && d <= we;
          });
          return { ws, we, days, weekTasks };
        });

        return (
          <div className="space-y-4">
            {weeks.map(({ ws, we, days, weekTasks }, wi) => (
              <div key={wi} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {wi === 0 ? "This Week" : wi === 1 ? "Last Week" : `${format(ws, "MMM d")} – ${format(we, "MMM d")}`}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{weekTasks.length} task{weekTasks.length !== 1 ? "s" : ""}</span>
                    <span className="text-status-completed">{weekTasks.filter(t => t.status === "completed").length} done</span>
                    {weekTasks.filter(t => t.status === "overdue").length > 0 && (
                      <span className="text-status-overdue">{weekTasks.filter(t => t.status === "overdue").length} overdue</span>
                    )}
                  </div>
                </div>

                {weekTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No tasks this week.</p>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, di) => {
                      const dayTasks = weekTasks.filter(t => isSameDay(new Date(t.deadline + "T00:00:00"), day));
                      const isToday  = isSameDay(day, today);
                      return (
                        <div key={di} className="space-y-1">
                          <p className={cn("text-[10px] font-medium text-center py-1 rounded", isToday ? "bg-brand text-white" : "text-muted-foreground")}>
                            {format(day, "EEE d")}
                          </p>
                          {dayTasks.map(t => (
                            <div key={t.id} className={cn("rounded p-1.5 border text-[10px] leading-tight", statusColors[t.status])}>
                              <p className="font-medium truncate">{t.name}</p>
                              {(t as any).project?.name && <p className="opacity-70 truncate">{(t as any).project.name}</p>}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
