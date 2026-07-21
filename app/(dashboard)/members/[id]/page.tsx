"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { User, Task } from "@/types";

const ROLE_STYLES: Record<string, string> = {
  super_admin: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  admin:       "bg-blue-500/10 text-blue-400 border-blue-500/30",
  team_lead:   "bg-amber-500/10 text-amber-400 border-amber-500/30",
  member:      "bg-muted text-muted-foreground border-border",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  team_lead:   "Team Lead",
  member:      "Member",
};

const STATUS_LABELS: Record<string, string> = {
  completed:   "Completed",
  in_progress: "In Progress",
  pending:     "Pending",
  overdue:     "Overdue",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending:     "bg-muted text-muted-foreground border-border",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  completed:   "bg-green-500/10 text-green-400 border-green-500/30",
  overdue:     "bg-red-500/10 text-red-400 border-red-500/30",
};

const PRIORITY_STYLES: Record<string, string> = {
  high:   "bg-red-500/10 text-red-400 border-red-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  low:    "bg-green-500/10 text-green-400 border-green-500/30",
};

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "in_progress" | "completed" | "overdue">("all");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [{ data: memberData }, { data: createdTasks }, { data: memberTaskIds }, { data: activityData }] =
        await Promise.all([
          supabase.from("users").select("*").eq("id", id).single(),
          supabase.from("tasks").select("*, project:projects(name)").eq("created_by", id).is("deleted_at", null),
          supabase.from("task_members").select("task_id").eq("user_id", id),
          supabase.from("activity_log")
            .select("*, task:tasks(name), project:projects(name)")
            .eq("user_id", id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

      const assignedIds = (memberTaskIds ?? []).map((m: any) => m.task_id);
      const { data: assignedTasks } = assignedIds.length > 0
        ? await supabase.from("tasks").select("*, project:projects(name)").is("deleted_at", null).in("id", assignedIds)
        : { data: [] };

      const allTasksMap = new Map<string, Task>();
      [...(createdTasks ?? []), ...(assignedTasks ?? [])].forEach(t => allTasksMap.set(t.id, t as Task));

      if (memberData) setMember(memberData as User);
      setTasks(Array.from(allTasksMap.values()));
      setActivity(activityData ?? []);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-28 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!member) return <p className="text-muted-foreground">Member not found.</p>;

  const stats = {
    total:       tasks.length,
    pending:     tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed:   tasks.filter(t => t.status === "completed").length,
    overdue:     tasks.filter(t => t.status === "overdue").length,
  };

  const filtered = activeTab === "all" ? tasks : tasks.filter(t => t.status === activeTab);

  const tabs: { key: typeof activeTab; label: string; count: number }[] = [
    { key: "all",         label: "All",         count: stats.total },
    { key: "in_progress", label: "In Progress",  count: stats.in_progress },
    { key: "completed",   label: "Completed",    count: stats.completed },
    { key: "overdue",     label: "Overdue",      count: stats.overdue },
  ];

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link href="/members" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Back to Members
      </Link>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-brand">{member.name[0]}</span>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold">{member.name}</h2>
          <p className="text-sm text-muted-foreground">{member.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={cn("text-xs", ROLE_STYLES[member.role])}>
              {ROLE_LABELS[member.role]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Member since {format(parseISO(member.created_at), "MMMM yyyy")}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total Tasks",   value: stats.total,       color: "text-foreground"    },
          { label: "Pending",       value: stats.pending,     color: "text-muted-foreground" },
          { label: "In Progress",   value: stats.in_progress, color: "text-blue-400"      },
          { label: "Completed",     value: stats.completed,   color: "text-green-400"     },
          { label: "Overdue",       value: stats.overdue,     color: "text-red-400"       },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tasks + Activity */}
      <div className="grid grid-cols-2 gap-5">
        {/* Tasks */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold mb-2">Tasks</h3>
            <div className="flex gap-1 flex-wrap">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors",
                    activeTab === t.key
                      ? "bg-brand text-white font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {t.label}
                  <span className={cn(
                    "text-[10px] font-semibold px-1 rounded",
                    activeTab === t.key ? "bg-white/20" : "bg-muted"
                  )}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border/40 max-h-96 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-10">No tasks</p>
            )}
            {filtered.map(t => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/10 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {(t.project as any)?.name ?? "—"} · Due {format(parseISO(t.deadline), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge variant="outline" className={cn("text-[10px] whitespace-nowrap", STATUS_BADGE_STYLES[t.status])}>
                    {STATUS_LABELS[t.status]}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] capitalize", PRIORITY_STYLES[t.priority])}>
                    {t.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
          </div>
          <div className="divide-y divide-border/40 max-h-96 overflow-y-auto">
            {activity.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-10">No activity yet</p>
            )}
            {activity.map((a: any) => (
              <div key={a.id} className="px-5 py-3">
                <p className="text-xs">{a.action}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
