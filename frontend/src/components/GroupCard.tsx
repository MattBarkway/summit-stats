"use client";

import Link from "next/link";
import type { GroupSummary } from "@/hooks/useGroups";
import CyclePill from "./CyclePill";
import GroupIcon from "./GroupIcon";

export default function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="group block rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-xl shadow-black/20 px-5 py-4 hover:bg-white/[0.08] hover:ring-white/20 hover:-translate-y-px transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <GroupIcon group={group} size={44} />
          <h3 className="font-bold text-lg tracking-tight text-slate-100 truncate">
            {group.name}
          </h3>
        </div>
        <span className="rounded-full bg-orange-400/15 ring-1 ring-orange-400/30 px-2.5 py-0.5 text-sm font-bold tabular-nums text-orange-300 whitespace-nowrap shrink-0">
          {group.my_points} pts
        </span>
      </div>
      {group.description && (
        <p className="mt-2 text-sm text-slate-400 line-clamp-2">
          {group.description}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {group.member_count} member{group.member_count === 1 ? "" : "s"}
        </p>
        <CyclePill info={group} compact />
      </div>
    </Link>
  );
}
