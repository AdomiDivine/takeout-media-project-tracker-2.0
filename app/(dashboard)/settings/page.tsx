"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUpload from "@/components/ui/image-upload";
import type { User } from "@/types";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  team_lead: "Team Lead",
  member: "Member",
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase.from("users").select("*").eq("id", authUser.id).single();
      if (data) {
        setUser(data as User);
        setName(data.name);
        setAvatarUrl(data.avatar_url ?? "");
      }
      setFetchLoading(false);
    }
    fetchUser();
  }, []);

  async function handleAvatarUploaded(url: string) {
    if (!user) return;
    setAvatarUrl(url);
    const supabase = createClient();
    await supabase.from("users").update({ avatar_url: url }).eq("id", user.id);
    setUser(prev => prev ? { ...prev, avatar_url: url } : prev);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true); setError(""); setSaved(false);

    const supabase = createClient();
    const { error: updateError } = await supabase.from("users").update({ name }).eq("id", user.id);

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setUser(prev => prev ? { ...prev, name } : prev);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (fetchLoading) {
    return (
      <div className="space-y-5 max-w-lg">
        <div className="h-7 w-24 bg-muted rounded animate-pulse" />
        <div className="h-72 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-lg font-semibold">Settings</h2>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <h3 className="font-medium text-sm">Profile</h3>

        {/* Avatar upload */}
        <div className="flex items-center gap-5">
          <ImageUpload
            currentUrl={avatarUrl || null}
            bucket="avatars"
            filePath={user?.id ?? "unknown"}
            shape="circle"
            size="lg"
            onUploaded={handleAvatarUploaded}
          />
          <div>
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{roleLabels[user?.role ?? ""] ?? user?.role}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Display name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="opacity-60 cursor-not-allowed" />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={roleLabels[user?.role ?? ""] ?? user?.role ?? ""} disabled className="opacity-60 cursor-not-allowed" />
          </div>

          {error && <p className="text-sm text-status-overdue">{error}</p>}
          {saved && <p className="text-sm text-status-completed">Changes saved.</p>}

          <Button
            type="submit"
            className="bg-brand hover:bg-brand/90 text-white"
            disabled={loading}
          >
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-medium text-sm">Account</h3>
        <p className="text-xs text-muted-foreground">
          Member since {user ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
        </p>
      </div>
    </div>
  );
}
