"use client";

import { useEffect, useState, useCallback } from "react";
import type { UserStatus } from "@/app/api/users/status/route";

// Admin-only: deactivated flag + last active time for every user.
// Returns an empty map for non-admins (the API answers 403).
export function useUserStatuses() {
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});

  const refresh = useCallback(async () => {
    const res = await fetch("/api/users/status");
    if (!res.ok) return;
    const { users } = await res.json();
    setStatuses(users ?? {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { statuses, setStatuses, refresh };
}

// Active people first (in their existing order), deactivated ones at the bottom
export function activeFirst<T extends { id: string }>(list: T[], statuses: Record<string, UserStatus>) {
  return [...list].sort((a, b) => Number(!!statuses[a.id]?.deactivated) - Number(!!statuses[b.id]?.deactivated));
}
