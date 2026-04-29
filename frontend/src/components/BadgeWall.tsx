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
    return <p className="text-sm text-gray-600">No badges earned yet.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {badges.map((b) => {
        const Icon = ICON_MAP[b.icon] ?? Star;
        return (
          <li
            key={`${b.slug}-${b.awarded_at}`}
            title={tooltip(b)}
            className="inline-flex items-center gap-2 rounded-full bg-white/40 backdrop-blur-sm px-3 py-1.5 shadow-sm ring-1 ring-white/40"
          >
            <Icon
              size={16}
              strokeWidth={2.5}
              className="text-[#3e7f6b]"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-gray-800">{b.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
