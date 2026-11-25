import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

// Deactivating a user blocks them from logging in (Supabase auth ban) but keeps
// their account and everything they did: tasks, comments, learning records, etc.
// Reactivating lifts the ban.
// - Super admins can (de)activate anyone except themselves.
// - Admins can (de)activate members only.

// ~100 years: effectively permanent until reactivated
const BAN_DURATION = "876000h";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getCaller(supabase: SupabaseClient) {
  const userSupabase = await createUserClient();
  const { data: { user }, error } = await userSupabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  return { id: user.id, role: (profile?.role ?? "") as string };
}

// POST { userId, active: boolean }
export async function POST(req: NextRequest) {
  try {
    const supabase = serviceClient();
    const caller = await getCaller(supabase);
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId, active } = await req.json().catch(() => ({}));
    if (!userId || typeof userId !== "string" || typeof active !== "boolean") {
      return NextResponse.json({ error: "Missing userId or active" }, { status: 400 });
    }
    if (userId === caller.id) {
      return NextResponse.json({ error: "You can't deactivate your own account" }, { status: 400 });
    }

    const { data: target } = await supabase.from("users").select("role, name").eq("id", userId).single();
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const allowed =
      caller.role === "super_admin" ||
      (caller.role === "admin" && target.role === "member");
    if (!allowed) {
      return NextResponse.json({ error: "You don't have permission to change this user" }, { status: 403 });
    }

    const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: active ? "none" : BAN_DURATION,
    });
    if (banError) {
      console.error("[users/deactivate]", banError);
      return NextResponse.json({ error: banError.message }, { status: 500 });
    }

    await supabase.from("activity_log").insert({
      user_id: caller.id,
      action: `${active ? "Reactivated" : "Deactivated"} user account "${target.name}"`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[users/deactivate]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
