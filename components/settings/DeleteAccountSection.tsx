"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-field";
import { SettingRow } from "./SettingRow";

const CONFIRM_WORD = "DELETE";

export default function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (deleting) return;
    setOpen(false); setPassword(""); setTyped(""); setError("");
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true); setError("");
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleting(false);
      setError(data.error ?? "Couldn't delete your account");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <SettingRow label="Delete account" description="Permanently delete your account. This can't be undone.">
        <Button type="button" variant="outline" size="sm"
          className="text-status-overdue hover:text-status-overdue border-status-overdue/30 hover:bg-status-overdue/10"
          onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </SettingRow>

      <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>This is permanent and can&apos;t be undone.</DialogDescription>
          </DialogHeader>

          <div className="text-sm space-y-1.5">
            <p><span className="font-medium">Kept:</span> tasks, projects and brands you created stay with the team.</p>
            <p><span className="font-medium">Removed:</span> your login, task assignments, comments, notifications and learning records.</p>
          </div>

          <form onSubmit={handleDelete} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Your password</Label>
              <PasswordInput id="delete-password" autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm</Label>
              <Input id="delete-confirm" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" />
            </div>

            {error && <p className="text-sm text-status-overdue">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={deleting} onClick={close}>Cancel</Button>
              <Button type="submit" variant="destructive" className="flex-1"
                disabled={deleting || !password || typed.trim().toUpperCase() !== CONFIRM_WORD}>
                {deleting ? "Deleting…" : "Delete my account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
