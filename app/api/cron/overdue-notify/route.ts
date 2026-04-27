import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { format, differenceInCalendarDays } from "date-fns";

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Protect the cron route with a secret header
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch overdue tasks that haven't had an email sent yet
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        id, name, deadline, priority,
        project:projects(name),
        members:task_members(user:users(name, email))
      `)
      .eq("status", "overdue")
      .eq("overdue_email_sent", false)
      .is("deleted_at", null);

    if (error) throw error;
    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    let sent = 0;

    for (const task of tasks) {
      const projectName = (task.project as any)?.name ?? "Unknown Project";
      const deadline = format(new Date(task.deadline + "T00:00:00"), "MMMM d, yyyy");
      const daysOverdue = differenceInCalendarDays(new Date(), new Date(task.deadline + "T00:00:00"));
      const priority = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
      const members: { name: string; email: string }[] = ((task.members as any[]) ?? [])
        .map((m: any) => m.user)
        .filter((u: any) => u?.email);

      for (const member of members) {
        await sendEmail({
          to: member.email,
          subject: `⚠ Task overdue: "${task.name}"`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #0f0f0f; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
              <div style="background: #c0392b; padding: 24px 32px;">
                <h1 style="margin: 0; font-size: 20px; color: #fff;">TM Slate — Overdue Alert</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="margin: 0 0 8px; font-size: 18px; color: #fff;">Task Overdue</h2>
                <p style="margin: 0 0 24px; color: #a1a1a1;">
                  Hi ${member.name}, a task assigned to you is now overdue
                  ${daysOverdue > 0 ? `by ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}` : ""}.
                </p>

                <div style="background: #1a1a1a; border: 1px solid #c0392b44; border-left: 3px solid #c0392b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #fff;">${task.name}</p>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 4px 0; color: #a1a1a1; font-size: 13px; width: 100px;">Project</td>
                      <td style="padding: 4px 0; color: #e5e5e5; font-size: 13px;">${projectName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #a1a1a1; font-size: 13px;">Deadline</td>
                      <td style="padding: 4px 0; color: #c0392b; font-size: 13px; font-weight: 600;">${deadline}</td>
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
        sent++;
      }

      // Mark this task's overdue email as sent
      await supabase.from("tasks").update({ overdue_email_sent: true }).eq("id", task.id);
    }

    return NextResponse.json({ sent, tasks: tasks.length });
  } catch (err: any) {
    console.error("[overdue-notify cron]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
