"use client";

import { useState, useEffect } from "react";
import { Plus, GraduationCap, BookOpen, Tv, Headphones, FileText, MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import LearningModal from "@/components/learning/LearningModal";
import type { LearningPath } from "@/types";

const TYPE_ICONS: Record<string, React.ElementType> = {
  book:    BookOpen,
  course:  GraduationCap,
  video:   Tv,
  podcast: Headphones,
  article: FileText,
  other:   GraduationCap,
};

const TYPE_LABELS: Record<string, string> = {
  book: "Book", course: "Course", video: "Video",
  podcast: "Podcast", article: "Article", other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-status-in-progress/10 text-status-in-progress border-status-in-progress/30",
  completed:   "bg-status-completed/10 text-status-completed border-status-completed/30",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed:   "Completed",
};

const GROUP_ORDER = ["in_progress", "not_started", "completed"] as const;

export default function LearningPage() {
  const [items, setItems] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<LearningPath | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  async function fetchItems() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("learning_paths")
      .select("*, brand:brands(id,name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setItems(data as LearningPath[]);
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, []);

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("learning_paths").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    setOpenMenu(null);
  }

  const grouped = GROUP_ORDER.reduce((acc, status) => {
    acc[status] = items.filter(i => i.status === status);
    return acc;
  }, {} as Record<string, LearningPath[]>);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6" onClick={() => setOpenMenu(null)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Learning Path</h2>
        <Button onClick={() => { setEditItem(null); setModalOpen(true); }} size="sm" className="bg-brand hover:bg-brand/90 text-white gap-1.5">
          <Plus size={16} /> Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <GraduationCap size={48} className="opacity-20" />
          <p className="text-sm">Nothing on your learning path yet.</p>
          <Button size="sm" variant="outline" onClick={() => { setEditItem(null); setModalOpen(true); }}>Add your first item</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {GROUP_ORDER.map(status => {
            const group = grouped[status];
            if (group.length === 0) return null;
            return (
              <div key={status} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {STATUS_LABELS[status]} <span className="font-normal">({group.length})</span>
                </p>
                <div className="space-y-2">
                  {group.map(item => {
                    const TypeIcon = TYPE_ICONS[item.type] ?? GraduationCap;
                    return (
                      <div
                        key={item.id}
                        className="bg-card border border-border rounded-xl p-4 flex items-start gap-4 relative"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Type icon */}
                        <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <TypeIcon size={16} className="text-brand" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm leading-tight">{item.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[item.type]}</Badge>
                                <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[item.status]}`}>
                                  {STATUS_LABELS[item.status]}
                                </Badge>
                                {(item as any).brand?.name && (
                                  <span className="text-[10px] text-brand font-medium uppercase tracking-wider">{(item as any).brand.name}</span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="relative flex-shrink-0">
                              <button
                                onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === item.id ? null : item.id); }}
                                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                              >
                                <MoreVertical size={15} />
                              </button>
                              {openMenu === item.id && (
                                <div className="absolute right-0 top-7 z-10 bg-card border border-border rounded-lg shadow-lg py-1 w-36">
                                  {item.url && (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                                      onClick={() => setOpenMenu(null)}
                                    >
                                      <ExternalLink size={13} /> Open link
                                    </a>
                                  )}
                                  <button
                                    onClick={() => { setEditItem(item); setModalOpen(true); setOpenMenu(null); }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                  >
                                    <Pencil size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-status-overdue transition-colors w-full text-left"
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                          )}

                          {/* Progress bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand rounded-full transition-all"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-8 text-right">{item.progress}%</span>
                          </div>

                          {item.target_date && (
                            <p className="text-[10px] text-muted-foreground">
                              Target: {new Date(item.target_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LearningModal
        open={modalOpen}
        item={editItem}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSaved={() => { setModalOpen(false); setEditItem(null); fetchItems(); }}
      />
    </div>
  );
}
