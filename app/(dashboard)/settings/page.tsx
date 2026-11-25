"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImageUpload from "@/components/ui/image-upload";
import { BarChart2, Bell, KeyRound, Palette, UserCheck, UserRound, UserX, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FIELD, SectionTitle, SettingRow } from "@/components/settings/SettingRow";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import ReportsView from "@/components/reports/ReportsView";
import { PasswordInput, PasswordMatch, PasswordStrength, isPasswordAcceptable, MIN_PASSWORD_LENGTH } from "@/components/ui/password-field";
import AppearanceSection from "@/components/settings/AppearanceSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import SessionsSection from "@/components/settings/SessionsSection";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  member:      "Member",
};

type SettingsTab = "profile" | "account" | "appearance" | "notifications" | "reports" | "members";
const TAB_KEYS: SettingsTab[] = ["profile", "account", "appearance", "notifications", "reports", "members"];

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

  const sameAsCurrent = !!newPassword && newPassword === currentPassword;
  const canSubmit =
    !!currentPassword && isPasswordAcceptable(newPassword) && newPassword === confirmPassword && !sameAsCurrent;

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaved(false);

    if (!isPasswordAcceptable(newPassword)) { setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if (newPassword !== confirmPassword) { setError("New passwords don't match."); return; }
    if (sameAsCurrent) { setError("New password must be different from your current password."); return; }

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
    <form onSubmit={handleChangePassword}>
      <SectionTitle description="Use a strong password you don't use anywhere else.">Change password</SectionTitle>
      <SettingRow label="Current password" htmlFor="current-password">
        <div className={FIELD}>
          <PasswordInput id="current-password" autoComplete="current-password"
            value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
        </div>
      </SettingRow>
      <SettingRow label="New password" description="At least 8 characters. Mix letters, numbers and symbols to make it strong." htmlFor="new-password">
        <div className={cn(FIELD, "text-left")}>
          <PasswordInput id="new-password" autoComplete="new-password"
            value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <PasswordStrength password={newPassword} />
          {sameAsCurrent && <p className="text-xs text-status-overdue pt-1">Must be different from your current password.</p>}
        </div>
      </SettingRow>
      <SettingRow label="Confirm new password" htmlFor="confirm-password">
        <div className={cn(FIELD, "text-left")}>
          <PasswordInput id="confirm-password" autoComplete="new-password"
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          <PasswordMatch password={newPassword} confirm={confirmPassword} />
        </div>
      </SettingRow>

      <div className="flex items-center justify-end gap-3 pt-4">
        {error && <p className="text-sm text-status-overdue mr-auto">{error}</p>}
        {saved && <p className="text-sm text-status-completed mr-auto">Password updated.</p>}
        <Button type="submit" className="bg-brand hover:bg-brand/90 text-white" disabled={loading || !canSubmit}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [showPreferred, setShowPreferred] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [preferredName, setPreferredName] = useState("");
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
        setPreferredName(data.preferred_name ?? "");
        setShowPreferred(!!data.preferred_name);
        setAvatarUrl(data.avatar_url ?? "");

        if (["super_admin", "admin"].includes(data.role)) {
          const { data: users } = await supabase.from("users").select("*").order("name");
          if (users) setAllUsers(users as User[]);
          const statusRes = await fetch("/api/users/status");
          if (statusRes.ok) {
            const { users: statuses } = await statusRes.json() as { users: Record<string, { deactivated: boolean }> };
            setDeactivatedIds(new Set(Object.keys(statuses).filter(id => statuses[id].deactivated)));
          }
        }
        // Links like /settings?tab=members open straight to that tab
        const requested = new URLSearchParams(window.location.search).get("tab") as SettingsTab | null;
        const isAdminUser = ["super_admin", "admin"].includes(data.role);
        if (requested && TAB_KEYS.includes(requested) && (requested === "members" ? isAdminUser : requested === "reports" ? !isAdminUser : true)) {
          setActiveTab(requested);
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
    window.dispatchEvent(new CustomEvent("tm-slate:avatar-updated", { detail: { url } }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true); setError(""); setSaved(false);

    const supabase = createClient();
    const updates: Record<string, string | null> = { name, job_title: jobTitle.trim() || null };
    // preferred_name only exists once migration 027 has been run
    if ("preferred_name" in user) updates.preferred_name = preferredName.trim() || null;
    const { error: updateError } = await supabase.from("users").update(updates).eq("id", user.id);

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setUser(prev => prev ? { ...prev, name, job_title: jobTitle.trim() || null, preferred_name: preferredName.trim() || null } : prev);
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
      <div className="max-w-4xl mx-auto">
        <div className="h-[520px] bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const canManageMembers = ["super_admin", "admin"].includes(user?.role ?? "");
  const isSuperAdmin = user?.role === "super_admin";

  const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
    { key: "profile", label: "Profile", icon: UserRound },
    { key: "account", label: "Account", icon: KeyRound },
    { key: "appearance", label: "Appearance", icon: Palette },
    { key: "notifications", label: "Notifications", icon: Bell },
    // Members download their own report here; admins use the Reports page
    ...(!canManageMembers ? [{ key: "reports" as const, label: "Reports", icon: BarChart2 }] : []),
    ...(canManageMembers ? [{ key: "members" as const, label: "Team Members", icon: Users }] : []),
  ];

  // Team list order: active members, then admins, then super admins; deactivated accounts last
  const roleOrder: Record<string, number> = { member: 0, admin: 1, super_admin: 2 };
  // Super admins see everyone; admins only see the members they manage
  const visibleUsers = isSuperAdmin ? allUsers : allUsers.filter(u => u.role === "member");
  const sortedUsers = [...visibleUsers].sort((a, b) =>
    Number(deactivatedIds.has(a.id)) - Number(deactivatedIds.has(b.id)) ||
    (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) ||
    a.name.localeCompare(b.name)
  );
  const activeCount = visibleUsers.filter(u => !deactivatedIds.has(u.id)).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative bg-card border border-border rounded-xl overflow-hidden flex flex-col md:flex-row md:min-h-[560px]">
        {/* Close: back to the page you came from */}
        <button
          type="button"
          aria-label="Close settings"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={18} />
        </button>
        {/* Side menu */}
        <nav className="md:w-52 flex-shrink-0 border-b md:border-b-0 md:border-r border-border p-3">
          <h2 className="text-sm font-semibold px-2.5 pb-3 pt-1">Settings</h2>
          <div className="flex md:flex-col gap-1 overflow-x-auto">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm whitespace-nowrap transition-colors text-left",
                  activeTab === key
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 p-5 sm:p-6 md:max-h-[calc(100dvh-8rem)] md:overflow-y-auto">

          {/* ── PROFILE: how you appear to the team ── */}
          {activeTab === "profile" && (
            <form onSubmit={handleSave}>
              <SectionTitle>Profile</SectionTitle>
              <SettingRow label="Profile photo" description="PNG or JPG. Click the photo to change it.">
                <ImageUpload
                  currentUrl={avatarUrl || null}
                  bucket="avatars"
                  shape="circle"
                  size="sm"
                  enableCrop
                  onUploaded={handleAvatarUploaded}
                />
              </SettingRow>
              <SettingRow label="Display name" description="The name you signed up with. This is how the team sees you." htmlFor="settings-name">
                <div className={cn(FIELD, "text-left")}>
                  <Input id="settings-name" value={name} onChange={e => setName(e.target.value)} required />
                  {user && "preferred_name" in user && (
                    showPreferred ? (
                      <div className="mt-3 space-y-1.5">
                        <Label htmlFor="settings-preferred-name" className="text-xs text-muted-foreground font-normal">What should we call you?</Label>
                        <Input id="settings-preferred-name" placeholder={name.split(" ")[0]}
                          value={preferredName} onChange={e => setPreferredName(e.target.value)} />
                        <p className="text-[11px] text-muted-foreground">Used in greetings and emails.</p>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowPreferred(true)}
                        className="mt-2 text-xs text-brand hover:underline">
                        + What should we call you?
                      </button>
                    )
                  )}
                </div>
              </SettingRow>
              <SettingRow label="Role" description="Your job title, shown on your profile." htmlFor="settings-job-title">
                <Input id="settings-job-title" className={FIELD} placeholder="e.g. Graphic Designer"
                  value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
              </SettingRow>

              <div className="flex items-center justify-end gap-3 pt-4">
                {error && <p className="text-sm text-status-overdue mr-auto">{error}</p>}
                {saved && <p className="text-sm text-status-completed mr-auto">Changes saved.</p>}
                <Button type="submit" className="bg-brand hover:bg-brand/90 text-white" disabled={loading}>
                  {loading ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          )}

          {/* ── ACCOUNT: login details and security ── */}
          {activeTab === "account" && (
            <div className="space-y-8">
              <div>
                <SectionTitle>Account</SectionTitle>
                <SettingRow label="Email" description="The email you log in with.">
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </SettingRow>
                <SettingRow label="Platform role">
                  <p className="text-sm text-muted-foreground">{roleLabels[user?.role ?? ""] ?? user?.role}</p>
                </SettingRow>
                <SettingRow label="Member since">
                  <p className="text-sm text-muted-foreground">
                    {user ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                  </p>
                </SettingRow>
              </div>

              {user && <ChangePasswordCard email={user.email} />}

              <SessionsSection />

              <DeleteAccountSection />
            </div>
          )}

          {/* ── REPORTS (members): download your own report ── */}
          {activeTab === "reports" && !canManageMembers && <ReportsView title="My report" />}

          {/* ── APPEARANCE ── */}
          {activeTab === "appearance" && <AppearanceSection />}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "notifications" && user && (
            <NotificationsSection
              user={user}
              onSaved={(prefs) => setUser(prev => prev ? { ...prev, notification_prefs: prefs } : prev)}
            />
          )}

          {/* ── TEAM MEMBERS: admin/super_admin only ── */}
          {activeTab === "members" && canManageMembers && (
            <div>
              <SectionTitle action={
                <span className="text-xs text-muted-foreground">
                  {activeCount} active{visibleUsers.length > activeCount && ` · ${visibleUsers.length - activeCount} deactivated`}
                </span>
              }>
                Team Members
              </SectionTitle>

              <div>
                {sortedUsers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                    {/* Avatar */}
                    <div className={cn("w-8 h-8 rounded-full bg-muted flex-shrink-0 overflow-hidden", deactivatedIds.has(member.id) && "opacity-40 grayscale")}>
                      {member.avatar_url
                        ? <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                      }
                    </div>

                    {/* Info — greyed out when deactivated (the action button stays full colour) */}
                    <div className={cn("flex-1 min-w-0", deactivatedIds.has(member.id) && "opacity-50")}>
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
        </div>
      </div>

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
