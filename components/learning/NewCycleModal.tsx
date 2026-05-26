"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

interface NewCycleModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewCycleModal({ open, onClose, onCreated }: NewCycleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setName(""); setDescription(""); setStartDate(""); setEndDate(""); setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from("learning_cycles").insert({
      name,
      description: description || null,
      start_date: startDate || null,
      end_date: endDate || null,
      user_id: user.id,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    reset(); onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Learning Cycle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="cycle-name">Cycle name *</Label>
            <Input
              id="cycle-name"
              placeholder="e.g. Q1 2025 Learning Cycle"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cycle-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="cycle-desc"
              placeholder="What's the focus of this cycle?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cycle-start">Start date</Label>
              <Input id="cycle-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cycle-end">End date</Label>
              <Input id="cycle-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-status-overdue">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading ? "Creating…" : "Create cycle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
