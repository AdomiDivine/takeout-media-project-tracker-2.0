import { createClient } from "@/lib/supabase/client";

export async function logActivity({
  action,
  taskId,
  projectId,
}: {
  action: string;
  taskId?: string;
  projectId?: string;
}) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("activity_log").insert({
      user_id: user.id,
      action,
      task_id: taskId ?? null,
      project_id: projectId ?? null,
    });
  } catch {
    // Activity logging is non-critical — never block the main action
  }
}
