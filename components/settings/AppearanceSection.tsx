"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, getThemePreference, THEME_EVENT, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { SectionTitle, SettingRow } from "./SettingRow";

const OPTIONS: { key: ThemePreference; label: string; icon: React.ElementType }[] = [
  { key: "light",  label: "Light",  icon: Sun },
  { key: "dark",   label: "Dark",   icon: Moon },
  { key: "system", label: "System", icon: Monitor },
];

export default function AppearanceSection() {
  const [theme, setTheme] = useState<ThemePreference>("dark");

  useEffect(() => {
    // Read the saved choice after mount (localStorage isn't available during server render)
    const sync = () => setTheme(getThemePreference());
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  return (
    <div>
      <SectionTitle>Appearance</SectionTitle>
      <SettingRow label="Theme" description="System matches your computer's light or dark setting. Saved on this device.">
        <div role="radiogroup" aria-label="Theme" className="inline-flex gap-1 rounded-lg bg-muted p-1">
          {OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={theme === key}
              onClick={() => applyTheme(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                theme === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </SettingRow>
    </div>
  );
}
