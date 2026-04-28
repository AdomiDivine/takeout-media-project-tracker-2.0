import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { taskId, assignedUserId, assignedById } = await req.json();
    if (!taskId || !assignedUserId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [{ data: task }, { data: assignee }, { data: assigner }] = await Promise.all([
      supabase
        .from("tasks")
        .select("name, deadline, priority, project:projects(name), created_by")
        .eq("id", taskId)
        .single(),
      supabase.from("users").select("name, email").eq("id", assignedUserId).single(),
      assignedById
        ? supabase.from("users").select("name").eq("id", assignedById).single()
        : Promise.resolve({ data: null }),
    ]);

    // Fallback: if the users table row is missing or has no email, pull from auth.users
    let assigneeEmail = assignee?.email ?? null;
    let assigneeName  = assignee?.name  ?? null;
    if (!assigneeEmail) {
      const { data: authUserData } = await supabase.auth.admin.getUserById(assignedUserId);
      assigneeEmail = authUserData?.user?.email ?? null;
      assigneeName  = assigneeName ?? authUserData?.user?.user_metadata?.name ?? authUserData?.user?.email?.split("@")[0] ?? "there";
    }

    if (!task || !assigneeEmail) {
      console.error("[task-assigned email] no email found for user", assignedUserId);
      return NextResponse.json({ error: "Task or user not found" }, { status: 404 });
    }

    const projectName  = (task.project as any)?.name ?? "Unknown Project";
    const deadline     = format(new Date(task.deadline + "T00:00:00"), "EEEE, MMMM d yyyy");
    const assignerName = (assigner as any)?.name ?? "your team lead";
    const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    const priorityColor = task.priority === "high" ? "#e74c3c" : task.priority === "medium" ? "#f39c12" : "#27ae60";

    const displayName = assigneeName ?? "there";

    await sendEmail({
      to: assigneeEmail,
      subject: `You have a new task on TM Slate — "${task.name}"`,
      text: `Hi ${displayName}, ${assignerName} has assigned you a new task: "${task.name}" on the ${projectName} project. Deadline: ${deadline}. Priority: ${priorityLabel}. Log in to TM Slate to get started.`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#e8460a,#ff6b35);padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">TM Slate</p>
                  <h1 style="margin:8px 0 0;font-size:26px;color:#ffffff;font-weight:700;line-height:1.2;">New Task Assigned</h1>
                </td>
                <td align="right" style="vertical-align:top;">
                  <div style="background:rgba(255,255,255,0.2);border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:48px;text-align:center;">📋</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0;font-size:16px;color:#111827;font-weight:600;">Hi ${displayName},</p>
            <p style="margin:12px 0 0;font-size:15px;color:#6b7280;line-height:1.6;">
              <strong style="color:#e8460a;">${assignerName}</strong> has assigned you a new task on TM Slate.
              Here's everything you need to know to hit the ground running:
            </p>
          </td>
        </tr>

        <!-- Task Card -->
        <tr>
          <td style="padding:24px 40px;">
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid #e8460a;border-radius:12px;padding:24px;">
              <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;font-weight:600;">Task</p>
              <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111827;line-height:1.3;">${task.name}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:120px;font-size:13px;color:#9ca3af;font-weight:500;">Project</td>
                        <td style="font-size:13px;color:#111827;font-weight:600;">${projectName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:120px;font-size:13px;color:#9ca3af;font-weight:500;">Deadline</td>
                        <td style="font-size:13px;color:#111827;font-weight:600;">${deadline}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:120px;font-size:13px;color:#9ca3af;font-weight:500;">Priority</td>
                        <td>
                          <span style="display:inline-block;background:${priorityColor}18;color:${priorityColor};font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid ${priorityColor}44;">
                            ${priorityLabel}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:120px;font-size:13px;color:#9ca3af;font-weight:500;">Assigned by</td>
                        <td style="font-size:13px;color:#111827;font-weight:600;">${assignerName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>

        <!-- Message -->
        <tr>
          <td style="padding:0 40px 24px;">
            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;">
              As you work through this task, remember to keep your progress updated on TM Slate —
              it helps the whole team stay aligned and ensures nothing falls through the cracks.
              Log in, open the task, and use the progress bar to show where you're at.
            </p>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td style="padding:0 40px 36px;" align="center">
            <a href="https://tm-slate.vercel.app"
               style="display:inline-block;background:linear-gradient(135deg,#e8460a,#ff6b35);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">
              Open TM Slate →
            </a>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              This is an automated notification from <strong>TM Slate</strong> — Takeout Media's project management platform.
              If you believe this was sent in error, please reach out to your team administrator.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[task-assigned email]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
