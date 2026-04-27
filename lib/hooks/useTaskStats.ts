"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStats } from "@/types";

export function useTaskStats() {
  const [stats, setStats] = useState<TaskStats>({ total: 0, completed: 0, in_progress: 0, pending: 0, overdue: 0 });
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // All active tasks for this user (created or assigned)
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*, project:projects(name)")
      .is("deleted_at", null)
      .or(`created_by.eq.${user.id},id.in.(${
        // We fetch task_members separately to avoid a complex join
        "select task_id from task_members where user_id = '" + user.id + "'"
      })`);

    // Simpler: just fetch tasks created by or assigned to user via separate queries
    const { data: createdTasks } = await supabase
      .from("tasks")
      .select("*, project:projects(name)")
      .is("deleted_at", null)
      .eq("created_by", user.id);

    const { data: memberTaskIds } = await supabase
      .from("task_members")
      .select("task_id")
      .eq("user_id", user.id);

    const assignedIds = (memberTaskIds ?? []).map((m: { task_id: string }) => m.task_id);

    const { data: assignedTasks } = assignedIds.length > 0
      ? await supabase.from("tasks").select("*, project:projects(name)").is("deleted_at", null).in("id", assignedIds)
      : { data: [] };

    // Merge and deduplicate
    const allTasksMap = new Map<string, Task>();
    [...(createdTasks ?? []), ...(assignedTasks ?? [])].forEach((t) => allTasksMap.set(t.id, t as Task));
    const allTasks = Array.from(allTasksMap.values());

    const newStats: TaskStats = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === "completed").length,
      in_progress: allTasks.filter(t => t.status === "in_progress").length,
      pending: allTasks.filter(t => t.status === "pending").length,
      overdue: allTasks.filter(t => t.status === "overdue").length,
    };

    // Next 3 upcoming deadlines (not completed, not overdue, ordered by deadline)
    const upcoming = allTasks
      .filter(t => t.status !== "completed" && t.status !== "overdue" && t.deleted_at === null)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3);

    setStats(newStats);
    setUpcomingTasks(upcoming);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const supabase = createClient();
    const channel = supabase
      .channel("stats-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  return { stats, upcomingTasks, loading };
}
