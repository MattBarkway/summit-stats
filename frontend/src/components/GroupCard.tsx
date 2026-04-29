"use client";

import Link from "next/link";
import type { GroupSummary } from "@/hooks/useGroups";
import CyclePill from "./CyclePill";
import GroupIcon from "./GroupIcon";

export default function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="block rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-xl px-5 py-4 hover:bg-gray-100/60 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <GroupIcon group={group} size={40} />
          <h3 className="font-semibold text-lg text-gray-900 truncate">
            {group.name}
          </h3>
        </div>
        <span className="rounded-full bg-[#3e7f6b]/15 px-2.5 py-0.5 text-sm font-medium text-[#3e7f6b] whitespace-nowrap shrink-0">
          {group.my_points} pts
        </span>
      </div>
      {group.description && (
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
          {group.description}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-600">
          {group.member_count} member{group.member_count === 1 ? "" : "s"}
        </p>
        <CyclePill info={group} compact />
      </div>
    </Link>
  );
}
