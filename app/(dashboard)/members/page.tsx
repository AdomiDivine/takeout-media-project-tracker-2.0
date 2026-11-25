"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import InviteMemberDialog from "@/components/members/InviteMemberDialog";
import { useUserStatuses, activeFirst } from "@/lib/hooks/useUserStatuses";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

type Counts = { total: number; in_progress: number; overdue: number; completed: number };

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, Counts>>({});
  const [loading, setLoading] = useState(true);
  const [viewerRole, setViewerRole] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const { statuses, refresh: refreshStatuses } = useUserStatuses();

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: users }, { data: tasks }, { data: me }] = await Promise.all([
      supabase.from("users").select("*").in("role", ["member"]).order("name"),
      supabase.from("tasks").select("id, created_by, status").is("deleted_at", null),
      user ? supabase.from("users").select("role").eq("id", user.id).single() : Promise.resolve({ data: null }),
    ]);

    if (users) setMembers(users as User[]);
    setViewerRole(me?.role ?? "");

    if (tasks) {
      const counts: Record<string, Counts> = {};
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const isAdmin = ["super_admin", "admin"].includes(viewerRole);
  const sorted = activeFirst(members, statuses);
  const deactivatedCount = members.filter(m => statuses[m.id]?.deactivated).length;
  const cols = "grid-cols-[2fr_1fr_1fr_0.6fr_0.6fr_0.6fr_0.6fr]";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {members.length - deactivatedCount} active team member{members.length - deactivatedCount !== 1 ? "s" : ""}
            {deactivatedCount > 0 && ` · ${deactivatedCount} deactivated`}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)} size="sm" className="bg-brand hover:bg-brand/90 text-white gap-1.5">
            <UserPlus size={15} />
            Invite member
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Table header */}
          <div className={cn("grid gap-4 px-5 py-3 border-b border-border bg-muted/30", cols)}>
            {["Member", "Job Title", "Last Active"].map(h => (
              <p key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</p>
            ))}
            {["Total", "Active", "Done", "Overdue"].map(h => (
              <p key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">{h}</p>
            ))}
          </div>

          {members.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">No members found.</p>
          )}

          {sorted.map(m => {
            const c = taskCounts[m.id] ?? { total: 0, in_progress: 0, overdue: 0, completed: 0 };
            const status = statuses[m.id];
            const deactivated = !!status?.deactivated;
            return (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className={cn(
                  "grid gap-4 px-5 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors items-center",
                  cols,
                  deactivated && "opacity-50"
                )}
              >
                {/* Name + email + avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 overflow-hidden", deactivated && "grayscale")}>
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-brand">{m.name[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.name}
                      {deactivated && (
                        <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border align-middle">
                          Deactivated
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                </div>

                {/* Job title */}
                <p className="text-sm text-muted-foreground truncate">{m.job_title || "—"}</p>

                {/* Last active */}
                <p className="text-xs text-muted-foreground truncate"
                  title={status?.last_active ? new Date(status.last_active).toLocaleString("en-GB") : undefined}>
                  {!status ? "—"
                    : status.last_active ? formatDistanceToNow(parseISO(status.last_active), { addSuffix: true })
                    : "Not joined yet"}
                </p>

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

      <InviteMemberDialog
        open={inviteOpen}
        canInviteAdmins={viewerRole === "super_admin"}
        onClose={() => setInviteOpen(false)}
        onInvited={() => { fetchData(); refreshStatuses(); }}
      />
    </div>
  );
}
