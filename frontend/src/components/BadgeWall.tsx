"use client";

import {
  Award,
  Bike,
  Crown,
  type LucideIcon,
  Medal,
  Mountain,
  Sprout,
  Star,
  Trophy,
} from "lucide-react";
import type { BadgeSummary } from "@/hooks/useGroups";

const ICON_MAP: Record<string, LucideIcon> = {
  Crown,
  Trophy,
  Medal,
  Bike,
  Mountain,
  Sprout,
  Award,
  Star,
};

function tooltip(b: BadgeSummary): string {
  const parts: string[] = [b.description];
  const ctx = b.context;
  if (ctx) {
    if (typeof ctx.rank === "number") parts.push(`Rank #${ctx.rank}`);
    if (typeof ctx.points === "number") parts.push(`${ctx.points} pts`);
    if (typeof ctx.cycle_start === "string") {
      const d = new Date(ctx.cycle_start);
      if (!Number.isNaN(d.getTime())) {
        parts.push(d.toLocaleDateString());
      }
    }
  }
  parts.push(`Earned ${new Date(b.awarded_at).toLocaleDateString()}`);
  return parts.join(" · ");
}

export default function BadgeWall({ badges }: { badges: BadgeSummary[] }) {
  if (!badges || badges.length === 0) {
    return <p className="text-sm text-slate-400">No badges earned yet.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {badges.map((b) => {
        const Icon = ICON_MAP[b.icon] ?? Star;
        return (
          <li
            key={`${b.slug}-${b.awarded_at}`}
            title={tooltip(b)}
            className="inline-flex items-center gap-2 rounded-full bg-white/5 ring-1 ring-white/10 px-3 py-1.5 shadow-sm"
          >
            <Icon
              size={16}
              strokeWidth={2.5}
              className="text-orange-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.5)]"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-slate-100">
              {b.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
