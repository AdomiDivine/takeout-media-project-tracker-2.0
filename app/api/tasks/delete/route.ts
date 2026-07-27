import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const userSupabase = await createUserClient();
  const { data: { user }, error: authError } = await userSupabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await req.json();
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the task and caller's role in one shot
  const [{ data: task }, { data: profile }] = await Promise.all([
    supabase.from("tasks").select("created_by").eq("id", taskId).single(),
    supabase.from("users").select("role").eq("id", user.id).single(),
  ]);

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const isAdmin = ["super_admin", "admin"].includes(profile?.role ?? "");
  const isCreator = task.created_by === user.id;

  if (!isAdmin && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
