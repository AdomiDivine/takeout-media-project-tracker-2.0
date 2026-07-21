"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; in_progress: number; overdue: number; completed: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: users }, { data: tasks }] = await Promise.all([
        supabase.from("users").select("*").in("role", ["team_lead", "member"]).order("name"),
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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-14 border-b border-border/50 animate-pulse bg-muted/20" />
          ))}
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

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-border bg-muted/30">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Member</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Job Title</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Total</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Active</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Done</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Overdue</p>
        </div>

        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">No members found.</p>
        )}

        {members.map(m => {
          const c = taskCounts[m.id] ?? { total: 0, in_progress: 0, overdue: 0, completed: 0 };
          return (
            <Link
              key={m.id}
              href={`/members/${m.id}`}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors items-center"
            >
              {/* Name + email + avatar */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-brand">{m.name[0]}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
              </div>

              {/* Job title */}
              <p className="text-sm text-muted-foreground truncate">{m.job_title || "—"}</p>

              {/* Task counts */}
              <p className="text-sm font-semibold text-center">{c.total}</p>
              <p className="text-sm font-semibold text-center text-blue-400">{c.in_progress}</p>
              <p className="text-sm font-semibold text-center text-green-400">{c.completed}</p>
              <p className="text-sm font-semibold text-center text-red-400">{c.overdue}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
