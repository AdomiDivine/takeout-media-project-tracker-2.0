"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  differenceInCalendarDays, endOfMonth, endOfWeek, format, getQuarter,
  isWithinInterval, parseISO, startOfMonth, startOfWeek,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./SettingRow";
import type { Task, User } from "@/types";

type Period = "week" | "month";

// /api/tasks/mine returns members as { user } rows and the full project
type UsageTask = Omit<Task, "members" | "project"> & {
  start_date?: string | null;
  members?: { user: { id: string } | null }[];
  project?: { id: string; name: string; brand_id?: string | null } | null;
};

interface LearningItem { status: string }

// ── Small building blocks ────────────────────────────────────

function UsageRow({ label, hint, pct, value, tone = "brand" }: {
  label: string;
  hint?: string;
  pct: number | null;          // 0–100, or null for "no bar"
  value: string;
  tone?: "brand" | "good" | "bad";
}) {
  const bar = tone === "good" ? "bg-status-completed" : tone === "bad" ? "bg-status-overdue" : "bg-brand";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-x-6 gap-y-1.5 py-3.5 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {pct === null ? <span className="hidden sm:block" /> : (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden" role="presentation">
          <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
        </div>
      )}
      <p className="text-sm text-muted-foreground sm:text-right whitespace-nowrap">{value}</p>
    </div>
  );
}

function Block({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionTitle description={description}>{title}</SectionTitle>
      <div>{children}</div>
    </section>
  );
}

const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const inRange = (iso: string | null | undefined, start: Date, end: Date) =>
  !!iso && isWithinInterval(parseISO(iso.length === 10 ? iso + "T12:00:00" : iso), { start, end });

// ── Usage section ────────────────────────────────────────────

