"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type StatusKey = "all" | "completed" | "in_progress" | "pending" | "overdue";

interface ProgressRingProps {
  stats: { total: number; completed: number; in_progress: number; pending: number; overdue: number };
  activeFilter?: StatusKey;
  onFilterChange?: (key: StatusKey) => void;
}

function getMotivation(pct: number) {
  if (pct === 0)   return "Let's get started!";
  if (pct < 26)    return "Good start, keep going!";
  if (pct < 51)    return "Making progress!";
  if (pct < 76)    return "Great Progress!";
  if (pct < 100)   return "Almost there!";
  return "All done! 🎉";
}

export default function ProgressRing({ stats, activeFilter = "all", onFilterChange }: ProgressRingProps) {
  const pct = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);

  // Pie of task statuses (same colours as the old Task Overview chart); % complete in the middle
  const slices = [
    { name: "Completed",   value: stats.completed,   color: "#22C55E" },
    { name: "In Progress", value: stats.in_progress, color: "#F97316" },
    { name: "Pending",     value: stats.pending,     color: "#94a3b8" },
    { name: "Overdue",     value: stats.overdue,     color: "#EF4444" },
  ].filter(d => d.value > 0);

  const chips: { key: StatusKey; label: string; value: number; color: string; dot: string }[] = [
    { key: "all",         label: "All Tasks",   value: stats.total,       color: "",                          dot: "bg-foreground/40"      },
    { key: "completed",   label: "Completed",   value: stats.completed,   color: "text-status-completed",     dot: "bg-status-completed"   },
    { key: "in_progress", label: "In Progress", value: stats.in_progress, color: "text-status-in-progress",   dot: "bg-status-in-progress" },
    { key: "pending",     label: "Pending",     value: stats.pending,     color: "text-muted-foreground",     dot: "bg-muted-foreground"   },
    ...(stats.overdue > 0 ? [{ key: "overdue" as StatusKey, label: "Overdue", value: stats.overdue, color: "text-status-overdue", dot: "bg-status-overdue" }] : []),
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-6">
      <div className="relative w-28 h-28 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {slices.length === 0 ? (
              <Pie data={[{ value: 1 }]} dataKey="value" innerRadius="68%" outerRadius="100%" stroke="none" isAnimationActive={false}>
                <Cell fill="var(--muted)" />
              </Pie>
            ) : (
              <Pie data={slices} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%"
                paddingAngle={slices.length > 1 ? 2 : 0} startAngle={90} endAngle={-270} stroke="none">
                {slices.map(s => <Cell key={s.name} fill={s.color} />)}
              </Pie>
            )}
            {slices.length > 0 && (
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "11px" }}
                itemStyle={{ color: "var(--popover-foreground)" }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold leading-none">{pct}%</span>
          <span className="text-[10px] text-muted-foreground mt-1">done</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Overall Progress</p>
        <p className="text-lg font-bold mb-0.5">{getMotivation(pct)}</p>
        <p className="text-xs text-muted-foreground mb-4">You&apos;re doing great. Keep it up!</p>

        <div className="flex gap-3 flex-wrap">
          {chips.map(({ key, label, value, color, dot }) => (
            <button
              key={key}
              onClick={() => onFilterChange?.(key)}
              className={`flex flex-col items-center px-2 py-1 rounded-lg transition-colors ${
                activeFilter === key
                  ? "bg-brand/10 ring-1 ring-brand/30"
                  : "hover:bg-muted/60"
              }`}
            >
              <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">{label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
