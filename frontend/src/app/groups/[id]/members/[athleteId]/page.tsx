"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import BadgeWall from "@/components/BadgeWall";
import CountUp from "@/components/CountUp";
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
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-5 fade-up">
        <HeaderSkeleton />
      </main>
    );
  }
  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 fade-up">
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
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-5 fade-up">
      <Link
        href={`/groups/${id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100"
      >
        <ArrowLeft size={14} />
        {group?.name ?? "Back to group"}
      </Link>

      <header className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl shadow-black/20 p-6">
        <div className="flex items-center gap-4">
          {data.profile_url ? (
            // biome-ignore lint/performance/noImgElement: Strava-hosted avatar URL
            <img
              src={data.profile_url}
              alt={name}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white/20"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-white/10" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100 truncate">
              {name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Rank{" "}
              <span className="font-bold tabular-nums text-slate-100">
                #{data.rank}
              </span>{" "}
              ·{" "}
              <span className="tabular-nums">
                {data.points.toLocaleString()}
              </span>{" "}
              pts · <span className="tabular-nums">{data.activity_count}</span>{" "}
              activit
              {data.activity_count === 1 ? "y" : "ies"}
            </p>
            <div className="mt-2">
              <CyclePill info={data} compact />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Points" valueNode={<CountUp value={data.points} />} />
          <Stat
            label="Rank"
            valueNode={
              <>
                #<CountUp value={data.rank} />
              </>
            }
          />
          <Stat
            label="Distance"
            valueNode={
              <>
                <CountUp
                  value={data.total_distance_m / 1000}
                  format={(n) => n.toFixed(1)}
                />{" "}
                <span className="text-slate-400 text-sm">km</span>
              </>
            }
          />
          <Stat
            label="Elevation"
            valueNode={
              <>
                <CountUp value={Math.round(data.total_elevation_m)} />{" "}
                <span className="text-slate-400 text-sm">m</span>
              </>
            }
          />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-bold tracking-tight text-slate-100">
          Badges
        </h2>
        <BadgeWall badges={data.badges} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold tracking-tight text-slate-100">
          Events earned
        </h2>
        <FeedList data={data.events} />
      </section>
    </main>
  );
}

function Stat({
  label,
  valueNode,
}: {
  label: string;
  valueNode: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2.5 text-center">
      <p className="text-xs uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-extrabold tabular-nums tracking-tight text-slate-100 font-mono">
        {valueNode}
      </p>
    </div>
  );
}
