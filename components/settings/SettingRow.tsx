import { Label } from "@/components/ui/label";

// Layout helpers for Settings: a section heading and a
// "label + description on the left, control on the right" row.

export const FIELD = "w-full sm:w-64";

export function SectionTitle({ children, description, action }: {
  children: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-1">
      <div>
        <h3 className="text-sm font-semibold">{children}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SettingRow({ label, description, htmlFor, children }: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 py-3.5 border-b border-border last:border-0">
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="text-sm font-normal">{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0 sm:text-right">{children}</div>
    </div>
  );
}

// Accessible on/off switch
export function Toggle({ checked, onChange, disabled, label }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed " +
        (checked ? "bg-brand" : "bg-muted-foreground/30")
      }
    >
      <span
        className={
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform " +
          (checked ? "translate-x-[18px]" : "translate-x-0.5")
        }
      />
    </button>
  );
}
