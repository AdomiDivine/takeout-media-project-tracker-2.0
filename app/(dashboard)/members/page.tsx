"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

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

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; in_progress: number; overdue: number; completed: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: users }, { data: tasks }] = await Promise.all([
        supabase.from("users").select("*").order("name"),
        supabase.from("tasks").select("id, created_by, status").is("deleted_at", null),
      ]);

      if (users) setMembers(users as User[]);

      if (tasks) {
        const counts: Record<string, { total: number; in_progress: number; overdue: number; completed: number }> = {};
        tasks.forEach(t => {
          if (!counts[t.created_by]) counts[t.created_by] = { total: 0, in_progress: 0, overdue: 0, completed: 0 };
          counts[t.created_by].total++;
          if (t.status === "in_progress") counts[t.created_by].in_progress++;
          if (t.status === "overdue")     counts[t.created_by].overdue++;
          if (t.status === "completed")   counts[t.created_by].completed++;
        });
        setTaskCounts(counts);
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {members.length} team member{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(m => {
          const c = taskCounts[m.id] ?? { total: 0, in_progress: 0, overdue: 0, completed: 0 };
          return (
            <Link
              key={m.id}
              href={`/members/${m.id}`}
              className="bg-card border border-border rounded-xl p-4 hover:border-brand/50 hover:bg-muted/10 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-brand">{m.name[0]}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  <Badge variant="outline" className={cn("text-[10px] mt-1.5", ROLE_STYLES[m.role])}>
                    {ROLE_LABELS[m.role]}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/50 text-center">
                <div>
                  <p className="text-base font-bold">{c.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-base font-bold text-blue-400">{c.in_progress}</p>
                  <p className="text-[10px] text-muted-foreground">Active</p>
                </div>
                <div>
                  <p className="text-base font-bold text-green-400">{c.completed}</p>
                  <p className="text-[10px] text-muted-foreground">Done</p>
                </div>
                <div>
                  <p className="text-base font-bold text-red-400">{c.overdue}</p>
                  <p className="text-[10px] text-muted-foreground">Overdue</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
