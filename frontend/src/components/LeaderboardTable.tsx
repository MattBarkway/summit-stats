"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import type { LeaderboardEntry } from "@/hooks/useGroups";
import DataTable from "./Table";

const columns: ColumnDef<LeaderboardEntry>[] = [
  {
    accessorKey: "rank",
    header: "#",
    cell: (info) => {
      const rank = info.getValue() as number;
      const medal =
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
      return (
        <span className="font-semibold text-gray-700 inline-flex items-center gap-1">
          {medal ?? rank}
        </span>
      );
    },
  },
  {
    id: "athlete",
    header: "Athlete",
    cell: (info) => {
      const r = info.row.original;
      const name =
        [r.firstname, r.lastname].filter(Boolean).join(" ") ||
        `Athlete ${r.athlete_id}`;
      return (
        <div className="flex items-center gap-3">
          {r.profile_url ? (
            // biome-ignore lint/performance/noImgElement: Strava-hosted avatar URL, not a static asset
            <img
              src={r.profile_url}
              alt={name}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-white/40"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-white/40" />
          )}
          <span>{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "points",
    header: "Points",
    cell: (info) => (
      <span className="font-semibold text-[#3e7f6b]">
        {(info.getValue() as number).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "activity_count",
    header: "Activities",
  },
];

export default function LeaderboardTable({
  data,
  loading,
  groupId,
}: {
  data: LeaderboardEntry[] | null;
  loading?: boolean;
  groupId?: string;
}) {
  const router = useRouter();
  const onRowClick = groupId
    ? (row: LeaderboardEntry) =>
        router.push(`/groups/${groupId}/members/${row.athlete_id}`)
    : undefined;

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      onRowClick={onRowClick}
    />
  );
}
