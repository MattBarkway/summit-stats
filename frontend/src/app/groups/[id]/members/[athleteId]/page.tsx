"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import BadgeWall from "@/components/BadgeWall";
import CyclePill from "@/components/CyclePill";
import ErrorState from "@/components/ErrorState";
import FeedList from "@/components/FeedList";
import { HeaderSkeleton } from "@/components/Skeleton";
import { useGroup, useGroupMember } from "@/hooks/useGroups";

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string; athleteId: string }>;
}) {
  const { id, athleteId } = use(params);
  const athleteIdNum = Number(athleteId);
  const { data: group } = useGroup(id);
  const { data, isLoading, error, refetch } = useGroupMember(id, athleteIdNum);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-5">
        <HeaderSkeleton />
      </main>
    );
  }
  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <ErrorState
          title="Couldn't load this member"
          message={(error as Error).message}
          onRetry={() => refetch()}
        />
      </main>
    );
  }
  if (!data) return null;

  const name =
    [data.firstname, data.lastname].filter(Boolean).join(" ") ||
    `Athlete ${data.athlete_id}`;

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-5">
      <Link
        href={`/groups/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        {group?.name ?? "Back to group"}
      </Link>

      <header className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-xl p-6">
        <div className="flex items-center gap-4">
          {data.profile_url ? (
            // biome-ignore lint/performance/noImgElement: Strava-hosted avatar URL
            <img
              src={data.profile_url}
              alt={name}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white/50"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-white/40" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 truncate">
              {name}
            </h1>
            <p className="mt-1 text-sm text-gray-700">
              Rank{" "}
              <span className="font-semibold text-gray-900">#{data.rank}</span>{" "}
              · {data.points.toLocaleString()} pts · {data.activity_count}{" "}
              activit
              {data.activity_count === 1 ? "y" : "ies"}
            </p>
            <div className="mt-2">
              <CyclePill info={data} compact />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Points" value={data.points.toLocaleString()} />
          <Stat label="Rank" value={`#${data.rank}`} />
          <Stat
            label="Distance"
            value={`${(data.total_distance_m / 1000).toFixed(1)} km`}
          />
          <Stat
            label="Elevation"
            value={`${Math.round(data.total_elevation_m)} m`}
          />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-gray-900">Badges</h2>
        <BadgeWall badges={data.badges} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-gray-900">
          Events earned
        </h2>
        <FeedList data={data.events} />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/40 px-3 py-2 text-center">
      <p className="text-xs uppercase tracking-wide text-gray-600">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}
