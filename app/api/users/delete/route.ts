import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

// Permanently deletes a user's account.
// - Super admins can delete anyone except themselves.
// - Admins can delete members only.
// Deleting the auth user cascades to public.users. Tasks, projects and brands they
// created are kept (creator set to null); their assignments, comments,
// notifications and learning records are removed.
export async function DELETE(req: NextRequest) {
  try {
    const userSupabase = await createUserClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json().catch(() => ({}));
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (userId === user.id) {
      return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [{ data: caller }, { data: target }] = await Promise.all([
      supabase.from("users").select("role").eq("id", user.id).single(),
      supabase.from("users").select("role, name").eq("id", userId).single(),
    ]);

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const callerRole = caller?.role ?? "";
    const allowed =
      callerRole === "super_admin" ||
      (callerRole === "admin" && target.role === "member");

    if (!allowed) {
      return NextResponse.json({ error: "You don't have permission to delete this user" }, { status: 403 });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[users/delete]", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Record who removed whom (user_id is the admin who did it)
    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: `Deleted user account "${target.name}"`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[users/delete]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
