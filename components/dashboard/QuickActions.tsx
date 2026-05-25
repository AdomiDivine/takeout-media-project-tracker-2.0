"use client";

import { useEffect, useState } from "react";
import { UserPlus, BarChart2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function QuickActions() {
  const router = useRouter();
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
      if (data) setUserRole(data.role);
    }
    fetchRole();
  }, []);

  const isAdmin = ["super_admin", "admin"].includes(userRole);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
      <div className={`grid gap-2 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
        {isAdmin && (
          <button
            onClick={() => router.push("/settings?tab=members")}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center">
              <UserPlus size={16} className="text-brand" />
            </div>
            <span className="text-[11px] font-medium text-center leading-tight">Manage Members</span>
          </button>
        )}
        <button
          onClick={() => router.push("/reports")}
          className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center">
            <BarChart2 size={16} className="text-brand" />
          </div>
          <span className="text-[11px] font-medium text-center leading-tight">View Reports</span>
        </button>
      </div>
    </div>
  );
}
