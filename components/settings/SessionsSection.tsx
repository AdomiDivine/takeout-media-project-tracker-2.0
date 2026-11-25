"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SectionTitle, SettingRow } from "./SettingRow";

interface Session {
  id: string;
  created_at: string;
  last_active: string | null;
  user_agent: string | null;
  ip: string | null;
}

// Turn a browser user-agent string into something like "Chrome on Windows"
function describeDevice(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\/|Opera/.test(ua) ? "Opera" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) ? "Safari" : "Browser";
  const os =
    /iPhone/.test(ua) ? "iPhone" :
    /iPad/.test(ua) ? "iPad" :
    /Android/.test(ua) ? "Android" :
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X|Macintosh/.test(ua) ? "Mac" :
    /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

// The current login's id is in the access token (the "session_id" claim)
function sessionIdFromToken(token: string | undefined) {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return (payload.session_id as string) ?? null;
  } catch {
    return null;
  }
}

export default function SessionsSection() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: { session } }, { data, error: rpcError }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.rpc("my_sessions"),
    ]);
    setCurrentId(sessionIdFromToken(session?.access_token));
    if (rpcError) { setUnavailable(true); setSessions([]); return; }
    setSessions((data ?? []) as Session[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function logOutOne(id: string) {
    setBusy(id); setError("");
    const { error: revokeError } = await createClient().rpc("revoke_my_session", { p_session_id: id });
    setBusy(null);
    if (revokeError) { setError("Couldn't log out that device. Please try again."); return; }
    setSessions(prev => (prev ?? []).filter(s => s.id !== id));
  }

  async function logOut(scope: "local" | "others" | "global") {
    setBusy(scope); setError("");
    const { error: signOutError } = await createClient().auth.signOut({ scope });
    setBusy(null);
    if (signOutError) { setError(signOutError.message); return; }
    if (scope === "others") { load(); return; }
    router.push("/login");
    router.refresh();
  }

  const others = (sessions ?? []).filter(s => s.id !== currentId);

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle
          description="Devices and browsers currently signed in to your account."
          action={others.length > 0 && (
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs flex-shrink-0"
              disabled={busy !== null} onClick={() => logOut("others")}>
              {busy === "others" ? "Logging out…" : "Log out other devices"}
            </Button>
          )}
        >
          Where you&apos;re logged in
        </SectionTitle>

        {sessions === null && <div className="h-24 bg-muted/40 rounded-lg animate-pulse mt-3" />}

        {unavailable && (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 my-3">
            Your device list will show here once your admin finishes a database update.
          </p>
        )}

        {sessions && sessions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="font-normal py-2 pr-4">Device</th>
                  <th className="font-normal py-2 pr-4">Signed in</th>
                  <th className="font-normal py-2 pr-4">Last active</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const isCurrent = s.id === currentId;
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-3 pr-4">
                        <span>{describeDevice(s.user_agent)}</span>
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">
                            This device
                          </span>
                        )}
                        {s.ip && <p className="text-xs text-muted-foreground mt-0.5">IP {s.ip}</p>}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {format(parseISO(s.created_at), "MMM d, h:mm a")}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {s.last_active ? formatDistanceToNow(parseISO(s.last_active), { addSuffix: true }) : "—"}
                      </td>
                      <td className="py-3 text-right">
                        {!isCurrent && (
                          <button type="button" disabled={busy !== null} onClick={() => logOutOne(s.id)}
                            className="text-xs text-muted-foreground hover:text-status-overdue disabled:opacity-50">
                            {busy === s.id ? "Logging out…" : "Log out"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <SectionTitle>Log out</SectionTitle>
        <SettingRow label="Log out of this device" description="You'll need your password to log back in.">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={busy !== null} onClick={() => logOut("local")}>
            <LogOut size={14} />
            {busy === "local" ? "Logging out…" : "Log out"}
          </Button>
        </SettingRow>
        <SettingRow label="Log out of all devices" description="Signs you out everywhere, including this device.">
          <Button type="button" variant="outline" size="sm"
            className="text-status-overdue hover:text-status-overdue border-status-overdue/30 hover:bg-status-overdue/10"
            disabled={busy !== null} onClick={() => logOut("global")}>
            {busy === "global" ? "Logging out…" : "Log out of all devices"}
          </Button>
        </SettingRow>
      </div>

      {error && <p className="text-sm text-status-overdue">{error}</p>}
    </div>
  );
}
