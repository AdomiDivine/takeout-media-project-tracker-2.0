import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { format } from "date-fns";

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { taskId, assignedUserId } = await req.json();
    if (!taskId || !assignedUserId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [{ data: task }, { data: assignee }] = await Promise.all([
      supabase
        .from("tasks")
        .select("name, deadline, priority, project:projects(name)")
        .eq("id", taskId)
        .single(),
      supabase
        .from("users")
        .select("name, email")
        .eq("id", assignedUserId)
        .single(),
    ]);

    if (!task || !assignee?.email) {
      return NextResponse.json({ error: "Task or user not found" }, { status: 404 });
    }

    const projectName = (task.project as any)?.name ?? "Unknown Project";
    const deadline = format(new Date(task.deadline + "T00:00:00"), "MMMM d, yyyy");
    const priority = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

    await sendEmail({
      to: assignee.email,
      subject: `You've been assigned to "${task.name}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #0f0f0f; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
          <div style="background: #e8460a; padding: 24px 32px;">
            <h1 style="margin: 0; font-size: 20px; color: #fff;">TM Slate</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="margin: 0 0 8px; font-size: 18px; color: #fff;">New Task Assignment</h2>
            <p style="margin: 0 0 24px; color: #a1a1a1;">Hi ${assignee.name}, you've been assigned to a task.</p>

            <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #fff;">${task.name}</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #a1a1a1; font-size: 13px; width: 80px;">Project</td>
                  <td style="padding: 4px 0; color: #e5e5e5; font-size: 13px;">${projectName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #a1a1a1; font-size: 13px;">Deadline</td>
                  <td style="padding: 4px 0; color: #e5e5e5; font-size: 13px;">${deadline}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #a1a1a1; font-size: 13px;">Priority</td>
                  <td style="padding: 4px 0; color: #e5e5e5; font-size: 13px;">${priority}</td>
                </tr>
              </table>
            </div>

            <p style="margin: 0; font-size: 12px; color: #666;">This is an automated notification from TM Slate.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[task-assigned email]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
