"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ChevronRight, Camera, Pencil } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/notifications/NotificationBell";
import SearchModal from "@/components/search/SearchModal";
import ImageCropModal from "@/components/ui/image-crop-modal";
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

  // Avatar state — local so it updates without a full page reload
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for avatar updates dispatched by the settings page
  useEffect(() => {
    function onAvatarUpdated(e: Event) {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (url) setAvatarUrl(url);
    }
    window.addEventListener("tm-slate:avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("tm-slate:avatar-updated", onAvatarUpdated);
  }, []);

  // Resolve project name when on a project page
  useEffect(() => {
    const match = pathname.match(/^\/projects\/([^/]+)/);
    if (!match) { setProjectName(null); return; }
    createClient().from("projects").select("name").eq("id", match[1]).single()
      .then(({ data }) => setProjectName(data?.name ?? null));
  }, [pathname]);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setCropSrc(URL.createObjectURL(file));
  }

  async function handleCropped(blob: Blob) {
    setCropSrc(null);
    setUploading(true);
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(`${user.id}.jpg`, blob, { upsert: true, contentType: "image/jpeg" });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(`${user.id}.jpg`);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("users").update({ avatar_url: url }).eq("id", user.id);
      setAvatarUrl(url);
      window.dispatchEvent(new CustomEvent("tm-slate:avatar-updated", { detail: { url } }));
    }
    setUploading(false);
  }

  function handleEditCurrent() {
    if (avatarUrl) setCropSrc(avatarUrl);
  }

  const isProjectPage = /^\/projects\/.+/.test(pathname);
  const pageLabel = pageLabels[pathname] ?? null;
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
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-brand text-white text-xs font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <span className="text-sm font-medium hidden sm:block">{user.name}</span>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
              {/* User info */}
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>

              {/* Photo options */}
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 cursor-pointer"
              >
                <Camera size={14} />
                Change photo
              </DropdownMenuItem>
              {avatarUrl && (
                <DropdownMenuItem
                  onClick={handleEditCurrent}
                  className="gap-2 cursor-pointer"
                >
                  <Pencil size={14} />
                  Edit / crop photo
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-status-overdue cursor-pointer">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Crop modal */}
      {cropSrc && (
        <ImageCropModal
          open={!!cropSrc}
          imageSrc={cropSrc}
          onClose={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onCropped={handleCropped}
        />
      )}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
