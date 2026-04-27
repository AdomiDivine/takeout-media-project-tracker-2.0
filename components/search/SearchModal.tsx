"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, CheckSquare, LayoutDashboard, Calendar, Activity, Archive, BarChart2 } from "lucide-react";
import {
  CommandDialog, Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from "@/components/ui/command";
import { createClient } from "@/lib/supabase/client";
import type { Task, Project } from "@/types";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const pages = [
  { label: "Dashboard",  href: "/dashboard", icon: LayoutDashboard },
  { label: "My Tasks",   href: "/tasks",     icon: CheckSquare },
  { label: "Calendar",   href: "/calendar",  icon: Calendar },
  { label: "Activity",   href: "/activity",  icon: Activity },
  { label: "Reports",    href: "/reports",   icon: BarChart2 },
  { label: "Archive",    href: "/archive",   icon: Archive },
];

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setTasks([]); setProjects([]); return; }
    setSearching(true);
    const supabase = createClient();
    const [{ data: taskData }, { data: projData }] = await Promise.all([
      supabase.from("tasks").select("*, project:projects(id, name)").ilike("name", `%${q}%`).is("deleted_at", null).limit(6),
      supabase.from("projects").select("*").ilike("name", `%${q}%`).eq("status", "active").limit(4),
    ]);
    setTasks((taskData ?? []) as Task[]);
    setProjects((projData ?? []) as Project[]);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 280);
    return () => clearTimeout(timer);
  }, [query, search]);

  function navigate(href: string) {
    router.push(href);
    onClose();
    setQuery("");
    setTasks([]);
    setProjects([]);
  }

  function handleClose() {
    onClose();
    setQuery("");
    setTasks([]);
    setProjects([]);
  }

  const hasResults = tasks.length > 0 || projects.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search tasks, projects, pages…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {/* Default: show pages when no query */}
          {!query && (
            <CommandGroup heading="Quick navigation">
              {pages.map(page => (
                <CommandItem key={page.href} onSelect={() => navigate(page.href)} className="gap-2.5">
                  <page.icon size={15} className="text-muted-foreground" />
                  {page.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Search results */}
          {query && !searching && !hasResults && (
            <CommandEmpty>No results for &quot;{query}&quot;</CommandEmpty>
          )}

          {query && tasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {tasks.map(task => (
                <CommandItem
                  key={task.id}
                  onSelect={() => navigate(`/projects/${(task as any).project?.id ?? ""}`)}
                  className="gap-2.5"
                >
                  <CheckSquare size={15} className="text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate">{task.name}</span>
                  {(task as any).project?.name && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">{(task as any).project.name}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {query && projects.length > 0 && (
            <>
              {tasks.length > 0 && <CommandSeparator />}
              <CommandGroup heading="Projects">
                {projects.map(project => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => navigate(`/projects/${project.id}`)}
                    className="gap-2.5"
                  >
                    <FolderOpen size={15} className="text-muted-foreground flex-shrink-0" />
                    {project.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
