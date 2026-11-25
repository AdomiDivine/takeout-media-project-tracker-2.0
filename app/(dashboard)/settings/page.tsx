"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImageUpload from "@/components/ui/image-upload";
import { UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  member:      "Member",
};

type SettingsTab = "profile" | "account" | "members";

// Who can deactivate whom: super admins can deactivate anyone but themselves; admins can deactivate members.
function canDeactivateUser(viewer: User | null, target: User) {
  if (!viewer || viewer.id === target.id) return false;
  if (viewer.role === "super_admin") return true;
  return viewer.role === "admin" && target.role === "member";
}

function ChangePasswordCard({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaved(false);

    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("New passwords don't match."); return; }
    if (newPassword === currentPassword) { setError("New password must be different from your current password."); return; }

    setLoading(true);
    const supabase = createClient();

    // Confirm the current password before allowing a change
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) {
      setLoading(false);
      setError("Current password is incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }

    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-medium text-sm">Change password</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Use at least 8 characters.</p>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input id="current-password" type="password" autoComplete="current-password"
            value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" minLength={8}
            value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8}
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        </div>

        {error && <p className="text-sm text-status-overdue">{error}</p>}
        {saved && <p className="text-sm text-status-completed">Password updated.</p>}

        <Button type="submit" className="bg-brand hover:bg-brand/90 text-white" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}

