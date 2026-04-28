import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  try {
    const userSupabase = await createUserClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = ["super_admin", "admin", "team_lead"].includes(profile?.role ?? "");

    const body = await req.json();
    const { taskId, ...fields } = body;
    if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

    const adminFields  = ["name", "deadline", "priority", "status", "progress", "blocker", "attachment_url", "completed_at"];
    const memberFields = ["status", "progress", "blocker", "completed_at"];
    const allowed      = isAdmin ? adminFields : memberFields;

    const updatePayload: Record<string, any> = {};
    for (const key of allowed) {
      if (key in fields) updatePayload[key] = fields[key];
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { error } = await supabase.from("tasks").update(updatePayload).eq("id", taskId);
    if (error) {
      console.error("[tasks/update]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[tasks/update]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
