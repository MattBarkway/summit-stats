"use client";

import type { CycleType } from "@/hooks/useGroups";
import { cycleLabel } from "./CyclePill";

type Window = { start: string; end: string };

function startOfWeek(d: Date): Date {
  // ISO Monday
  const x = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = x.getUTCDay() || 7; // Sun = 7
  x.setUTCDate(x.getUTCDate() - (day - 1));
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getUTCMonth() / 3);
  return new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
}

function startOfYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

function addInterval(d: Date, cycle: CycleType): Date {
  const x = new Date(d);
  switch (cycle) {
    case "weekly":
      x.setUTCDate(x.getUTCDate() + 7);
      return x;
    case "monthly":
      x.setUTCMonth(x.getUTCMonth() + 1);
      return x;
    case "quarterly":
      x.setUTCMonth(x.getUTCMonth() + 3);
      return x;
    case "yearly":
      x.setUTCFullYear(x.getUTCFullYear() + 1);
      return x;
    case "all_time":
      return x;
  }
}

function startOf(cycle: CycleType, d: Date): Date {
  switch (cycle) {
    case "weekly":
      return startOfWeek(d);
    case "monthly":
      return startOfMonth(d);
    case "quarterly":
      return startOfQuarter(d);
    case "yearly":
      return startOfYear(d);
    case "all_time":
      return new Date(0);
  }
}

/**
 * Build last N cycles up to and including current. Optional `groupCreated`
 * truncates: don't offer cycles older than the group itself.
 */
export function buildCycleWindows(
  cycle: CycleType,
  count = 6,
  groupCreated?: string,
): Window[] {
  if (cycle === "all_time") return [];
  const created = groupCreated ? new Date(groupCreated) : null;
  const now = new Date();
  let cursor = startOf(cycle, now);
  const out: Window[] = [];
  for (let i = 0; i < count; i++) {
    const next = addInterval(cursor, cycle);
    if (created && next <= created) break;
    out.push({ start: cursor.toISOString(), end: next.toISOString() });
    const prevCandidate = startOf(cycle, new Date(cursor.getTime() - 1));
    if (prevCandidate.getTime() === cursor.getTime()) break;
    cursor = prevCandidate;
  }
  return out;
}

function windowLabel(cycle: CycleType, w: Window): string {
  return cycleLabel(cycle, w.start, w.end);
}

export default function CycleSelector({
  cycle,
  selected,
  onChange,
}: {
  cycle: CycleType;
  selected: Window | null; // null = current cycle
  onChange: (w: Window | null) => void;
}) {
  if (cycle === "all_time") return null;
  const windows = buildCycleWindows(cycle, 6);

  return (
    <select
      value={selected ? `${selected.start}|${selected.end}` : ""}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) {
          onChange(null);
          return;
        }
        const [start, end] = v.split("|");
        onChange({ start, end });
      }}
      className="rounded-full bg-white/40 backdrop-blur-sm border border-white/40 px-3 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#558d73]"
    >
      <option value="">Current cycle</option>
      {windows.slice(1).map((w) => (
        <option key={w.start} value={`${w.start}|${w.end}`}>
          {windowLabel(cycle, w)}
        </option>
      ))}
    </select>
  );
}