function DeactivateUserDialog({ target, onClose, onDeactivated }: {
  target: User | null;
  onClose: () => void;
  onDeactivated: (userId: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleDeactivate() {
    if (!target) return;
    setSaving(true); setError("");
    const res = await fetch("/api/users/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: target.id, active: false }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to deactivate user");
      return;
    }
    onDeactivated(target.id);
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o && !saving) { setError(""); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate {target?.name}?</DialogTitle>
          <DialogDescription>
            {target?.email} will be signed out and won&apos;t be able to log in.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm">
          Everything they did stays: tasks, comments, assignments and learning records.
          You can reactivate the account at any time.
        </p>

        {error && <p className="text-sm text-status-overdue">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" disabled={saving}
            onClick={() => { setError(""); onClose(); }}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" className="flex-1" disabled={saving} onClick={handleDeactivate}>
            {saving ? "Deactivating…" : "Deactivate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Members management (admin/super_admin only)
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [deactivatedIds, setDeactivatedIds] = useState<Set<string>>(new Set());
  const [reactivating, setReactivating] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase.from("users").select("*").eq("id", authUser.id).single();
      if (data) {
        setUser(data as User);
        setName(data.name);
        setJobTitle(data.job_title ?? "");
        setAvatarUrl(data.avatar_url ?? "");

        if (["super_admin", "admin"].includes(data.role)) {
          const { data: users } = await supabase.from("users").select("*").order("name");
          if (users) setAllUsers(users as User[]);
          const statusRes = await fetch("/api/users/deactivate");
          if (statusRes.ok) {
            const { deactivated } = await statusRes.json();
            setDeactivatedIds(new Set(deactivated as string[]));
          }
          // Links like /settings?tab=members open straight to the Team Members tab
          if (new URLSearchParams(window.location.search).get("tab") === "members") setActiveTab("members");
        }
        if (new URLSearchParams(window.location.search).get("tab") === "account") setActiveTab("account");
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
    window.dispatchEvent(new CustomEvent("tm-slate:avatar-updated", { detail: { url } }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true); setError(""); setSaved(false);

    const supabase = createClient();
    const { error: updateError } = await supabase.from("users").update({ name, job_title: jobTitle || null }).eq("id", user.id);

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

  async function handleReactivate(member: User) {
    setReactivating(member.id);
    const res = await fetch("/api/users/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: member.id, active: true }),
    });
    setReactivating(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Failed to reactivate user");
      return;
    }
    setDeactivatedIds(prev => { const next = new Set(prev); next.delete(member.id); return next; });
  }

  if (fetchLoading) {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="h-7 w-24 bg-muted rounded animate-pulse" />
        <div className="h-72 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const canManageMembers = ["super_admin", "admin"].includes(user?.role ?? "");
  const isSuperAdmin = user?.role === "super_admin";

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "account", label: "Account" },
    ...(canManageMembers ? [{ key: "members" as const, label: "Team Members" }] : []),
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold">Settings</h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.key
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE: how you appear to the team ── */}
      {activeTab === "profile" && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-5">
            <ImageUpload
              currentUrl={avatarUrl || null}
              bucket="avatars"
              shape="circle"
              size="lg"
              enableCrop
              onUploaded={handleAvatarUploaded}
            />
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              {user?.job_title && <p className="text-xs text-muted-foreground mt-0.5">{user.job_title}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">Click the photo to change it</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Display name</Label>
              <Input id="settings-name" value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-job-title">Job title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="settings-job-title"
                placeholder="e.g. Graphic Designer, Content Writer…"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-status-overdue">{error}</p>}
            {saved && <p className="text-sm text-status-completed">Changes saved.</p>}

            <Button type="submit" className="bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </div>
      )}

      {/* ── ACCOUNT: login details and security ── */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-medium text-sm">Account details</h3>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="opacity-60 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">This is the email you log in with.</p>
            </div>

            <div className="space-y-2">
              <Label>Platform role</Label>
              <Input value={roleLabels[user?.role ?? ""] ?? user?.role ?? ""} disabled className="opacity-60 cursor-not-allowed" />
            </div>

            <p className="text-xs text-muted-foreground">
              Member since {user ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
            </p>
          </div>

          {user && <ChangePasswordCard email={user.email} />}
        </div>
      )}

      {/* ── TEAM MEMBERS: admin/super_admin only ── */}
      {activeTab === "members" && canManageMembers && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Team Members</h3>
            <span className="text-xs text-muted-foreground">{allUsers.length} member{allUsers.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="space-y-2">
            {allUsers.map(member => (
              <div key={member.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                {/* Avatar */}
                <div className={cn("w-8 h-8 rounded-full bg-muted flex-shrink-0 overflow-hidden", deactivatedIds.has(member.id) && "opacity-40 grayscale")}>
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
                    {deactivatedIds.has(member.id) && (
                      <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border align-middle">
                        Deactivated
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email} · {roleLabels[member.role] ?? member.role}
                  </p>
                </div>

                {updatingRole === member.id && (
                  <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Super admins can change anyone's role except their own */}
                  {isSuperAdmin && member.id !== user?.id && (
                    <Select
                      value={member.role}
                      onValueChange={(v) => v && handleRoleChange(member.id, v)}
                    >
                      <SelectTrigger className="w-32 h-7 text-xs" aria-label={`Change ${member.name}'s role`}>
                        <SelectValue>
                          {roleLabels[member.role] ?? member.role}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member"      label="Member">Member</SelectItem>
                        <SelectItem value="admin"       label="Admin">Admin</SelectItem>
                        <SelectItem value="super_admin" label="Super Admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {canDeactivateUser(user, member) && (
                    deactivatedIds.has(member.id) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        disabled={reactivating === member.id}
                        onClick={() => handleReactivate(member)}
                      >
                        <UserCheck size={12} />
                        {reactivating === member.id ? "Reactivating…" : "Reactivate"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-status-overdue hover:text-status-overdue border-status-overdue/30 hover:bg-status-overdue/10"
                        onClick={() => setUserToDeactivate(member)}
                      >
                        <UserX size={12} />
                        Deactivate
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DeactivateUserDialog
        target={userToDeactivate}
        onClose={() => setUserToDeactivate(null)}
        onDeactivated={(id) => {
          setDeactivatedIds(prev => new Set(prev).add(id));
          setUserToDeactivate(null);
        }}
      />
    </div>
  );
}
