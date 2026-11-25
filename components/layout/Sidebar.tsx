"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CheckSquare, Calendar, Activity, Archive, BarChart2, FolderOpen, Settings, LogOut, ChevronDown, ChevronRight, Sun, Moon, Building2, GraduationCap, Users, Bell, ChevronsUpDown } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { applyTheme, getThemePreference, resolveDark, THEME_EVENT } from "@/lib/theme";
import type { Brand, Project, User } from "@/types";

const ROLE_LABELS: Record<string, string> = { super_admin: "Super Admin", admin: "Admin", member: "Member" };

interface SidebarProps {
  user: User;
  brands: Brand[];
  projects: Project[];
}

const adminNavItems = [
  { label: "Dashboard",     href: "/dashboard",  icon: LayoutDashboard },
  { label: "Members",       href: "/members",    icon: Users },
  { label: "Brands",        href: "/brands",     icon: Building2 },
  { label: "Projects",      href: "/projects",   icon: FolderOpen },
  { label: "Tasks",         href: "/tasks",      icon: CheckSquare },
  { label: "Learning Path", href: "/learning",   icon: GraduationCap },
  { label: "Reports",       href: "/reports",    icon: BarChart2 },
  { label: "Activity",      href: "/activity",   icon: Bell },
  { label: "Archive",       href: "/archive",    icon: Archive },
];

const userNavItems = [
  { label: "Dashboard",     href: "/dashboard",  icon: LayoutDashboard },
  { label: "My Tasks",      href: "/tasks",      icon: CheckSquare },
  { label: "Brands",        href: "/brands",     icon: Building2 },
  { label: "Schedule",      href: "/calendar",   icon: Calendar },
  { label: "Activity",      href: "/activity",   icon: Activity },
  { label: "Learning Path", href: "/learning",   icon: GraduationCap },
];

export default function Sidebar({ user, brands, projects }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [brandsOpen, setBrandsOpen] = useState(true);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);

  useEffect(() => {
    const onAvatar = (e: Event) => setAvatarUrl((e as CustomEvent<{ url: string }>).detail.url);
    window.addEventListener("tm-slate:avatar-updated", onAvatar);
    return () => window.removeEventListener("tm-slate:avatar-updated", onAvatar);
  }, []);

  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const navItems = isAdmin ? adminNavItems : userNavItems;

  useEffect(() => {
    // Apply the saved theme, follow the computer's setting when "system",
    // and stay in sync when the theme is changed in Settings > Appearance.
    const sync = () => {
      const dark = resolveDark(getThemePreference());
      setIsDark(dark);
      document.documentElement.classList.toggle("dark", dark);
    };
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    window.addEventListener(THEME_EVENT, sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener(THEME_EVENT, sync);
    };
  }, []);

  // Auto-expand the brand whose project is currently active
  useEffect(() => {
    const match = pathname.match(/^\/projects\/([^/]+)/);
    if (match) {
      const project = projects.find(p => p.id === match[1]);
      if (project?.brand_id) setExpandedBrand(project.brand_id);
    }
    const brandMatch = pathname.match(/^\/brands\/([^/]+)/);
    if (brandMatch) setExpandedBrand(brandMatch[1]);
  }, [pathname, projects]);

  function toggleTheme() {
    applyTheme(isDark ? "light" : "dark");
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
        <p className="text-foreground font-bold text-lg leading-tight">TM Workroom</p>
        <p className="text-muted-foreground text-xs leading-tight mt-0.5">Every project, in the room.</p>
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

        {/* Brands — only for non-admin users */}
        {!isAdmin && <div>
          <button
            onClick={() => setBrandsOpen(!brandsOpen)}
            className="flex items-center justify-between w-full px-2 mb-2"
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Brands</p>
            {brandsOpen
              ? <ChevronDown size={12} className="text-muted-foreground" />
              : <ChevronRight size={12} className="text-muted-foreground" />}
          </button>

          {brandsOpen && (
            <ul className="space-y-0.5">
              {/* All Projects link */}
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

              {/* Individual brands with nested projects */}
              {brands.map(brand => {
                const brandProjects = projects.filter(p => p.brand_id === brand.id);
                const isExpanded = expandedBrand === brand.id;
                const isBrandActive = pathname === `/brands/${brand.id}`;

                return (
                  <li key={brand.id}>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/brands/${brand.id}`}
                        className={cn(
                          "flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                          isBrandActive
                            ? "text-foreground font-medium bg-muted"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand/60 flex-shrink-0" />
                        <span className="truncate">{brand.name}</span>
                      </Link>
                      {brandProjects.length > 0 && (
                        <button
                          onClick={() => setExpandedBrand(isExpanded ? null : brand.id)}
                          className="p-1 text-muted-foreground hover:text-foreground rounded flex-shrink-0"
                        >
                          {isExpanded
                            ? <ChevronDown size={11} />
                            : <ChevronRight size={11} />}
                        </button>
                      )}
                    </div>

                    {/* Nested projects under brand */}
                    {isExpanded && brandProjects.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5">
                        {brandProjects.map(project => (
                          <li key={project.id}>
                            <Link
                              href={`/projects/${project.id}`}
                              className={cn(
                                "flex items-center gap-2.5 pl-8 pr-2 py-1.5 rounded-md text-sm transition-colors",
                                pathname === `/projects/${project.id}`
                                  ? "text-foreground font-medium bg-muted"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              )}
                            >
                              <span className="truncate">{project.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>}
      </nav>

      {/* Bottom: your profile. Click for Settings, theme and log out */}
      <div className="border-t border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md hover:bg-muted transition-colors outline-none text-left">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center flex-shrink-0 overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-xs font-semibold text-white">{user.name.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.job_title || ROLE_LABELS[user.role] || user.role}</p>
            </div>
            <ChevronsUpDown size={14} className="text-muted-foreground flex-shrink-0" />
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="start" className="w-60">
            <p className="px-2 pt-1.5 pb-2 text-xs text-muted-foreground truncate">{user.email}</p>
            <DropdownMenuItem onClick={() => router.push("/settings")} className="gap-2 cursor-pointer">
              <Settings size={15} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme} className="gap-2 cursor-pointer">
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
              {isDark ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
              <LogOut size={15} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
