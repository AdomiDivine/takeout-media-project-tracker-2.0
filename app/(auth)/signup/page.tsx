"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarPicker, uploadAvatarForCurrentUser } from "@/components/ui/avatar-picker";
import { PasswordInput, PasswordStrength, isPasswordAcceptable, MIN_PASSWORD_LENGTH } from "@/components/ui/password-field";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setTriedSubmit(true);

    if (!photo) { setError("Please add a profile photo."); return; }
    if (!isPasswordAcceptable(password)) { setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, job_title: jobTitle.trim() } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session && data.user) {
      // Save the job title and photo on the new profile
      await supabase.from("users").update({ job_title: jobTitle.trim() }).eq("id", data.user.id);
      try {
        await uploadAvatarForCurrentUser(photo);
      } catch {
        // Account exists; they can add the photo in Settings if the upload failed
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Join your team on TM Workroom</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label>Profile photo</Label>
            <AvatarPicker value={photo} onChange={setPhoto} invalid={triedSubmit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Innocent Agboma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-title">Your role</Label>
            <Input
              id="job-title"
              type="text"
              placeholder="e.g. Graphic Designer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
              autoComplete="organization-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@takeoutmedia.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <PasswordStrength password={password} />
          </div>
          {error && (
            <p className="text-sm text-status-overdue">{error}</p>
          )}
          <Button type="submit" className="w-full bg-brand hover:bg-brand/90 text-white" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
