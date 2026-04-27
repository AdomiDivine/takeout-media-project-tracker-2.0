import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY     = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL         = Deno.env.get("FROM_EMAIL") ?? "notifications@resend.dev";
const APP_URL            = Deno.env.get("APP_URL") ?? "http://localhost:3000";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    user_id: string;
    message: string;
    type: string;
    task_id: string | null;
    created_at: string;
  };
}

const TYPE_EMOJI: Record<string, string> = {
  assignment:    "📋",
  collaboration: "🤝",
  deadline:      "⏰",
  overdue:       "🔴",
  blocker:       "⚠️",
  completion:    "✅",
};

function buildEmailHtml(userName: string, message: string, emoji: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="font-weight:700;font-size:16px;color:#fd4f05;">TM Work OS</span>
              <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;margin-left:10px;">Takeout Media</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Hi ${userName},</p>
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#f5f5f5;">${emoji} New notification</h2>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#d1d5db;">${message}</p>
              <a href="${appUrl}/dashboard"
                style="display:inline-block;background:#fd4f05;color:#fff;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;text-decoration:none;">
                Open TM Work OS →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;font-size:11px;color:#4b5563;">
                You're receiving this because you're a member of the Takeout Media workspace.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  // Supabase webhooks send POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only handle INSERT events on the notifications table
    if (payload.type !== "INSERT" || payload.table !== "notifications") {
      return new Response("Skipped", { status: 200 });
    }

    const { user_id, message, type: notifType } = payload.record;

    // Use service role to bypass RLS and fetch user email
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: user, error } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user_id)
      .single();

    if (error || !user?.email) {
      console.error("User fetch error:", error?.message ?? "No email");
      return new Response("User not found", { status: 200 });
    }

    const emoji   = TYPE_EMOJI[notifType] ?? "🔔";
    const subject = `${emoji} ${message}`;
    const html    = buildEmailHtml(user.name, message, emoji, APP_URL);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `TM Work OS <${FROM_EMAIL}>`,
        to:   [user.email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend error:", body);
      return new Response("Email failed", { status: 500 });
    }

    console.log(`Email sent to ${user.email}: ${subject}`);
    return new Response("Email sent", { status: 200 });

  } catch (err) {
    console.error("Function error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
