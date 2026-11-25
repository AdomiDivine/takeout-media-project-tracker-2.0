import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

// POST { password } — the signed-in user permanently deletes their own account.
// Tasks, projects and brands they created are kept (creator cleared); their
// assignments, comments, notifications and learning records are removed.
export async function POST(req: NextRequest) {
  try {
    const userSupabase = await createUserClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { password } = await req.json().catch(() => ({}));
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Enter your password to confirm" }, { status: 400 });
    }

    // Confirm the password with a throwaway client (doesn't touch the user's session cookies)
    const verifier = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { error: pwError } = await verifier.auth.signInWithPassword({ email: user.email, password });
    if (pwError) return NextResponse.json({ error: "Password is incorrect" }, { status: 403 });
    await verifier.auth.signOut().catch(() => {});

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Don't let the team lose its last super admin
    const { data: profile } = await admin.from("users").select("role, name").eq("id", user.id).single();
    if (profile?.role === "super_admin") {
      const { count } = await admin.from("users").select("*", { count: "exact", head: true }).eq("role", "super_admin");
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "You're the only super admin. Make someone else a super admin before deleting your account." },
          { status: 400 }
        );
      }
    }

    // Log first (user_id is cleared automatically once the account is gone)
    await admin.from("activity_log").insert({
      user_id: user.id,
      action: `${profile?.name ?? "A user"} deleted their account`,
    });

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[account/delete]", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await userSupabase.auth.signOut().catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[account/delete]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
