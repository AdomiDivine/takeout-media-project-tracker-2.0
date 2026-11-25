"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { AvatarPicker, uploadAvatarForCurrentUser } from "@/components/ui/avatar-picker";
import { PasswordInput, PasswordMatch, PasswordStrength, isPasswordAcceptable, MIN_PASSWORD_LENGTH } from "@/components/ui/password-field";

// Landing page for the link in an invite email (/accept-invite?token_hash=...).
// The one-time token is only used when the person submits, so email link
// scanners that open the URL in advance can't use it up.
export default function AcceptInvitePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTriedSubmit(true);
    if (!photo) { setError("Please add a profile photo."); return; }
    if (!isPasswordAcceptable(password)) { setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    const tokenHash = new URLSearchParams(window.location.search).get("token_hash");
    if (!tokenHash) { setError("This invite link is incomplete. Open the link from your email again."); return; }

    setError("");
    setLoading(true);
    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
    if (verifyError) {
      setLoading(false);
      setError("This invite link has expired or was already used. Ask an admin to send you a new invite.");
      return;
    }

    const { data: updated, error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setLoading(false); setError(updateError.message); return; }

    // Save their role and photo on the profile
    if (updated.user) await supabase.from("users").update({ job_title: jobTitle.trim() }).eq("id", updated.user.id);
    try { await uploadAvatarForCurrentUser(photo); } catch { /* they can add it later in Settings */ }
    setLoading(false);

    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  if (done) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={24} className="text-green-500" />
            </div>
          </div>
          <CardTitle className="text-xl">You&apos;re all set!</CardTitle>
          <CardDescription>Your account is ready. Taking you to your dashboard…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Welcome to TM Workroom</CardTitle>
        <CardDescription>You&apos;ve been invited to the team. Add a photo, your role and a password to finish setting up your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Profile photo</Label>
            <AvatarPicker value={photo} onChange={setPhoto} invalid={triedSubmit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-title">Your role</Label>
            <Input id="job-title" placeholder="e.g. Graphic Designer" value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)} required autoComplete="organization-title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete="new-password" />
            <PasswordStrength password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput id="confirm" placeholder="Repeat your password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              required autoComplete="new-password" />
            <PasswordMatch password={password} confirm={confirm} />
          </div>
          {error && <p className="text-sm text-status-overdue">{error}</p>}
          <Button type="submit" className="w-full bg-brand hover:bg-brand/90 text-white" disabled={loading}>
            {loading ? "Setting up…" : "Create my account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground">
          Already set up? <Link href="/login" className="text-brand hover:underline">Log in</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
