import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json([], { status: 400 });

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("task_comments")
    .select("id, content, created_at, user:users(name)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[comments GET]", error);
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const userSupabase = await createUserClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId, content } = await req.json();
    if (!taskId || !content?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = serviceClient();
    const { error } = await supabase.from("task_comments").insert({
      task_id: taskId,
      user_id: user.id,
      content: content.trim(),
    });

    if (error) {
      console.error("[comments POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[comments POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
