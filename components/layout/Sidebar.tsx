"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CheckSquare, Calendar, Activity, Archive, BarChart2, FolderOpen, Settings, LogOut, ChevronDown, ChevronRight, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Project, User } from "@/types";

interface SidebarProps {
  user: User;
  projects: Project[];
}

const navItems = [
  { label: "Dashboard", href: "/dashboard",  icon: LayoutDashboard },
  { label: "My Tasks",  href: "/tasks",      icon: CheckSquare },
  { label: "Calendar",  href: "/calendar",   icon: Calendar },
  { label: "Activity",  href: "/activity",   icon: Activity },
  { label: "Reports",   href: "/reports",    icon: BarChart2 },
  { label: "Archive",   href: "/archive",    icon: Archive },
];

export default function Sidebar({ user, projects }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const dark = stored !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-sidebar border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <p className="text-foreground font-bold text-lg leading-tight">TM Slate</p>
        <p className="text-muted-foreground text-xs leading-tight mt-0.5">Every project, on slate.</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {/* Navigation */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Navigation</p>
          <ul className="space-y-0.5">
            {navItems.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors",
                    pathname === href
                      ? "bg-brand text-white font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Projects */}
        <div>
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="flex items-center justify-between w-full px-2 mb-2"
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Projects</p>
            {projectsOpen ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
          </button>

          {projectsOpen && (
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/projects"
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors",
                    pathname === "/projects"
                      ? "bg-brand text-white font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <FolderOpen size={16} />
                  All Projects
                </Link>
              </li>
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors pl-7",
                      pathname === `/projects/${project.id}`
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-2 space-y-0.5">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full text-left"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Settings size={16} />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full text-left"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
