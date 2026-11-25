"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const JOB_TITLES = [
  "Account Manager",
  "Brand Strategist",
  "Content Strategist",
  "Content Writer",
  "Copywriter",
  "Creative Director",
  "Developer",
  "Graphic Designer",
  "Intern",
  "Marketing Strategist",
  "Motion Designer",
  "Photographer",
  "Project Manager",
  "Social Media Manager",
  "Video Editor",
  "Videographer",
];

const OTHER = "__other__";
const NONE = "__none__";

// Dropdown of common job titles, with "Other" for anything not on the list.
export default function JobTitleField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isListed = value === "" || JOB_TITLES.includes(value);
  const [otherMode, setOtherMode] = useState(!isListed);

  const selectValue = otherMode ? OTHER : value === "" ? NONE : value;

  return (
    <div className="w-full sm:w-64 space-y-2">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (!v) return;
          if (v === OTHER) { setOtherMode(true); if (JOB_TITLES.includes(value)) onChange(""); return; }
          setOtherMode(false);
          onChange(v === NONE ? "" : v);
        }}
      >
        <SelectTrigger className="w-full" aria-label="Job title">
          <SelectValue>
            {selectValue === NONE ? "Select a job title" : selectValue === OTHER ? "Other" : selectValue}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE} label="No job title">No job title</SelectItem>
          {JOB_TITLES.map(t => <SelectItem key={t} value={t} label={t}>{t}</SelectItem>)}
          <SelectItem value={OTHER} label="Other">Other…</SelectItem>
        </SelectContent>
      </Select>
      {otherMode && (
        <Input
          placeholder="Type your job title"
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-label="Other job title"
          autoFocus
        />
      )}
    </div>
  );
}
