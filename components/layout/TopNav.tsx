"use client";

import { useState, useEffect } from "react";
import { Search, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/notifications/NotificationBell";
import SearchModal from "@/components/search/SearchModal";
import type { User } from "@/types";

interface TopNavProps {
  user: User;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const pageLabels: Record<string, string> = {
  "/dashboard": "Dashboard", "/tasks": "My Tasks", "/calendar": "Calendar",
  "/activity": "Activity", "/reports": "Reports", "/archive": "Archive",
  "/settings": "Settings", "/projects": "All Projects",
};

export default function TopNav({ user }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);

  // Resolve project name when on a project page
  useEffect(() => {
    const match = pathname.match(/^\/projects\/([^/]+)/);
    if (!match) { setProjectName(null); return; }
    const id = match[1];
    createClient().from("projects").select("name").eq("id", id).single()
      .then(({ data }) => setProjectName(data?.name ?? null));
  }, [pathname]);

  const isProjectPage = /^\/projects\/.+/.test(pathname);
  const pageLabel = pageLabels[pathname] ?? null;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const firstName = user.name.split(" ")[0];

  return (
    <>
      <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 flex-shrink-0">
        <div>
          {isProjectPage ? (
            <div className="flex items-center gap-1.5 text-sm">
              <button onClick={() => router.push("/projects")} className="text-muted-foreground hover:text-foreground transition-colors">Projects</button>
              <ChevronRight size={14} className="text-muted-foreground" />
              <span className="font-semibold truncate max-w-xs">{projectName ?? "Loading…"}</span>
            </div>
          ) : pageLabel ? (
            <h2 className="text-lg font-semibold">{pageLabel}</h2>
          ) : (
            <h2 className="text-lg font-semibold">{getGreeting()}, {firstName} 👋</h2>
          )}
          {!isProjectPage && !pageLabel && (
            <p className="text-xs text-muted-foreground">Here&apos;s what&apos;s happening with your work today.</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors bg-muted rounded-lg px-3 py-1.5 text-sm"
          >
            <Search size={15} />
            <span className="hidden sm:block">Search…</span>
            <kbd className="hidden sm:block text-[10px] bg-background border border-border rounded px-1 py-0.5 ml-1">⌘K</kbd>
          </button>

          <NotificationBell userId={user.id} />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-brand text-white text-xs font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:block">{user.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-status-overdue">Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
