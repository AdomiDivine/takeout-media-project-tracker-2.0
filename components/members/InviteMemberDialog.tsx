"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InviteMemberDialogProps {
  open: boolean;
  canInviteAdmins: boolean;
  onClose: () => void;
  onInvited: () => void;
}

export default function InviteMemberDialog({ open, canInviteAdmins, onClose, onInvited }: InviteMemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  function reset() {
    setName(""); setEmail(""); setRole("member"); setError(""); setSentTo("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setError("");
    const res = await fetch("/api/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to send invite");
      return;
    }
    setSentTo(email.trim());
    setName(""); setEmail(""); setRole("member");
    onInvited();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !sending) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            They&apos;ll get an email with a link to set their password and join TM Workroom.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input id="invite-name" value={name} onChange={e => setName(e.target.value)} placeholder="Their full name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@takeoutmedia.com" required />
          </div>
          {canInviteAdmins && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as "member" | "admin")}>
                <SelectTrigger><SelectValue>{role === "admin" ? "Admin" : "Member"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member" label="Member">Member</SelectItem>
                  <SelectItem value="admin" label="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-status-overdue">{error}</p>}
          {sentTo && !error && <p className="text-sm text-status-completed">Invite sent to {sentTo}.</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" disabled={sending}
              onClick={() => { reset(); onClose(); }}>
              {sentTo ? "Done" : "Cancel"}
            </Button>
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white" disabled={sending}>
              {sending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
