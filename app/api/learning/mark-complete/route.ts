import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const userSupabase = await createUserClient();
  const { data: { user }, error: authError } = await userSupabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify admin
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: adminProfile } = await supabase.from("users").select("role, name").eq("id", user.id).single();
  if (!["super_admin", "admin"].includes(adminProfile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { materialId, observableImpact, comment, followUpRequired, opsNotes } = await req.json();
  if (!materialId) return NextResponse.json({ error: "materialId required" }, { status: 400 });

  const { data: material, error: updateError } = await supabase
    .from("learning_materials")
    .update({
      status: "completed",
      observable_impact: observableImpact || null,
      comment: comment || null,
      follow_up_required: followUpRequired ?? false,
      ops_notes: opsNotes || null,
    })
    .eq("id", materialId)
    .select("user_id, title")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Notify the material owner
  if (material?.user_id) {
    await supabase.from("notifications").insert({
      user_id: material.user_id,
      message: `Your learning material "${material.title}" has been approved and marked complete.`,
      type: "learning_review",
      read_status: false,
    });
  }

  return NextResponse.json({ ok: true });
}
