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
    <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate inline-flex items-center gap-2">
            <Trophy
              size={16}
              strokeWidth={2.5}
              className="text-[#3e7f6b] shrink-0"
              aria-hidden="true"
            />
            {c.segment_name}
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            {ended ? "Ended" : timeLeft(c.ends_at)} ·{" "}
            <a
              href={`https://www.strava.com/segments/${c.segment_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-[#3e7f6b]"
            >
              Strava
              <ExternalLink size={10} strokeWidth={2.5} aria-hidden="true" />
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-amber-100/70 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            🥇 {c.points_winner}
          </span>
          {isOwner && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
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
              className="flex items-center gap-3 rounded-lg bg-white/30 px-3 py-1.5"
            >
              <span className="w-6 text-sm font-semibold text-gray-700">
                {r.rank ?? "–"}
              </span>
              {r.profile_url ? (
                // biome-ignore lint/performance/noImgElement: Strava-hosted avatar URL
                <img
                  src={r.profile_url}
                  alt={nameOf(r)}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-white/40"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-white/40" />
              )}
              <span className="flex-1 text-sm text-gray-800 truncate">
                {nameOf(r)}
              </span>
              <span className="text-sm font-mono text-gray-700">
                {formatTime(r.best_time_s)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-gray-600">
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
    return <p className="text-gray-700">Loading challenges…</p>;
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
        <p className="text-sm text-gray-700">
          {data?.length ?? 0} challenge{data?.length === 1 ? "" : "s"}
        </p>
        {isOwner && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#3e7f6b]/80 px-3 py-1.5 text-sm text-white hover:bg-[#358d73] transition-colors"
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
        <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md p-5 text-center text-gray-700">
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
