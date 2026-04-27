"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Activity } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { ActivityLog } from "@/types";

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      const supabase = createClient();
      const { data } = await supabase
        .from("activity_log")
        .select("*, user:users(name), task:tasks(name, project:projects(name))")
        .order("created_at", { ascending: false })
        .limit(150);
      if (data) setLogs(data as ActivityLog[]);
      setLoading(false);
    }
    fetchActivity();
  }, []);

  // Group by calendar date
  const grouped = logs.reduce<Record<string, ActivityLog[]>>((acc, log) => {
    const date = format(new Date(log.created_at), "MMMM d, yyyy");
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-24 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Activity</h2>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <Activity size={40} className="opacity-30" />
          <p className="text-sm">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{date}</p>
              <div className="space-y-2">
                {entries.map(log => (
                  <div key={log.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.action}</p>
                      {(log as any).task?.name && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {(log as any).task.name}
                          {(log as any).task?.project?.name && ` · ${(log as any).task.project.name}`}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
