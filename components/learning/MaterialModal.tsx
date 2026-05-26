"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { LearningMaterial } from "@/types";

const TYPES = [
  { value: "book",    label: "Book" },
  { value: "course",  label: "Course" },
  { value: "video",   label: "Video" },
  { value: "podcast", label: "Podcast" },
  { value: "article", label: "Article" },
  { value: "other",   label: "Other" },
];

const CADRES = [
  { value: "personal_cognitive", label: "Personal / Cognitive" },
  { value: "industry_context",   label: "Industry Context" },
  { value: "technical_mastery",  label: "Technical Mastery" },
];

const STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "started",     label: "Started" },
  { value: "completed",   label: "Completed" },
];

interface MaterialModalProps {
  open: boolean;
  cycleId: string;
  item?: LearningMaterial | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function MaterialModal({ open, cycleId, item, onClose, onSaved }: MaterialModalProps) {
  const isEdit = !!item;

  const [title, setTitle] = useState("");
  const [type, setType] = useState("course");
  const [cadre, setCadre] = useState("personal_cognitive");
  const [status, setStatus] = useState("not_started");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (item) {
      setTitle(item.title);
      setType(item.type);
      setCadre(item.cadre);
      setStatus(item.status);
      setUrl(item.url ?? "");
      setNotes(item.notes ?? "");
    } else {
      setTitle(""); setType("course"); setCadre("personal_cognitive");
      setStatus("not_started"); setUrl(""); setNotes("");
    }
    setError("");
  }, [open, item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = { title, type, cadre, status, url: url || null, notes: notes || null };

    let err;
    if (isEdit && item) {
      const { error: e } = await supabase.from("learning_materials").update(payload).eq("id", item.id);
      err = e;
    } else {
      const { error: e } = await supabase.from("learning_materials").insert({ ...payload, cycle_id: cycleId, user_id: user.id });
      err = e;
    }

    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Material" : "Add Learning Material"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="mat-title">Title *</Label>
            <Input
              id="mat-title"
              placeholder="e.g. Atomic Habits"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mat-type">Type *</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger id="mat-type">
                  <SelectValue>{TYPES.find(t => t.value === type)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mat-status">Status *</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger id="mat-status">
                  <SelectValue>{STATUSES.find(s => s.value === status)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mat-cadre">Cadre *</Label>
            <Select value={cadre} onValueChange={(v) => v && setCadre(v)}>
              <SelectTrigger id="mat-cadre" className="w-full">
                <SelectValue>{CADRES.find(c => c.value === cadre)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CADRES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mat-url">Link / URL <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="mat-url"
              placeholder="https://..."
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mat-notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="mat-notes"
              placeholder="Key takeaways, notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {error && <p className="text-sm text-status-overdue">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save changes" : "Add material"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
