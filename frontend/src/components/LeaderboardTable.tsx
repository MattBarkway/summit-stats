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
      const tint =
        rank === 1
          ? "text-amber-300"
          : rank === 2
            ? "text-slate-200"
            : rank === 3
              ? "text-orange-300"
              : "text-slate-400";
      return (
        <span
          className={`font-bold tabular-nums inline-flex items-center gap-1 ${tint}`}
        >
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
      const ringTint =
        r.rank === 1
          ? "ring-amber-400/60"
          : r.rank === 2
            ? "ring-slate-300/50"
            : r.rank === 3
              ? "ring-orange-400/50"
              : "ring-white/10";
      return (
        <div className="flex items-center gap-3">
          {r.profile_url ? (
            // biome-ignore lint/performance/noImgElement: Strava-hosted avatar URL, not a static asset
            <img
              src={r.profile_url}
              alt={name}
              className={`h-8 w-8 rounded-full object-cover ring-2 ${ringTint}`}
            />
          ) : (
            <div
              className={`h-8 w-8 rounded-full bg-white/10 ring-2 ${ringTint}`}
            />
          )}
          <span className="font-medium text-slate-100">{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "points",
    header: "Points",
    cell: (info) => (
      <span className="font-bold tabular-nums text-orange-300">
        {(info.getValue() as number).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "activity_count",
    header: "Activities",
    cell: (info) => (
      <span className="tabular-nums text-slate-300">
        {info.getValue() as number}
      </span>
    ),
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
