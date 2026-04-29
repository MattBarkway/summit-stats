"use client";

import { ExternalLink, Plus, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import {
  type Challenge,
  type ChallengeResultEntry,
  useChallenges,
  useDeleteChallenge,
} from "@/hooks/useGroups";
import CreateChallengeModal from "./CreateChallengeModal";
import { timeLeft } from "./CyclePill";
import ErrorState from "./ErrorState";

function formatTime(s: number | null): string {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function nameOf(r: ChallengeResultEntry): string {
  return (
    [r.firstname, r.lastname].filter(Boolean).join(" ") ||
    `Athlete ${r.athlete_id}`
  );
}

function ChallengeCard({
  c,
  isOwner,
  onDelete,
}: {
  c: Challenge;
  isOwner: boolean;
  onDelete: () => void;
}) {
  const ended = !!c.resolved_at || new Date(c.ends_at) <= new Date();
  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-md p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold tracking-tight text-slate-100 truncate inline-flex items-center gap-2">
            <Trophy
              size={16}
              strokeWidth={2.5}
              className="text-amber-400 shrink-0"
              aria-hidden="true"
            />
            {c.segment_name}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {ended ? "Ended" : timeLeft(c.ends_at)} ·{" "}
            <a
              href={`https://www.strava.com/segments/${c.segment_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-orange-300"
            >
              Strava
              <ExternalLink size={10} strokeWidth={2.5} aria-hidden="true" />
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-amber-500/20 ring-1 ring-amber-400/40 px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-300">
            🥇 {c.points_winner}
          </span>
          {isOwner && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md p-1.5 text-red-400 hover:bg-red-500/10"
              title="Delete challenge"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {c.results.length > 0 ? (
        <ol className="space-y-1.5">
          {c.results.map((r) => (
            <li
              key={r.athlete_id}
              className="flex items-center gap-3 rounded-lg bg-white/5 ring-1 ring-white/5 px-3 py-1.5"
            >
              <span className="w-6 text-sm font-bold tabular-nums text-slate-300">
                {r.rank ?? "–"}
              </span>
              {r.profile_url ? (
                // biome-ignore lint/performance/noImgElement: Strava-hosted avatar URL
                <img
                  src={r.profile_url}
                  alt={nameOf(r)}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-white/10" />
              )}
              <span className="flex-1 text-sm text-slate-200 truncate">
                {nameOf(r)}
              </span>
              <span className="text-sm font-mono tabular-nums text-slate-300">
                {formatTime(r.best_time_s)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-slate-400">
          No efforts logged yet. Ride the segment to enter.
        </p>
      )}
    </div>
  );
}

export default function ChallengesTab({
  groupId,
  isOwner,
}: {
  groupId: string;
  isOwner: boolean;
}) {
  const { data, isLoading, error, refetch } = useChallenges(groupId);
  const remove = useDeleteChallenge(groupId);
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) {
    return <p className="text-slate-400">Loading challenges…</p>;
  }
  if (error) {
    return (
      <ErrorState
        title="Couldn't load challenges"
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400 tabular-nums">
          {data?.length ?? 0} challenge{data?.length === 1 ? "" : "s"}
        </p>
        {isOwner && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-orange-400 px-3 py-1.5 text-sm font-bold text-slate-950 hover:bg-orange-500 transition-colors"
          >
            <Plus size={14} />
            New challenge
          </button>
        )}
      </div>

      {data && data.length > 0 ? (
        <ul className="space-y-3">
          {data.map((c) => (
            <li key={c.id}>
              <ChallengeCard
                c={c}
                isOwner={isOwner}
                onDelete={async () => {
                  if (!confirm("Delete this challenge?")) return;
                  await remove.mutateAsync(c.id);
                }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-md p-5 text-center text-slate-400">
          No challenges yet.{" "}
          {isOwner ? "Pick a segment, set a deadline, race." : ""}
        </div>
      )}

      <CreateChallengeModal
        groupId={groupId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
