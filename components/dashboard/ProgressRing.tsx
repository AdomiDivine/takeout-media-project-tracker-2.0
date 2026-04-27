"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

interface ProgressRingProps {
  stats: { total: number; completed: number; in_progress: number; pending: number; overdue: number };
}

function getMotivation(pct: number) {
  if (pct === 0)   return "Let's get started!";
  if (pct < 26)    return "Good start, keep going!";
  if (pct < 51)    return "Making progress!";
  if (pct < 76)    return "Great Progress!";
  if (pct < 100)   return "Almost there!";
  return "All done! 🎉";
}

export default function ProgressRing({ stats }: ProgressRingProps) {
  const pct = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);

  const data = [{ value: pct, fill: "#fd4f05" }];

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-6">
      {/* Ring */}
      <div className="relative w-28 h-28 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="70%" outerRadius="100%"
            startAngle={90} endAngle={-270}
            data={[{ value: 100, fill: "hsl(var(--muted))" }, ...data]}
            barSize={10}
          >
            <RadialBar dataKey="value" cornerRadius={6} background={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{pct}%</span>
        </div>
      </div>

      {/* Labels + stats */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Overall Progress</p>
        <p className="text-lg font-bold mb-0.5">{getMotivation(pct)}</p>
        <p className="text-xs text-muted-foreground mb-4">You&apos;re doing great. Keep it up!</p>

        <div className="flex gap-4 flex-wrap">
          <Chip dot="bg-foreground/40"          label="Total Tasks"  value={stats.total}       />
          <Chip dot="bg-status-completed"       label="Completed"    value={stats.completed}   color="text-status-completed" />
          <Chip dot="bg-status-in-progress"     label="In Progress"  value={stats.in_progress} color="text-status-in-progress" />
          <Chip dot="bg-muted-foreground"       label="Pending"      value={stats.pending}     />
          {stats.overdue > 0 && (
            <Chip dot="bg-status-overdue" label="Overdue" value={stats.overdue} color="text-status-overdue" />
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, value, color }: { dot?: string; label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className={`text-lg font-bold leading-none ${color ?? ""}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
