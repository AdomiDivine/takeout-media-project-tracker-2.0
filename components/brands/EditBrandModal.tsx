"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from "@/components/ui/image-upload";
import { createClient } from "@/lib/supabase/client";
import type { Brand, User } from "@/types";

interface EditBrandModalProps {
  open: boolean;
  brand: Brand | null;
  onClose: () => void;
  onUpdated: (updated: Brand) => void;
}

export default function EditBrandModal({ open, brand, onClose, onUpdated }: EditBrandModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brandManagerId, setBrandManagerId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!brand || !open) return;
    setName(brand.name);
    setDescription(brand.description ?? "");
    setBrandManagerId(brand.brand_manager_id ?? "");
    setAvatarUrl(brand.avatar_url ?? "");
    setError("");

    async function fetchUsers() {
      const supabase = createClient();
      const { data } = await supabase.from("users").select("*").order("name");
      if (data) setUsers(data as User[]);
    }
    fetchUsers();
  }, [brand, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brand) return;
    setError(""); setLoading(true);

    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("brands")
      .update({
        name,
        description: description || null,
        avatar_url: avatarUrl || null,
        brand_manager_id: brandManagerId || null,
      })
      .eq("id", brand.id)
      .select("*, brand_manager:users!brand_manager_id(id,name,email,role,avatar_url,created_at)")
      .single();

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    if (data) onUpdated(data as Brand);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="flex justify-center">
            <ImageUpload
              currentUrl={avatarUrl || null}
              bucket="project-avatars"
              shape="square"
              size="md"
              onUploaded={setAvatarUrl}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-brand-name">Brand name *</Label>
            <Input
              id="edit-brand-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-brand-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="edit-brand-desc"
              placeholder="What is this brand about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-brand-manager">Brand Manager <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={brandManagerId || "none"} onValueChange={(v) => setBrandManagerId(!v || v === "none" ? "" : v)}>
              <SelectTrigger id="edit-brand-manager" className="w-full">
                <SelectValue placeholder="No manager">
                  {brandManagerId ? users.find(u => u.id === brandManagerId)?.name : "No manager"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No manager —</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-status-overdue">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
