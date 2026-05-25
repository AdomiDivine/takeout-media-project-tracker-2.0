"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUpload from "@/components/ui/image-upload";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";

interface NewBrandModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewBrandModal({ open, onClose, onCreated }: NewBrandModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPath] = useState(() => `temp-brand-${Date.now()}`);

  function reset() {
    setName(""); setDescription(""); setAvatarUrl(""); setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase.from("brands").insert({
      name,
      description: description || null,
      avatar_url: avatarUrl || null,
      created_by: user.id,
    });

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    logActivity({ action: `Created brand "${name}"` });
    reset(); onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Brand</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="flex justify-center">
            <ImageUpload
              currentUrl={avatarUrl || null}
              bucket="project-avatars"
              filePath={tempPath}
              shape="square"
              size="md"
              onUploaded={setAvatarUrl}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-name">Brand name *</Label>
            <Input
              id="brand-name"
              placeholder="e.g. TM Foundation"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="brand-desc"
              placeholder="What is this brand about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {error && <p className="text-sm text-status-overdue">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading ? "Creating…" : "Create brand"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
