"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const MIN_PASSWORD_LENGTH = 8;

// Password input with a show/hide button
export function PasswordInput({ className, invalid, ...props }: React.ComponentProps<typeof Input> & { invalid?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        aria-invalid={invalid || undefined}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export function passwordChecks(pw: string) {
  return [
    { label: `At least ${MIN_PASSWORD_LENGTH} characters`, ok: pw.length >= MIN_PASSWORD_LENGTH, required: true },
    { label: "Upper and lower case letters", ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), required: false },
    { label: "A number", ok: /\d/.test(pw), required: false },
    { label: "A symbol (e.g. ! @ # ?)", ok: /[^A-Za-z0-9]/.test(pw), required: false },
  ];
}

export function isPasswordAcceptable(pw: string) {
  return pw.length >= MIN_PASSWORD_LENGTH;
}

const LEVELS = [
  { label: "Too short", color: "bg-status-overdue", text: "text-status-overdue" },
  { label: "Weak",      color: "bg-status-overdue", text: "text-status-overdue" },
  { label: "Fair",      color: "bg-amber-500",      text: "text-amber-500" },
  { label: "Good",      color: "bg-status-in-progress", text: "text-status-in-progress" },
  { label: "Strong",    color: "bg-status-completed",   text: "text-status-completed" },
];

// Live strength bar + checklist. Only length is required; the rest are tips.
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = passwordChecks(password);
  const extras = checks.filter(c => !c.required && c.ok).length;
  const level = password.length < MIN_PASSWORD_LENGTH ? 0 : 1 + extras; // 0..4
  const { label, color, text } = LEVELS[level];

  return (
    <div className="space-y-2 pt-1" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 4].map(i => (
            // "Too short" still lights the first bar red so there's visible feedback
            <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i <= Math.max(level, 1) ? color : "bg-muted")} />
          ))}
        </div>
        <span className={cn("text-xs font-medium w-16 text-right", text)}>{label}</span>
      </div>
      <ul className="space-y-0.5">
        {checks.map(c => (
          <li key={c.label} className={cn("flex items-center gap-1.5 text-xs", c.ok ? "text-status-completed" : "text-muted-foreground")}>
            {c.ok ? <Check size={12} /> : c.required ? <X size={12} className="text-status-overdue" /> : <span className="w-3 text-center">·</span>}
            {c.label}
            {!c.required && !c.ok && <span className="opacity-60">(recommended)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// "Passwords match" / "don't match" hint under a confirm field
export function PasswordMatch({ password, confirm }: { password: string; confirm: string }) {
  if (!confirm) return null;
  const match = password === confirm;
  return (
    <p className={cn("text-xs flex items-center gap-1.5 pt-1", match ? "text-status-completed" : "text-status-overdue")} aria-live="polite">
      {match ? <Check size={12} /> : <X size={12} />}
      {match ? "Passwords match" : "Passwords don't match yet"}
    </p>
  );
}
