"use client";

import { Calendar } from "lucide-react";
import type { CycleInfo, CycleType } from "@/hooks/useGroups";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function cycleLabel(
  cycle_type: CycleType,
  cycle_start: string,
  cycle_end: string,
): string {
  const start = new Date(cycle_start);
  const end = new Date(cycle_end);
  switch (cycle_type) {
    case "weekly": {
      const lastDay = new Date(end.getTime() - 86_400_000);
      const sameMonth = start.getMonth() === lastDay.getMonth();
      const startStr = `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()}`;
      const endStr = sameMonth
        ? `${lastDay.getDate()}`
        : `${SHORT_MONTHS[lastDay.getMonth()]} ${lastDay.getDate()}`;
      return `${startStr}–${endStr}`;
    }
    case "monthly":
      return `${SHORT_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
    case "quarterly": {
      const q = Math.floor(start.getMonth() / 3) + 1;
      return `Q${q} ${start.getFullYear()}`;
    }
    case "yearly":
      return String(start.getFullYear());
    case "all_time":
      return "All time";
  }
}

export function timeLeft(cycle_end: string): string | null {
  const end = new Date(cycle_end).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return "Ended";
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))}m left`;
  if (diff < day) return `${Math.round(diff / hour)}h left`;
  return `${Math.ceil(diff / day)}d left`;
}

function progress(start: string, end: string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  const now = Date.now();
  if (b <= a) return 0;
  return Math.min(1, Math.max(0, (now - a) / (b - a)));
}

export default function CyclePill({
  info,
  compact = false,
}: {
  info: CycleInfo;
  compact?: boolean;
}) {
  const { cycle_type, cycle_start, cycle_end } = info;
  const label = cycleLabel(cycle_type, cycle_start, cycle_end);
  const left = cycle_type === "all_time" ? null : timeLeft(cycle_end);
  const pct = cycle_type === "all_time" ? 0 : progress(cycle_start, cycle_end);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-white/40 backdrop-blur-sm px-3 py-1 ${
        compact ? "text-xs" : "text-sm"
      } text-gray-800`}
    >
      <Calendar
        size={compact ? 12 : 14}
        strokeWidth={2.5}
        className="text-[#3e7f6b] shrink-0"
        aria-hidden="true"
      />
      <span className="font-medium">{label}</span>
      {left && (
        <>
          <span className="text-gray-500">·</span>
          <span className="text-gray-700">{left}</span>
        </>
      )}
      {cycle_type !== "all_time" && (
        <span
          className={`${compact ? "w-12" : "w-16"} h-1.5 rounded-full bg-white/60 overflow-hidden`}
        >
          <span
            className="block h-full bg-[#3e7f6b]"
            style={{ width: `${pct * 100}%` }}
          />
        </span>
      )}
    </div>
  );
}
