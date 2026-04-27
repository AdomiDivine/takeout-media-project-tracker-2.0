"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ImageUpload from "@/components/ui/image-upload";
import type { User } from "@/types";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  team_lead:   "Team Lead",
  member:      "Member",
};

const roleBadgeColors: Record<string, string> = {
  super_admin: "bg-brand/20 text-brand border-brand/30",
  admin:       "bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30",
  team_lead:   "bg-status-completed/20 text-status-completed border-status-completed/30",
  member:      "bg-muted text-muted-foreground border-border",
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Members management (admin/super_admin only)
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

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

        if (["super_admin", "admin"].includes(data.role)) {
          const { data: users } = await supabase.from("users").select("*").order("name");
          if (users) setAllUsers(users as User[]);
        }
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

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingRole(userId);
    const supabase = createClient();
    const { error } = await supabase.from("users").update({ role: newRole }).eq("id", userId);
    if (!error) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as User["role"] } : u));
      if (userId === user?.id) setUser(prev => prev ? { ...prev, role: newRole as User["role"] } : prev);
    }
    setUpdatingRole(null);
  }

  if (fetchLoading) {
    return (
      <div className="space-y-5 max-w-2xl">
        <div className="h-7 w-24 bg-muted rounded animate-pulse" />
        <div className="h-72 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const canManageMembers = ["super_admin", "admin"].includes(user?.role ?? "");
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">Settings</h2>

      {/* Profile */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <h3 className="font-medium text-sm">Profile</h3>

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
            <Input id="settings-name" value={name} onChange={e => setName(e.target.value)} required />
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

          <Button type="submit" className="bg-brand hover:bg-brand/90 text-white" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </div>

      {/* Account info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-medium text-sm">Account</h3>
        <p className="text-xs text-muted-foreground">
          Member since {user ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
        </p>
      </div>

      {/* Team members — admin/super_admin only */}
      {canManageMembers && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Team Members</h3>
            <span className="text-xs text-muted-foreground">{allUsers.length} member{allUsers.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="space-y-2">
            {allUsers.map(member => (
              <div key={member.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {member.name}
                    {member.id === user?.id && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>

                {/* Role — super_admin can change anyone's role except their own */}
                {isSuperAdmin && member.id !== user?.id ? (
                  <Select
                    value={member.role}
                    onValueChange={(v) => v && handleRoleChange(member.id, v)}
                  >
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue>
                        {roleLabels[member.role] ?? member.role}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member"      label="Member">Member</SelectItem>
                      <SelectItem value="team_lead"   label="Team Lead">Team Lead</SelectItem>
                      <SelectItem value="admin"       label="Admin">Admin</SelectItem>
                      <SelectItem value="super_admin" label="Super Admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={`text-[10px] ${roleBadgeColors[member.role] ?? ""}`}>
                    {roleLabels[member.role] ?? member.role}
                  </Badge>
                )}

                {updatingRole === member.id && (
                  <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
