"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import ErrorState from "@/components/ErrorState";
import {
  HeaderSkeleton,
  SkeletonLine,
  StatBoxSkeleton,
} from "@/components/Skeleton";
import { useActivity } from "@/hooks/useActivity";

const ActivityMap = dynamic(() => import("@/components/ActivityMap"), {
  ssr: false,
});

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useActivity(id);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6 fade-up">
        <HeaderSkeleton />
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
            <StatBoxSkeleton key={`stat-skel-${i}`} />
          ))}
        </section>
        <section className="rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl shadow-xl p-3">
          <SkeletonLine width="100%" height="24rem" />
        </section>
      </main>
    );
  }
  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 fade-up">
        <ErrorState
          title="Couldn't load this activity"
          message={(error as Error).message}
          onRetry={() => refetch()}
        />
      </main>
    );
  }
  if (!data) return null;

  const { activity, streams } = data;
  const points = streams.latlng?.data ?? [];

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6 fade-up">
      <header className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl shadow-black/20 p-6">
        <p className="text-xs uppercase tracking-widest text-orange-300">
          {activity.sport_type}
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
          {activity.name}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {new Date(activity.start_date).toLocaleString()}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Distance"
          value={`${(activity.distance / 1000).toFixed(2)} km`}
        />
        <Stat
          label="Moving Time"
          value={formatDuration(activity.moving_time)}
        />
        <Stat
          label="Elevation"
          value={`${Math.round(activity.total_elevation_gain)} m`}
        />
        <Stat label="Achievements" value={String(activity.achievement_count)} />
      </section>

      {points.length > 0 && (
        <section className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl shadow-black/20 p-2">
          <ActivityMap points={points} />
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-md p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tabular-nums tracking-tight text-slate-100 font-mono">
        {value}
      </p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
