import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json([], { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("task_members")
    .select("user:users(*)")
    .eq("task_id", taskId);

  if (error) return NextResponse.json([], { status: 500 });

  const members = (data ?? []).map((r: any) => r.user).filter(Boolean);
  return NextResponse.json(members);
}