export default function UsageSection({ user }: { user: User }) {
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const [period, setPeriod] = useState<Period>("week");
  const [tasks, setTasks] = useState<UsageTask[] | null>(null);
  const [brands, setBrands] = useState<Record<string, string>>({});
  const [learning, setLearning] = useState<LearningItem[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [lastActive, setLastActive] = useState<Record<string, string | null>>({});

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const now = new Date();
      const [tasksRes, { data: brandRows }, { data: learningRows }] = await Promise.all([
        fetch("/api/tasks/mine"),
        supabase.from("brands").select("id, name"),
        supabase.from("learning_materials").select("status")
          .eq("user_id", user.id).eq("quarter", `Q${getQuarter(now)}`).eq("year", now.getFullYear()),
      ]);
      setTasks(tasksRes.ok ? await tasksRes.json() : []);
      setBrands(Object.fromEntries((brandRows ?? []).map(b => [b.id, b.name])));
      setLearning((learningRows ?? []) as LearningItem[]);

      if (isAdmin) {
        const [{ data: memberRows }, statusRes] = await Promise.all([
          supabase.from("users").select("*").eq("role", "member").order("name"),
          fetch("/api/users/status"),
        ]);
        const statuses = statusRes.ok ? (await statusRes.json()).users ?? {} : {};
        // Leave deactivated people out of team numbers
        setMembers(((memberRows ?? []) as User[]).filter(m => !statuses[m.id]?.deactivated));
        setLastActive(Object.fromEntries(Object.entries(statuses).map(([id, s]) => [id, (s as { last_active: string | null }).last_active])));
      }
    }
    load();
  }, [user.id, isAdmin]);

  const now = new Date();
  const start = period === "week" ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
  const end = period === "week" ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);
  const periodLabel = period === "week"
    ? `${format(start, "MMM d")} – ${format(end, "MMM d")}`
    : format(start, "MMMM yyyy");

  // Your tasks: ones you created or are assigned to (admins get everyone's from the API)
  const mine = useMemo(
    () => (tasks ?? []).filter(t => t.created_by === user.id || t.members?.some(m => m.user?.id === user.id)),
    [tasks, user.id]
  );

  if (tasks === null) {
    return <div className="h-80 bg-muted/40 rounded-lg animate-pulse" />;
  }

  // 1. Completed out of due this period
  const dueThisPeriod = mine.filter(t => inRange(t.deadline, start, end));
  const doneOfDue = dueThisPeriod.filter(t => t.status === "completed").length;

  // 2 & 4. Finished this period: on time? how long did they take?
  const finished = mine.filter(t => t.status === "completed" && inRange(t.completed_at, start, end));
  const onTime = finished.filter(t => t.completed_at && t.completed_at.slice(0, 10) <= t.deadline).length;
  const daysTaken = finished.map(t =>
    Math.max(0, differenceInCalendarDays(parseISO(t.completed_at!), parseISO(t.start_date || t.created_at)))
  );
  const avgDays = daysTaken.length ? daysTaken.reduce((a, b) => a + b, 0) / daysTaken.length : null;

  // 3. Overdue right now
  const overdueNow = mine.filter(t => t.status === "overdue").length;

  // 5 & 6. Where your time went: tasks due or finished this period
  const active = Array.from(new Map([...dueThisPeriod, ...finished].map(t => [t.id, t])).values());
  const byBrand = new Map<string, number>();
  for (const t of active) {
    const name = (t.project?.brand_id && brands[t.project.brand_id]) || "No brand";
    byBrand.set(name, (byBrand.get(name) ?? 0) + 1);
  }
  const brandRows = [...byBrand.entries()].sort((a, b) => b[1] - a[1]);
  const priorities = (["high", "medium", "low"] as const).map(p => ({ p, n: active.filter(t => t.priority === p).length }));

  // 7. Learning this quarter
  const learningStarted = learning.filter(l => l.status !== "not_started").length;
  const learningDone = learning.filter(l => l.status === "completed").length;

  // 8. Team (admins)
  const memberIds = new Set(members.map(m => m.id));
  const activeMembers = members.filter(m => inRange(lastActive[m.id], start, end)).length;
  const teamTasks = (tasks ?? []).filter(t =>
    memberIds.has(t.created_by) || t.members?.some(m => m.user && memberIds.has(m.user.id))
  );
  const teamCreated = teamTasks.filter(t => inRange(t.created_at, start, end)).length;
  const teamCompleted = teamTasks.filter(t => t.status === "completed" && inRange(t.completed_at, start, end)).length;
  const overdueByMember = members
    .map(m => ({
      m,
      n: teamTasks.filter(t => t.status === "overdue" &&
        (t.created_by === m.id || t.members?.some(x => x.user?.id === m.id))).length,
    }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold">Your usage</h3>
          <p className="text-xs text-muted-foreground mt-0.5">How your work is going · {periodLabel}</p>
        </div>
        <div role="radiogroup" aria-label="Period" className="inline-flex gap-1 rounded-lg bg-muted p-1 mr-8 sm:mr-10">
          {(["week", "month"] as Period[]).map(p => (
            <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}
              className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors",
                period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {p === "week" ? "This week" : "This month"}
            </button>
          ))}
        </div>
      </div>

      <Block title="Progress">
        <UsageRow
          label="Tasks completed"
          hint="Out of the tasks due in this period"
          pct={pctOf(doneOfDue, dueThisPeriod.length)}
          value={dueThisPeriod.length ? `${doneOfDue} of ${dueThisPeriod.length} · ${pctOf(doneOfDue, dueThisPeriod.length)}%` : "Nothing due"}
          tone="good"
        />
        <UsageRow
          label="Finished on time"
          hint="Tasks you finished by their due date"
          pct={finished.length ? pctOf(onTime, finished.length) : 0}
          value={finished.length ? `${onTime} of ${finished.length} · ${pctOf(onTime, finished.length)}%` : "None finished yet"}
          tone="good"
        />
        <UsageRow
          label="Overdue right now"
          hint="Past their due date and not finished"
          pct={null}
          value={overdueNow === 0 ? "None 🎉" : `${overdueNow} task${overdueNow === 1 ? "" : "s"}`}
        />
        {overdueNow > 0 && (
          <div className="-mt-2 pb-2 text-right">
            <Link href="/tasks" className="text-xs text-brand hover:underline">See overdue tasks</Link>
          </div>
        )}
        <UsageRow
          label="Average time to finish"
          hint="From a task's start date to when it was done"
          pct={null}
          value={avgDays === null ? "—" : avgDays < 1 ? "Same day" : `${avgDays.toFixed(1)} days`}
        />
      </Block>

      <Block title="Where your time went" description="Tasks due or finished in this period.">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No tasks in this period yet.</p>
        ) : (
          <>
            {brandRows.map(([name, n]) => (
              <UsageRow key={name} label={name} pct={pctOf(n, active.length)} value={`${n} task${n === 1 ? "" : "s"} · ${pctOf(n, active.length)}%`} />
            ))}
            <div className="pt-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">By priority</p>
              {priorities.map(({ p, n }) => (
                <UsageRow key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} pct={pctOf(n, active.length)}
                  value={`${n} · ${pctOf(n, active.length)}%`} tone={p === "high" ? "bad" : "brand"} />
              ))}
            </div>
          </>
        )}
      </Block>

      <Block title="Learning Path" description={`Q${getQuarter(now)} ${now.getFullYear()}`}>
        {learning.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">
            Nothing on your learning path this quarter. <Link href="/learning" className="text-brand hover:underline">Add something</Link>
          </p>
        ) : (
          <>
            <UsageRow label="Started" pct={pctOf(learningStarted, learning.length)} value={`${learningStarted} of ${learning.length}`} />
            <UsageRow label="Completed" pct={pctOf(learningDone, learning.length)} value={`${learningDone} of ${learning.length}`} tone="good" />
          </>
        )}
      </Block>

      {isAdmin && (
        <Block title="Team activity" description="Members you manage. Deactivated accounts aren't counted.">
          <UsageRow
            label="Active members"
            hint="Logged in or did something in this period"
            pct={pctOf(activeMembers, members.length)}
            value={`${activeMembers} of ${members.length}`}
          />
          <UsageRow
            label="Tasks completed vs. created"
            hint="Across the team in this period"
            pct={teamCreated ? pctOf(teamCompleted, teamCreated) : 0}
            value={`${teamCompleted} done · ${teamCreated} new`}
            tone="good"
          />
          <div className="pt-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Most overdue work</p>
            {overdueByMember.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No one has overdue tasks.</p>
            ) : overdueByMember.map(({ m, n }) => (
              <Link key={m.id} href={`/members/${m.id}`}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors">
                <span className="text-sm truncate">{m.name}</span>
                <span className="text-sm text-status-overdue whitespace-nowrap">{n} overdue</span>
              </Link>
            ))}
          </div>
        </Block>
      )}
    </div>
  );
}
