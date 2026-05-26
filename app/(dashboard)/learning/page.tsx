"use client";

import { useState, useEffect, type ElementType } from "react";
import { GraduationCap, Plus, ChevronDown, Pencil, Trash2, ExternalLink, BookOpen, Tv, Headphones, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import NewCycleModal from "@/components/learning/NewCycleModal";
import MaterialModal from "@/components/learning/MaterialModal";
import type { LearningCycle, LearningMaterial } from "@/types";

/* ── helpers ──────────────────────────────────────────── */

const TYPE_ICONS: Record<string, ElementType> = {
  book: BookOpen, course: GraduationCap, video: Tv,
  podcast: Headphones, article: FileText, other: GraduationCap,
};

const TYPE_LABELS: Record<string, string> = {
  book: "Book", course: "Course", video: "Video",
  podcast: "Podcast", article: "Article", other: "Other",
};

const CADRE_STYLES: Record<string, string> = {
  personal_cognitive: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  industry_context:   "bg-amber-500/10 text-amber-400 border-amber-500/30",
  technical_mastery:  "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
};

const CADRE_LABELS: Record<string, string> = {
  personal_cognitive: "Personal / Cognitive",
  industry_context:   "Industry Context",
  technical_mastery:  "Technical Mastery",
};

const STATUS_STYLES: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  started:     "bg-status-in-progress/10 text-status-in-progress border-status-in-progress/30",
  completed:   "bg-status-completed/10 text-status-completed border-status-completed/30",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  started:     "Started",
  completed:   "Completed",
};

function progress(materials: LearningMaterial[]) {
  const total = materials.length;
  const done = materials.filter(m => m.status === "completed").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

/* ── page ─────────────────────────────────────────────── */

export default function LearningPage() {
  const [cycles, setCycles] = useState<LearningCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [matModal, setMatModal] = useState<{ open: boolean; cycleId: string; item: LearningMaterial | null }>({
    open: false, cycleId: "", item: null,
  });

  async function fetchData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("learning_cycles")
      .select("*, materials:learning_materials(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setCycles(data as LearningCycle[]);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function deleteMaterial(id: string) {
    const supabase = createClient();
    await supabase.from("learning_materials").delete().eq("id", id);
    setCycles(prev => prev.map(c => ({
      ...c,
      materials: (c.materials ?? []).filter(m => m.id !== id),
    })));
  }

  async function deleteCycle(id: string) {
    if (!confirm("Delete this cycle and all its materials?")) return;
    const supabase = createClient();
    await supabase.from("learning_cycles").delete().eq("id", id);
    setCycles(prev => prev.filter(c => c.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {[1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Learning Path</h2>
        <Button onClick={() => setNewCycleOpen(true)} size="sm" className="bg-brand hover:bg-brand/90 text-white gap-1.5">
          <Plus size={16} /> New Cycle
        </Button>
      </div>

      {cycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <GraduationCap size={48} className="opacity-20" />
          <p className="text-sm">No learning cycles yet.</p>
          <Button size="sm" variant="outline" onClick={() => setNewCycleOpen(true)}>Create your first cycle</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map(cycle => {
            const mats = cycle.materials ?? [];
            const { total, done, pct } = progress(mats);
            const isExpanded = expandedId === cycle.id;

            return (
              <div key={cycle.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Cycle header */}
                <div className="flex items-center">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : cycle.id)}
                    className="flex-1 flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                        <GraduationCap size={15} className="text-brand" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight">{cycle.name}</p>
                        {cycle.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{cycle.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      {/* Progress */}
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{done}/{total}</span> completed
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-7">{pct}%</span>
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className={cn("text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")}
                      />
                    </div>
                  </button>

                  {/* Cycle delete */}
                  <button
                    onClick={() => deleteCycle(cycle.id)}
                    className="px-3 py-4 text-muted-foreground hover:text-status-overdue transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Mobile progress */}
                    <div className="sm:hidden px-5 py-3 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{done}/{total} · {pct}%</span>
                      </div>
                    </div>

                    {mats.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        No materials yet.{" "}
                        <button
                          onClick={() => setMatModal({ open: true, cycleId: cycle.id, item: null })}
                          className="text-brand hover:underline"
                        >
                          Add one
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-2.5">Material</th>
                              <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5 hidden sm:table-cell">Type</th>
                              <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Cadre</th>
                              <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                              <th className="px-3 py-2.5 w-16"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {mats.map(mat => {
                              const TypeIcon = TYPE_ICONS[mat.type] ?? GraduationCap;
                              return (
                                <tr key={mat.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <TypeIcon size={13} className="text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium leading-tight">{mat.title}</p>
                                        {mat.url && (
                                          <a
                                            href={mat.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-brand hover:underline flex items-center gap-1 mt-0.5"
                                          >
                                            <ExternalLink size={9} /> Open link
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 hidden sm:table-cell">
                                    <span className="text-xs text-muted-foreground">{TYPE_LABELS[mat.type]}</span>
                                  </td>
                                  <td className="px-3 py-3">
                                    <Badge variant="outline" className={cn("text-[10px] whitespace-nowrap", CADRE_STYLES[mat.cadre])}>
                                      {CADRE_LABELS[mat.cadre]}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-3">
                                    <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[mat.status])}>
                                      {STATUS_LABELS[mat.status]}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => setMatModal({ open: true, cycleId: cycle.id, item: mat })}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        onClick={() => deleteMaterial(mat.id)}
                                        className="p-1 rounded text-muted-foreground hover:text-status-overdue hover:bg-muted transition-colors"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Add material */}
                    <div className="px-5 py-3 border-t border-border/50">
                      <button
                        onClick={() => setMatModal({ open: true, cycleId: cycle.id, item: null })}
                        className="flex items-center gap-1.5 text-xs text-brand hover:text-brand/80 transition-colors font-medium"
                      >
                        <Plus size={13} /> Add material
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NewCycleModal
        open={newCycleOpen}
        onClose={() => setNewCycleOpen(false)}
        onCreated={() => { setNewCycleOpen(false); fetchData(); }}
      />

      <MaterialModal
        open={matModal.open}
        cycleId={matModal.cycleId}
        item={matModal.item}
        onClose={() => setMatModal({ open: false, cycleId: "", item: null })}
        onSaved={() => { setMatModal({ open: false, cycleId: "", item: null }); fetchData(); }}
      />
    </div>
  );
}
