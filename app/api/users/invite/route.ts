import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// POST { email, name, role } — invite someone to TM Workroom.
// Admins can invite members; super admins can also invite admins.
// Creates the account (no password yet) and emails a link to /accept-invite,
// where they set their password.
export async function POST(req: NextRequest) {
  try {
    const userSupabase = await createUserClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: caller } = await supabase.from("users").select("role, name").eq("id", user.id).single();
    const callerRole = caller?.role ?? "";
    if (!["super_admin", "admin"].includes(callerRole)) {
      return NextResponse.json({ error: "Only admins can invite people" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = body.role === "admin" ? "admin" : "member";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "Enter their name" }, { status: 400 });
    if (role === "admin" && callerRole !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can invite admins" }, { status: 403 });
    }

    const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Someone with this email already has an account" }, { status: 409 });
    }

    // Creates the auth user (which adds their public.users row) and returns a one-time token
    const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { name } },
    });
    if (linkError || !link?.user) {
      console.error("[users/invite]", linkError);
      return NextResponse.json({ error: linkError?.message ?? "Could not create invite" }, { status: 500 });
    }

    if (role === "admin") {
      await supabase.from("users").update({ role: "admin" }).eq("id", link.user.id);
    }

    const acceptUrl = `${req.nextUrl.origin}/accept-invite?token_hash=${encodeURIComponent(link.properties.hashed_token)}`;
    const inviter = escapeHtml(caller?.name ?? "An admin");
    const safeName = escapeHtml(name);

    try {
      await sendEmail({
        to: email,
        subject: `${caller?.name ?? "An admin"} invited you to TM Workroom`,
        text: `Hi ${name},\n\n${caller?.name ?? "An admin"} has invited you to TM Workroom. Set your password to get started:\n${acceptUrl}\n\nThis link can only be used once.`,
        html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#e8460a,#ff6b35);padding:32px 40px;">
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">TM Workroom</p>
        <h1 style="margin:8px 0 0;font-size:26px;color:#ffffff;font-weight:700;line-height:1.2;">You're invited</h1>
      </td></tr>
      <tr><td style="padding:36px 40px 8px;">
        <p style="margin:0;font-size:16px;color:#111827;font-weight:600;">Hi ${safeName},</p>
        <p style="margin:12px 0 0;font-size:15px;color:#6b7280;line-height:1.6;">
          <strong style="color:#e8460a;">${inviter}</strong> has invited you to join the team on TM Workroom.
          Set your password to get started.
        </p>
      </td></tr>
      <tr><td style="padding:24px 40px 36px;">
        <a href="${acceptUrl}" style="display:inline-block;background:#e8460a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:10px;">Accept invite</a>
        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">This link can only be used once. If it has expired, ask an admin to send a new invite.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
      });
    } catch (mailErr) {
      // Don't leave a half-created account behind if the email couldn't be sent
      console.error("[users/invite] email failed", mailErr);
      await supabase.auth.admin.deleteUser(link.user.id);
      return NextResponse.json({ error: "Couldn't send the invite email. Check the Gmail settings and try again." }, { status: 500 });
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: `Invited ${name} (${email}) as ${role === "admin" ? "an admin" : "a member"}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[users/invite]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
