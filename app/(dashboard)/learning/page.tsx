"use client";

import { useState, useEffect, useRef, type ElementType } from "react";
import { GraduationCap, Plus, ChevronDown, Pencil, Trash2, ExternalLink, BookOpen, Tv, Headphones, FileText, Filter, Check, Download, X } from "lucide-react";
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
    m.quarter, m.title,
    TYPE_LABELS[m.type] ?? m.type,
    CADRE_LABELS[m.cadre] ?? m.cadre,
    STATUS_LABELS[m.status] ?? m.status,
    m.url ?? "", m.notes ?? "",
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `learning-path-${YEAR}${activeFilter !== "all" ? `-${activeFilter}` : ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── page ────────────────────────────────────────────── */

export default function LearningPage() {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("learning_materials").delete().eq("id", id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  }

  const activeFilterLabel = FILTERS.find(f => f.value === filter)?.label;
  const isFiltered = filter !== "all";

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
          <p className="text-xs text-muted-foreground mt-0.5">
            {YEAR} · {isFiltered ? `Showing: ${activeFilterLabel}` : "Click a quarter to expand"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Filter dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors",
                isFiltered
                  ? "border-brand text-brand bg-brand/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card"
              )}
            >
              <Filter size={13} />
              {isFiltered ? activeFilterLabel : "Filter"}
              <ChevronDown size={12} className={cn("transition-transform", filterOpen && "rotate-180")} />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-9 z-20 bg-card border border-border rounded-lg shadow-lg py-1 w-44">
                <button
                  onClick={() => { setFilter("all"); setFilterOpen(false); }}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <span className={filter === "all" ? "text-brand font-medium" : ""}>All items</span>
                  {filter === "all" && <Check size={13} className="text-brand" />}
                </button>
                <div className="border-t border-border/50 my-1" />
                {FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setFilter(f.value); setFilterOpen(false); }}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        f.value === "not_started" && "bg-muted-foreground",
                        f.value === "started" && "bg-status-in-progress",
                        f.value === "completed" && "bg-status-completed",
                      )} />
                      <span className={filter === f.value ? "text-brand font-medium" : ""}>{f.label}</span>
                    </div>
                    {filter === f.value && <Check size={13} className="text-brand" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => exportCSV(materials, filter)}
            disabled={materials.length === 0}
          >
            <Download size={14} /> Export
          </Button>
        </div>
      </div>

      {/* ── FILTERED VIEW: flat list, everything immediately visible ── */}
      {isFiltered && (
        <div className="space-y-4">
          {/* Clear filter banner */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              {materials.filter(m => m.status === filter).length} item{materials.filter(m => m.status === filter).length !== 1 ? "s" : ""} · {activeFilterLabel}
            </p>
            <button
              onClick={() => setFilter("all")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={12} /> Clear filter
            </button>
          </div>

          {QUARTERS.map(({ key, label }) => {
            const qItems = materials.filter(m => m.quarter === key && m.status === filter);
            if (qItems.length === 0) return null;
            return (
              <div key={key} className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {label} Learning Cycle
                </p>
                {qItems.map(mat => {
                  const TypeIcon = TYPE_ICONS[mat.type] ?? GraduationCap;
                  return (
                    <div key={mat.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <TypeIcon size={14} className="text-brand" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-tight">{mat.title}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[mat.type]}</span>
                            <span className="text-muted-foreground/40 text-[10px]">·</span>
                            <Badge variant="outline" className={cn("text-[10px]", CADRE_STYLES[mat.cadre])}>
                              {CADRE_LABELS[mat.cadre]}
                            </Badge>
                          </div>
                          {mat.url && (
                            <a href={mat.url} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-brand hover:underline flex items-center gap-1 mt-1">
                              <ExternalLink size={9} /> Open link
                            </a>
                          )}
                          {mat.notes && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{mat.notes}</p>}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 flex-shrink-0">
                        <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[mat.status])}>
                          {STATUS_LABELS[mat.status]}
                        </Badge>
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
                    </div>
                  );
                })}
              </div>
            );
          })}

          {materials.filter(m => m.status === filter).length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <GraduationCap size={36} className="opacity-20" />
              <p className="text-sm">No "{activeFilterLabel}" items found.</p>
            </div>
          )}
        </div>
      )}

      {/* ── DEFAULT VIEW: quarter accordion cards ── */}
      {!isFiltered && (
        <div className="space-y-3">
          {QUARTERS.map(({ key, label, sub }) => {
            const qMaterials = materials.filter(m => m.quarter === key);
            const total = qMaterials.length;
            const done = qMaterials.filter(m => m.status === "completed").length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isExpanded = expandedQ === key;

            return (
              <div key={key} className="bg-card border border-border rounded-xl overflow-hidden">
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
                    <ChevronDown size={16} className={cn("text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
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
                        <p className="text-sm">No items in {label} yet.</p>
                        <button
                          onClick={() => setModal({ open: true, quarter: key, item: null })}
                          className="text-xs text-brand hover:underline font-medium"
                        >
                          + Add your first item
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
      )}

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
