// Notification preferences stored in users.notification_prefs (see migration 027).
// Shape: { email?: { [category]: boolean }, app?: { [category]: boolean } }
// Anything missing counts as ON.

export type NotificationChannel = "email" | "app";
export type NotificationCategory = "assigned" | "overdue" | "completed" | "blocker";
export type NotificationPrefs = Partial<Record<NotificationChannel, Partial<Record<NotificationCategory, boolean>>>>;

export const NOTIFICATION_CATEGORIES: { key: NotificationCategory; label: string; description: string }[] = [
  { key: "assigned",  label: "Task assigned to me", description: "When someone adds you to a task." },
  { key: "overdue",   label: "Task overdue",        description: "When one of your tasks passes its due date." },
  { key: "completed", label: "Task completed",      description: "When a task you're on is marked done." },
  { key: "blocker",   label: "Blocker added",       description: "When someone flags a blocker on your task." },
];

export function isNotificationEnabled(
  prefs: NotificationPrefs | null | undefined,
  channel: NotificationChannel,
  category: NotificationCategory
) {
  return prefs?.[channel]?.[category] !== false;
}
