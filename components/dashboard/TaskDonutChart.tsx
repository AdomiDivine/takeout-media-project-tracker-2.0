"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { TaskStats } from "@/types";

interface TaskDonutChartProps {
  stats: TaskStats;
}

export default function TaskDonutChart({ stats }: TaskDonutChartProps) {
  const data = [
    { name: "Pending",     value: stats.pending,     color: "#94a3b8" },
    { name: "In Progress", value: stats.in_progress, color: "#F97316" },
    { name: "Completed",   value: stats.completed,   color: "#22C55E" },
    { name: "Overdue",     value: stats.overdue,     color: "#EF4444" },
  ].filter(d => d.value > 0);

  const isEmpty = stats.total === 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3">Task Overview</h3>

      {isEmpty ? (
        <p className="text-xs text-muted-foreground py-2">No tasks yet.</p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={22} outerRadius={36} paddingAngle={2} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 flex-1">
            {[
              { label: "Pending",     value: stats.pending,     color: "bg-slate-400" },
              { label: "In Progress", value: stats.in_progress, color: "bg-status-in-progress" },
              { label: "Completed",   value: stats.completed,   color: "bg-status-completed" },
              ...(stats.overdue > 0 ? [{ label: "Overdue", value: stats.overdue, color: "bg-status-overdue" }] : []),
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
                <span className="text-[11px] font-medium">
                  {stats.total > 0 ? Math.round((value / stats.total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
