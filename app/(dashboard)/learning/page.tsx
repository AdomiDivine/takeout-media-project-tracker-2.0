"use client";

import { useState, useEffect, type ElementType } from "react";
import { GraduationCap, Plus, ChevronDown, Pencil, Trash2, ExternalLink, BookOpen, Tv, Headphones, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import MaterialModal from "@/components/learning/MaterialModal";
import type { LearningMaterial } from "@/types";

/* ── constants ───────────────────────────────────────── */

const YEAR = new Date().getFullYear();

const QUARTERS = [
  { key: "Q1" as const, label: "Q1", sub: `Jan – Mar ${YEAR}` },
  { key: "Q2" as const, label: "Q2", sub: `Apr – Jun ${YEAR}` },
  { key: "Q3" as const, label: "Q3", sub: `Jul – Sep ${YEAR}` },
  { key: "Q4" as const, label: "Q4", sub: `Oct – Dec ${YEAR}` },
];

const FILTERS = [
  { value: "all",         label: "All" },
  { value: "not_started", label: "Not Started" },
  { value: "started",     label: "Started" },
  { value: "completed",   label: "Completed" },
];

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

/* ── export ──────────────────────────────────────────── */

function exportCSV(materials: LearningMaterial[], activeFilter: string) {
  const filtered = activeFilter === "all" ? materials : materials.filter(m => m.status === activeFilter);
  const sorted = [...filtered].sort((a, b) => a.quarter.localeCompare(b.quarter));

  const headers = ["Quarter", "Title", "Type", "Cadre", "Status", "URL", "Notes"];
  const rows = sorted.map(m => [
    m.quarter,
    m.title,
    TYPE_LABELS[m.type] ?? m.type,
    CADRE_LABELS[m.cadre] ?? m.cadre,
    STATUS_LABELS[m.status] ?? m.status,
    m.url ?? "",
    m.notes ?? "",
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const label = activeFilter === "all" ? "all" : activeFilter.replace("_", "-");
  a.download = `learning-path-${YEAR}-${label}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── page ────────────────────────────────────────────── */

export default function LearningPage() {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState<{ open: boolean; quarter: string; item: LearningMaterial | null }>({
    open: false, quarter: "Q1", item: null,
  });

  async function fetchData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("learning_materials")
      .select("*")
      .eq("user_id", user.id)
      .eq("year", YEAR)
      .order("created_at");

    if (data) setMaterials(data as LearningMaterial[]);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("learning_materials").delete().eq("id", id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  }

  // overall counts for filter pills
  const counts = {
    all:         materials.length,
    not_started: materials.filter(m => m.status === "not_started").length,
    started:     materials.filter(m => m.status === "started").length,
    completed:   materials.filter(m => m.status === "completed").length,
  } as Record<string, number>;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Learning Path</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{YEAR} · Click a quarter to expand</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 flex-shrink-0"
          onClick={() => exportCSV(materials, filter)}
          disabled={materials.length === 0}
        >
          <Download size={14} /> Export
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              filter === f.value
                ? "bg-brand text-white border-brand"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            )}
          >
            {f.label}
            <span className={cn(
              "inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold",
              filter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {counts[f.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Quarter cards */}
      <div className="space-y-3">
        {QUARTERS.map(({ key, label, sub }) => {
          const allQ = materials.filter(m => m.quarter === key);
          const qMaterials = filter === "all" ? allQ : allQ.filter(m => m.status === filter);
          const total = allQ.length;
          const done = allQ.filter(m => m.status === "completed").length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const isExpanded = expandedQ === key;

          return (
            <div key={key} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Quarter header */}
              <button
                onClick={() => setExpandedQ(isExpanded ? null : key)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand font-bold text-xs">{label}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{label} Learning Cycle</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {total > 0 ? (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{done}/{total}</span> completed
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-7">{pct}%</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground hidden sm:block">No items yet</span>
                  )}
                  <ChevronDown
                    size={16}
                    className={cn("text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")}
                  />
                </div>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div className="border-t border-border">
                  {/* Mobile progress */}
                  {total > 0 && (
                    <div className="sm:hidden px-5 py-2.5 border-b border-border/50 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{done}/{total} · {pct}%</span>
                    </div>
                  )}

                  {qMaterials.length === 0 ? (
                    <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                      <GraduationCap size={28} className="opacity-20" />
                      <p className="text-sm">
                        {filter === "all"
                          ? `No items in ${label} yet.`
                          : `No "${STATUS_LABELS[filter]}" items in ${label}.`}
                      </p>
                      {filter === "all" && (
                        <button
                          onClick={() => setModal({ open: true, quarter: key, item: null })}
                          className="text-xs text-brand hover:underline font-medium"
                        >
                          + Add your first item
                        </button>
                      )}
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
                          {qMaterials.map(mat => {
                            const TypeIcon = TYPE_ICONS[mat.type] ?? GraduationCap;
                            return (
                              <tr key={mat.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <TypeIcon size={13} className="text-muted-foreground flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium leading-tight">{mat.title}</p>
                                      {mat.url && (
                                        <a href={mat.url} target="_blank" rel="noopener noreferrer"
                                          className="text-[10px] text-brand hover:underline flex items-center gap-1 mt-0.5">
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
                                      onClick={() => setModal({ open: true, quarter: key, item: mat })}
                                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(mat.id)}
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

                  <div className="px-5 py-3 border-t border-border/50">
                    <button
                      onClick={() => setModal({ open: true, quarter: key, item: null })}
                      className="flex items-center gap-1.5 text-xs text-brand hover:text-brand/80 font-medium transition-colors"
                    >
                      <Plus size={13} /> Add learning item
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <MaterialModal
        open={modal.open}
        quarter={modal.quarter}
        year={YEAR}
        item={modal.item}
        onClose={() => setModal({ open: false, quarter: "Q1", item: null })}
        onSaved={() => { setModal({ open: false, quarter: "Q1", item: null }); fetchData(); }}
      />
    </div>
  );
}
