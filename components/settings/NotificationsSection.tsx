"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  NOTIFICATION_CATEGORIES,
  isNotificationEnabled,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPrefs,
} from "@/lib/notification-prefs";
import { SectionTitle, Toggle } from "./SettingRow";
import type { User } from "@/types";

export default function NotificationsSection({ user, onSaved }: {
  user: User;
  onSaved: (prefs: NotificationPrefs) => void;
}) {
  // The column only exists once migration 027 has been run in Supabase
  const available = "notification_prefs" in user;
  const [prefs, setPrefs] = useState<NotificationPrefs>(user.notification_prefs ?? {});
  const [error, setError] = useState("");

  async function update(channel: NotificationChannel, category: NotificationCategory, on: boolean) {
    const previous = prefs;
    const next: NotificationPrefs = { ...prefs, [channel]: { ...prefs[channel], [category]: on } };
    setPrefs(next); setError("");

    const supabase = createClient();
    const { error: saveError } = await supabase.from("users").update({ notification_prefs: next }).eq("id", user.id);
    if (saveError) {
      setPrefs(previous);
      setError("Couldn't save your notification settings. Please try again.");
      return;
    }
    onSaved(next);
  }

  return (
    <div>
      <SectionTitle description="Choose what you hear about, and where. Changes save automatically.">
        Notifications
      </SectionTitle>

      {!available && (
        <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 my-3">
          Notification settings will be available once your admin finishes a database update.
        </p>
      )}

      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6">
        <span />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2 text-center">Email</span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2 text-center">In-app</span>

        {NOTIFICATION_CATEGORIES.map(c => (
          <div key={c.key} className="contents">
            <div className="py-3.5 border-t border-border min-w-0">
              <p className="text-sm">{c.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
            </div>
            <div className="py-3.5 border-t border-border flex justify-center">
              <Toggle
                label={`Email: ${c.label}`}
                checked={isNotificationEnabled(prefs, "email", c.key)}
                disabled={!available}
                onChange={(on) => update("email", c.key, on)}
              />
            </div>
            <div className="py-3.5 border-t border-border flex justify-center">
              <Toggle
                label={`In-app: ${c.label}`}
                checked={isNotificationEnabled(prefs, "app", c.key)}
                disabled={!available}
                onChange={(on) => update("app", c.key, on)}
              />
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-status-overdue mt-3">{error}</p>}
    </div>
  );
}
