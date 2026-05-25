"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Brand, LearningPath } from "@/types";

const LEARNING_TYPES = [
  { value: "book",    label: "Book" },
  { value: "course",  label: "Course" },
  { value: "video",   label: "Video" },
  { value: "podcast", label: "Podcast" },
  { value: "article", label: "Article" },
  { value: "other",   label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
];

interface LearningModalProps {
  open: boolean;
  item?: LearningPath | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function LearningModal({ open, item, onClose, onSaved }: LearningModalProps) {
  const isEdit = !!item;

  const [title, setTitle] = useState("");
  const [type, setType] = useState("course");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("not_started");
  const [brandId, setBrandId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (item) {
      setTitle(item.title);
      setType(item.type);
      setDescription(item.description ?? "");
      setUrl(item.url ?? "");
      setProgress(item.progress);
      setStatus(item.status);
      setBrandId(item.brand_id ?? "");
      setTargetDate(item.target_date ?? "");
    } else {
      setTitle(""); setType("course"); setDescription(""); setUrl("");
      setProgress(0); setStatus("not_started"); setBrandId(""); setTargetDate("");
    }
    setError("");

    async function fetchBrands() {
      const supabase = createClient();
      const { data } = await supabase.from("brands").select("*").order("name");
      if (data) setBrands(data as Brand[]);
    }
    fetchBrands();
  }, [open, item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      title,
      type,
      description: description || null,
      url: url || null,
      progress,
      status,
      brand_id: brandId || null,
      target_date: targetDate || null,
      completed_at: status === "completed" && !item?.completed_at ? new Date().toISOString() : (item?.completed_at ?? null),
    };

    let err;
    if (isEdit && item) {
      const { error: updateErr } = await supabase.from("learning_paths").update(payload).eq("id", item.id);
      err = updateErr;
    } else {
      const { error: insertErr } = await supabase.from("learning_paths").insert({ ...payload, user_id: user.id });
      err = insertErr;
    }

    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Learning Item" : "Add Learning Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="lp-title">Title *</Label>
            <Input
              id="lp-title"
              placeholder="e.g. Atomic Habits"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lp-type">Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="lp-type" className="w-full">
                <SelectValue>{LEARNING_TYPES.find(t => t.value === type)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LEARNING_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lp-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="lp-desc"
              placeholder="What is this about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lp-url">Link / URL <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="lp-url"
              placeholder="https://..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lp-status">Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="lp-status" className="w-full">
                <SelectValue>{STATUS_OPTIONS.find(s => s.value === status)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lp-progress">Progress — {progress}%</Label>
            <input
              id="lp-progress"
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full accent-brand"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lp-target">Target date <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="lp-target"
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lp-brand">Brand <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={brandId || "none"} onValueChange={(v) => setBrandId(!v || v === "none" ? "" : v)}>
              <SelectTrigger id="lp-brand" className="w-full">
                <SelectValue placeholder="No brand">
                  {brandId ? brands.find(b => b.id === brandId)?.name : "No brand"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No brand —</SelectItem>
                {brands.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-status-overdue">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save changes" : "Add item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
