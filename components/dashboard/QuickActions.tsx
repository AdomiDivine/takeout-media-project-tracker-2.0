"use client";

import { UserPlus, BarChart2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuickActions() {
  const router = useRouter();

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => router.push("/settings?tab=members")}
          className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center">
            <UserPlus size={16} className="text-brand" />
          </div>
          <span className="text-[11px] font-medium text-center leading-tight">Invite Member</span>
        </button>
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
