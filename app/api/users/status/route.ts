import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

export type UserStatus = { deactivated: boolean; last_active: string | null };

// GET: per-user account status for admins: { users: { [userId]: { deactivated, last_active } } }
// last_active = the later of their last login and their most recent activity-log entry.
export async function GET() {
  try {
    const userSupabase = await createUserClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["super_admin", "admin"].includes(profile?.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = Date.now();
    const users: Record<string, UserStatus> = {};
    const later = (a: string | null, b: string | null) =>
      !a ? b : !b ? a : new Date(a) > new Date(b) ? a : b;

    // Auth accounts: ban status + last login
    for (let page = 1; ; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      for (const u of data.users) {
        users[u.id] = {
          deactivated: !!u.banned_until && new Date(u.banned_until).getTime() > now,
          last_active: u.last_sign_in_at ?? null,
        };
      }
      if (data.users.length < 1000) break;
    }

    // Most recent activity per user (logins alone miss people who stay signed in)
    const { data: activity } = await supabase
      .from("activity_log")
      .select("user_id, created_at")
      .not("user_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(5000);
    const seen = new Set<string>();
    for (const a of activity ?? []) {
      if (seen.has(a.user_id)) continue;
      seen.add(a.user_id);
      if (users[a.user_id]) users[a.user_id].last_active = later(users[a.user_id].last_active, a.created_at);
    }

    return NextResponse.json({ users });
  } catch (err: unknown) {
    console.error("[users/status]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
