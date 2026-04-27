"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types";

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const channelName = useRef(`tasks-${projectId ?? "all"}-${Math.random().toString(36).slice(2)}`).current;

  const fetchTasks = useCallback(async () => {
    const url = projectId
      ? `/api/tasks/mine?projectId=${projectId}`
      : `/api/tasks/mine`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setTasks(sortTasks(data as Task[]));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchTasks();

    // Keep real-time subscription to trigger refetch on any task change
    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_members" }, fetchTasks)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  return { tasks, loading, refetch: fetchTasks };
}

// Overdue first → oldest in-progress → newest pending → newest completed
function sortTasks(tasks: Task[]): Task[] {
  const order: Record<string, number> = { overdue: 0, in_progress: 1, pending: 2, completed: 3 };
  return [...tasks].sort((a, b) => {
    const orderDiff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    if (a.status === "in_progress") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
