"use client";

import { useEffect, useState, useCallback, useId } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStats } from "@/types";

export function useTaskStats() {
  const [stats, setStats] = useState<TaskStats>({ total: 0, completed: 0, in_progress: 0, pending: 0, overdue: 0 });
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const channelName = `stats-realtime-${useId()}`;

  const fetch = useCallback(async () => {
    // Same source as the task board: tasks the user created OR is assigned to.
    // Querying Supabase directly from the browser silently dropped assigned tasks
    // because of the projects RLS policy, so this goes through the server API.
    const res = await window.fetch("/api/tasks/mine");
    if (!res.ok) { setLoading(false); return; }
    const allTasks = ((await res.json()) as Task[]).filter(t => !t.deleted_at);

    const newStats: TaskStats = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === "completed").length,
      in_progress: allTasks.filter(t => t.status === "in_progress").length,
      pending: allTasks.filter(t => t.status === "pending").length,
      overdue: allTasks.filter(t => t.status === "overdue").length,
    };

    // Next 3 upcoming deadlines (not completed, not overdue, ordered by deadline)
    const upcoming = allTasks
      .filter(t => t.status !== "completed" && t.status !== "overdue")
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3);

    setStats(newStats);
    setUpcomingTasks(upcoming);
    setAllTasks(allTasks);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();

    // Refresh when tasks change or when someone is assigned/unassigned
    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_members" }, fetch)
      .subscribe();

    // Catch assignments made while the tab was in the background
    const handleVisibility = () => { if (document.visibilityState === "visible") fetch(); };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetch, channelName]);

  return { stats, upcomingTasks, allTasks, loading };
}
