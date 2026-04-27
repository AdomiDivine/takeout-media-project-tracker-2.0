"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types";

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const channelName = useRef(`tasks-${projectId ?? "all"}-${Math.random().toString(36).slice(2)}`).current;

  const fetchTasks = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("tasks")
      .select(`*, members:task_members(user:users(*)), project:projects(*)`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) console.error("[useTasks] fetch error:", error.message, error.code, error.details, error.hint);
    if (data) setTasks(sortTasks(data as Task[]));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchTasks();

    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  return { tasks, loading, refetch: fetchTasks };
}

// Overdue first → oldest in-progress → newest pending → newest completed
function sortTasks(tasks: Task[]): Task[] {
  const order = { overdue: 0, in_progress: 1, pending: 2, completed: 3 };
  return [...tasks].sort((a, b) => {
    const orderDiff = order[a.status] - order[b.status];
    if (orderDiff !== 0) return orderDiff;
    if (a.status === "in_progress") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
