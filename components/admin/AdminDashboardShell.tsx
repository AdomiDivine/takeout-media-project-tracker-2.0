"use client";

import { useState, useEffect } from "react";
import { Users, Briefcase, Play, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task, User } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  completed: "#22C55E",
  in_progress: "#F97316",
  pending: "#6B7280",
  overdue: "#EF4444",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  pending: "Pending",
  overdue: "Overdue",
};

const PRIORITY_STYLES: Record<string, string> = {
  high:   "bg-red-500/10 text-red-400 border-red-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  low:    "bg-green-500/10 text-green-400 border-green-500/30",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending:     "bg-muted text-muted-foreground border-border",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  completed:   "bg-green-500/10 text-green-400 border-green-500/30",
  overdue:     "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function AdminDashboardShell({ userName }: { userName: string }) {
  const [memberCount, setMemberCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const supabase = createClient();
      const [
        { count: mc },
        { count: pc },
        { data: taskData },
        { data: memberData },
        { data: activityData },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("tasks")
          .select("*, project:projects(name)")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("users").select("*").order("name"),
        supabase.from("activity_log")
          .select("*, user:users(name, avatar_url), task:tasks(name), project:projects(name)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      setMemberCount(mc ?? 0);
      setProjectCount(pc ?? 0);
      setTasks(taskData ?? []);
      setMembers((memberData ?? []) as User[]);
      setActivity(activityData ?? []);
      setLoading(false);
    }
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 h-64 bg-muted rounded-xl animate-pulse" />
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-56 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const completedThisWeek = tasks.filter(t =>
    t.status === "completed" &&
    t.completed_at &&
    isWithinInterval(parseISO(t.completed_at), { start: weekStart, end: weekEnd })
  ).length;

  const stats = {
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    overdue:     tasks.filter(t => t.status === "overdue").length,
    completed:   tasks.filter(t => t.status === "completed").length,
    pending:     tasks.filter(t => t.status === "pending").length,
  };

  const recentTasks = tasks.slice(0, 8);

  const upcoming = tasks
    .filter(t => t.status !== "completed" && t.status !== "overdue")
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 6);

  const workload = members.map(m => {
    const mt = tasks.filter(t => t.created_by === m.id);
    return {
      member: m,
      total: mt.length,
      in_progress: mt.filter(t => t.status === "in_progress").length,
      overdue: mt.filter(t => t.status === "overdue").length,
    };
  }).filter(w => w.total > 0).slice(0, 6);

  const pieData = [
    { name: "In Progress", value: stats.in_progress, color: STATUS_COLORS.in_progress },
    { name: "Pending",     value: stats.pending,     color: STATUS_COLORS.pending },
    { name: "Overdue",     value: stats.overdue,     color: STATUS_COLORS.overdue },
    { name: "Completed",   value: stats.completed,   color: STATUS_COLORS.completed },
  ].filter(d => d.value > 0);

  const totalTasks = tasks.length;

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Good morning, {userName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's an overview of your team's work.</p>
        </div>
        <span className="text-sm text-muted-foreground border border-border rounded-lg px-3 py-1.5">
          {format(now, "EEEE, MMM d yyyy")}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total Members",       value: memberCount,          icon: Users,         color: "text-blue-400",   bg: "bg-blue-500/10"   },
          { label: "Active Projects",      value: projectCount,         icon: Briefcase,     color: "text-purple-400", bg: "bg-purple-500/10" },
          { label: "Tasks In Progress",    value: stats.in_progress,    icon: Play,          color: "text-amber-400",  bg: "bg-amber-500/10"  },
          { label: "Overdue Tasks",        value: stats.overdue,        icon: AlertTriangle, color: "text-red-400",    bg: "bg-red-500/10"    },
          { label: "Completed This Week",  value: completedThisWeek,    icon: CheckCircle2,  color: "text-green-400",  bg: "bg-green-500/10"  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("p-1.5 rounded-lg", bg, color)}>
                <Icon size={14} />
              </div>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            </div>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Team Tasks + Upcoming Deadlines */}
      <div className="grid grid-cols-3 gap-5">
        {/* Team tasks table */}
        <div className="col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Team's Tasks</h3>
            <Link href="/tasks" className="text-xs text-brand hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-2.5">Task</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Project</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Due Date</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Priority</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map(t => (
                  <tr key={t.id} className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3 max-w-[180px]">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                    </td>
                    <td className="px-3 py-3 max-w-[120px]">
                      <p className="text-xs text-muted-foreground truncate">{(t.project as any)?.name ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="text-xs text-muted-foreground">{format(parseISO(t.deadline), "MMM d, yyyy")}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={cn("text-[10px] whitespace-nowrap", STATUS_BADGE_STYLES[t.status])}>
                        {STATUS_LABELS[t.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={cn("text-[10px] capitalize", PRIORITY_STYLES[t.priority])}>
                        {t.priority}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {recentTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-muted-foreground py-10">No tasks yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Upcoming Deadlines</h3>
          </div>
          <div className="p-3 space-y-1">
            {upcoming.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No upcoming deadlines</p>
            )}
            {upcoming.map(t => {
              const dl = parseISO(t.deadline);
              return (
                <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="text-center flex-shrink-0 w-9 bg-muted rounded-lg py-1">
                    <p className="text-[9px] text-muted-foreground uppercase leading-none">{format(dl, "MMM")}</p>
                    <p className="text-base font-bold leading-tight">{format(dl, "d")}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{(t.project as any)?.name ?? "—"}</p>
                    <Badge variant="outline" className={cn("text-[10px] mt-1", PRIORITY_STYLES[t.priority])}>
                      {t.priority}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Workload + Tasks by Status + Recent Activity */}
      <div className="grid grid-cols-3 gap-5">
        {/* Team Workload */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Team Workload</h3>
            <Link href="/members" className="text-xs text-brand hover:underline">View all</Link>
          </div>
          <div className="p-3 space-y-1">
            {workload.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No task data yet</p>
            )}
            {workload.map(({ member, total, in_progress: ip, overdue }) => (
              <Link
                key={member.id}
                href={`/members/${member.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-brand">{member.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{member.name}</p>
                  <div className="w-full h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${Math.min((ip / Math.max(total, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold">{total} tasks</p>
                  {overdue > 0 && <p className="text-[10px] text-red-400">{overdue} overdue</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tasks by Status */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Tasks by Status</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total {totalTasks} tasks</p>
          </div>
          <div className="p-3">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={48} outerRadius={68}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
                          <p className="font-medium">{payload[0].name}</p>
                          <p className="text-muted-foreground">{payload[0].value} tasks</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-1">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <Link href="/activity" className="text-xs text-brand hover:underline">View all</Link>
          </div>
          <div className="p-3 space-y-1">
            {activity.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No recent activity</p>
            )}
            {activity.map((a: any) => (
              <div key={a.id} className="flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0">
                <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
                  {a.user?.avatar_url ? (
                    <img src={a.user.avatar_url} alt={a.user?.name ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-brand">{(a.user?.name ?? "?")[0]}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug">{a.action}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(parseISO(a.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
