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

const ADMIN_STATUSES = [
  { value: "not_started",  label: "Not Started" },
  { value: "started",      label: "Started" },
  { value: "under_review", label: "Under Review" },
  { value: "completed",    label: "Completed" },
];

const MEMBER_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "started",     label: "Started" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentMonthName = MONTHS[new Date().getMonth()];

interface MaterialModalProps {
  open: boolean;
  quarter: string;
  year: number;
  item?: LearningMaterial | null;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function MaterialModal({ open, quarter, year, item, isAdmin, onClose, onSaved }: MaterialModalProps) {
  const isEdit = !!item;

  // Core fields
  const [title, setTitle]   = useState("");
  const [type, setType]     = useState("course");
  const [cadre, setCadre]   = useState("personal_cognitive");
  const [status, setStatus] = useState("not_started");
  const [month, setMonth]   = useState(currentMonthName);
  const [url, setUrl]       = useState("");

  // Member review fields (required for members)
  const [keyLearning, setKeyLearning]                 = useState("");
  const [applicationEvidence, setApplicationEvidence] = useState("");
  const [completionDate, setCompletionDate]           = useState("");

  // Notes — optional, shown below review fields
  const [notes, setNotes] = useState("");

  // Admin-only fields
  const [observableImpact, setObservableImpact] = useState("");
  const [comment, setComment]                   = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [opsNotes, setOpsNotes]                 = useState("");

  const [loading, setLoading]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (!open) return;
    if (item) {
      setTitle(item.title); setType(item.type); setCadre(item.cadre);
      setStatus(item.status); setMonth(item.month ?? currentMonthName);
      setUrl(item.url ?? ""); setNotes(item.notes ?? "");
      setKeyLearning(item.key_learning ?? "");
      setApplicationEvidence(item.application_evidence ?? "");
      setCompletionDate(item.completion_date ?? "");
      setObservableImpact(item.observable_impact ?? "");
      setComment(item.comment ?? "");
      setFollowUpRequired(item.follow_up_required ?? false);
      setOpsNotes(item.ops_notes ?? "");
    } else {
      setTitle(""); setType("course"); setCadre("personal_cognitive");
      setStatus("not_started"); setMonth(currentMonthName);
      setUrl(""); setNotes("");
      setKeyLearning(""); setApplicationEvidence(""); setCompletionDate("");
      setObservableImpact(""); setComment(""); setFollowUpRequired(false); setOpsNotes("");
    }
    setError("");
  }, [open, item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Members must fill in Key Learning and Application Evidence when editing
    if (isEdit && !isAdmin) {
      if (!keyLearning.trim()) {
        setError("Key Learning is required."); return;
      }
      if (!applicationEvidence.trim()) {
        setError("Application Evidence is required."); return;
      }
    }

    setError(""); setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, unknown> = {
      title, type, cadre, status, month,
      url: url || null,
      notes: notes || null,
      key_learning: keyLearning || null,
      application_evidence: applicationEvidence || null,
      completion_date: completionDate || null,
    };

    if (isAdmin) {
      payload.observable_impact  = observableImpact || null;
      payload.comment            = comment || null;
      payload.follow_up_required = followUpRequired;
      payload.ops_notes          = opsNotes || null;
    }

    let err;
    if (isEdit && item) {
      const { error: e } = await supabase.from("learning_materials").update(payload).eq("id", item.id);
      err = e;
    } else {
      const { error: e } = await supabase.from("learning_materials").insert({
        ...payload, quarter, year, user_id: user.id,
      });
      err = e;
    }

    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved();
  }

