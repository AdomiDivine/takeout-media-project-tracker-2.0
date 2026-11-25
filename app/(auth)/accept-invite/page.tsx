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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
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

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }

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
        <CardDescription>You&apos;ve been invited to the team. Choose a password to finish setting up your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="At least 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required autoFocus autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" placeholder="Repeat your password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              required autoComplete="new-password" />
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
