import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { taskId, userIds } = await req.json();
    if (!taskId || !userIds?.length) {
      return NextResponse.json({ error: "Missing taskId or userIds" }, { status: 400 });
    }

    const rows = (userIds as string[]).map((userId: string) => ({
      task_id: taskId,
      user_id: userId,
    }));

    const { error } = await supabase
      .from("task_members")
      .upsert(rows, { onConflict: "task_id,user_id", ignoreDuplicates: true });

    if (error) {
      console.error("[assign]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { taskId, userId } = await req.json();
    if (!taskId || !userId) {
      return NextResponse.json({ error: "Missing taskId or userId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("task_members")
      .delete()
      .eq("task_id", taskId)
      .eq("user_id", userId);

    if (error) {
      console.error("[unassign]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
