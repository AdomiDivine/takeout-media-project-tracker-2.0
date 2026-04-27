import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    // Identify the calling user via their session cookie
    const userSupabase = await createUserClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json([], { status: 401 });
    }

    // Service role client — bypasses all RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const projectId = req.nextUrl.searchParams.get("projectId");

    // Get the user's role
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = ["super_admin", "admin"].includes(profile?.role ?? "");

    let query = supabase
      .from("tasks")
      .select("*, members:task_members(user:users(*)), project:projects(*)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    // Non-admins only see tasks they created or are assigned to
    if (!isAdmin) {
      const { data: assignments } = await supabase
        .from("task_members")
        .select("task_id")
        .eq("user_id", user.id);

      const assignedIds = (assignments ?? []).map((a: any) => a.task_id);

      if (assignedIds.length > 0) {
        query = query.or(`created_by.eq.${user.id},id.in.(${assignedIds.join(",")})`);
      } else {
        query = query.eq("created_by", user.id);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error("[tasks/mine]", error);
      return NextResponse.json([], { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error("[tasks/mine] unexpected error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
