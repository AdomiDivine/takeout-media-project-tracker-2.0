import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const userSupabase = await createUserClient();
  const { data: { user }, error: authError } = await userSupabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { materialId, keyLearning, applicationEvidence, completionDate } = await req.json();
  if (!materialId) return NextResponse.json({ error: "materialId required" }, { status: 400 });

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Update the material
  const { error: updateError } = await supabase
    .from("learning_materials")
    .update({
      status: "under_review",
      key_learning: keyLearning || null,
      application_evidence: applicationEvidence || null,
      completion_date: completionDate || new Date().toISOString().split("T")[0],
    })
    .eq("id", materialId)
    .eq("user_id", user.id); // ensure it belongs to this user

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Get submitter name and material title for the notification message
  const [{ data: profile }, { data: material }] = await Promise.all([
    supabase.from("users").select("name").eq("id", user.id).single(),
    supabase.from("learning_materials").select("title").eq("id", materialId).single(),
  ]);

  // Fetch all admin users to notify
  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .in("role", ["super_admin", "admin"]);

  if (admins && admins.length > 0) {
    const notifications = admins.map((a: any) => ({
      user_id: a.id,
      message: `${profile?.name ?? "A member"} submitted "${material?.title ?? "a learning material"}" for review.`,
      type: "learning_review",
      read_status: false,
    }));
    await supabase.from("notifications").insert(notifications);
  }

  return NextResponse.json({ ok: true });
}