  async function handleSubmitForReview() {
    if (!keyLearning.trim()) {
      setError("Key Learning is required before submitting for review."); return;
    }
    if (!applicationEvidence.trim()) {
      setError("Application Evidence is required before submitting for review."); return;
    }
    setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/learning/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: item!.id, keyLearning, applicationEvidence, completionDate }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to submit for review."); return; }
      onSaved();
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }

  async function handleMarkComplete() {
    setError(""); setCompleting(true);
    try {
      const res = await fetch("/api/learning/mark-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: item!.id, observableImpact, comment, followUpRequired, opsNotes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to mark complete."); return; }
      onSaved();
    } catch { setError("Network error. Please try again."); }
    finally { setCompleting(false); }
  }

  const statusOptions = isAdmin ? ADMIN_STATUSES : MEMBER_STATUSES;

  const showSubmitForReview = isEdit && !isAdmin && item &&
    item.status !== "under_review" && item.status !== "completed";
  const showMarkComplete = isEdit && isAdmin;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Material" : `Add to ${quarter}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="mat-title">Title *</Label>
            <Input id="mat-title" placeholder="e.g. Atomic Habits" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          {/* Type / Status / Month — 3-column grid */}
          <div className="grid grid-cols-3 gap-3">
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
                  <SelectValue>{statusOptions.find(s => s.value === status)?.label ?? status}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mat-month">Month *</Label>
              <Select value={month} onValueChange={(v) => v && setMonth(v)}>
                <SelectTrigger id="mat-month">
                  <SelectValue>{month}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cadre */}
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

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="mat-url">Link / URL <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="mat-url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
          </div>

          {/* Member review fields — required for members when editing */}
          {isEdit && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label htmlFor="mat-key-learning">
                  Key Learning (Summary)
                  {!isAdmin && <span className="text-status-overdue ml-1">*</span>}
                </Label>
                <Textarea
                  id="mat-key-learning"
                  placeholder="What did you learn? Key takeaways and insights…"
                  value={keyLearning}
                  onChange={e => setKeyLearning(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mat-application-evidence">
                  Application Evidence
                  {!isAdmin && <span className="text-status-overdue ml-1">*</span>}
                </Label>
                <Textarea
                  id="mat-application-evidence"
                  placeholder="How have you applied or plan to apply this learning?"
                  value={applicationEvidence}
                  onChange={e => setApplicationEvidence(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mat-completion-date">Completion Date <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="mat-completion-date" type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* Notes — optional, always visible */}
          <div className="space-y-2">
            <Label htmlFor="mat-notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="mat-notes" placeholder="Any other notes…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="resize-none" />
          </div>

          {/* Admin-only section */}
          {isAdmin && isEdit && (
            <div className="space-y-3 pt-3 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ops Review</p>
              <div className="space-y-2">
                <Label htmlFor="mat-observable-impact">Observable Impact</Label>
                <Textarea id="mat-observable-impact" placeholder="Observed impact on work or team…" value={observableImpact} onChange={e => setObservableImpact(e.target.value)} rows={3} className="resize-none" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mat-comment">Comment</Label>
                <Input id="mat-comment" placeholder="Admin comment…" value={comment} onChange={e => setComment(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="mat-follow-up" className="cursor-pointer select-none">Follow-Up Required</Label>
                <button
                  type="button"
                  id="mat-follow-up"
                  role="switch"
                  aria-checked={followUpRequired}
                  onClick={() => setFollowUpRequired(v => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${followUpRequired ? "bg-brand" : "bg-muted-foreground/30"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${followUpRequired ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mat-ops-notes">Ops Notes</Label>
                <Textarea id="mat-ops-notes" placeholder="Internal ops notes…" value={opsNotes} onChange={e => setOpsNotes(e.target.value)} rows={2} className="resize-none" />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-status-overdue">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save changes" : "Add item"}
            </Button>
            {showSubmitForReview && (
              <Button type="button" className="w-full bg-amber-500 hover:bg-amber-500/90 text-white" disabled={submitting} onClick={handleSubmitForReview}>
                {submitting ? "Submitting…" : "Submit for Review"}
              </Button>
            )}
            {showMarkComplete && (
              <Button type="button" className="w-full bg-status-completed hover:bg-status-completed/90 text-white" disabled={completing} onClick={handleMarkComplete}>
                {completing ? "Marking…" : "Mark Complete"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
