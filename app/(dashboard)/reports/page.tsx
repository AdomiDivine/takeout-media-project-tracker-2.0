"use client";

import { useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/lib/hooks/useTasks";
import { useProjects } from "@/lib/hooks/useProjects";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, startOfWeek, addDays, isSameDay, subWeeks } from "date-fns";
import { cn } from "@/lib/utils";

type ReportView = "overview" | "weekly";

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
const statusLabels: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Completed", overdue: "Overdue",
};

export default function ReportsPage() {
  const { tasks, loading } = useTasks();
  const { projects } = useProjects();
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState<ReportView>("overview");

  const total      = tasks.length;
  const completed  = tasks.filter(t => t.status === "completed").length;
  const overdue    = tasks.filter(t => t.status === "overdue").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const pending    = tasks.filter(t => t.status === "pending").length;
  const completion = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Status pie data
  const statusData = [
    { name: "Completed",   value: completed,  color: STATUS_COLORS.completed },
    { name: "In Progress", value: inProgress, color: STATUS_COLORS.in_progress },
    { name: "Pending",     value: pending,    color: STATUS_COLORS.pending },
    { name: "Overdue",     value: overdue,    color: STATUS_COLORS.overdue },
  ].filter(d => d.value > 0);

  // Priority pie data
  const priorityData = [
    { name: "High",   value: tasks.filter(t => t.priority === "high").length,   color: PRIORITY_COLORS.high },
    { name: "Medium", value: tasks.filter(t => t.priority === "medium").length, color: PRIORITY_COLORS.medium },
    { name: "Low",    value: tasks.filter(t => t.priority === "low").length,    color: PRIORITY_COLORS.low },
  ].filter(d => d.value > 0);

  // Tasks per project bar data
  const projectData = projects
    .map(p => ({
      name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
      total: tasks.filter(t => t.project_id === p.id).length,
      done:  tasks.filter(t => t.project_id === p.id && t.status === "completed").length,
    }))
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  async function handleExport() {
    setExporting(true);
    const XLSX = await import("xlsx");
    const rows = tasks.map(t => ({
      "Task Name":    t.name,
      "Status":       STATUS_LABELS[t.status] ?? t.status,
      "Priority":     t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
      "Progress":     `${t.progress}%`,
      "Deadline":     t.deadline,
      "Project":      (t as any).project?.name ?? "—",
      "Created":      format(new Date(t.created_at), "MMM d, yyyy"),
      "Completed At": t.completed_at ? format(new Date(t.completed_at), "MMM d, yyyy") : "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, `tm-work-os-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
      <div className="flex items-center justify-between">
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
        <Button
          onClick={handleExport}
          disabled={exporting || tasks.length === 0}
          size="sm" variant="outline" className="gap-1.5"
        >
          <Download size={15} />
          {exporting ? "Exporting…" : "Export to Excel"}
        </Button>
      </div>

      {view === "overview" && <>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Tasks"    value={total}       sub={`${completion}% complete`} />
        <StatCard label="Completed"      value={completed}   />
        <StatCard label="In Progress"    value={inProgress}  />
        <StatCard label="Overdue"        value={overdue}     />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status donut */}
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

        {/* Priority donut */}
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

      {/* Tasks per project bar chart */}
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
              <Bar dataKey="done"  name="Completed"  stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} barSize={14} />
              <Bar dataKey="total" name="Total"       stackId="b" fill="#F97316" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground">Orange = total tasks · Green = completed</p>
        </div>
      )}
      </>}

      {/* ── Weekly view ── */}
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
