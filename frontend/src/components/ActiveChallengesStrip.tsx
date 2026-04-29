"use client";

import { ChevronRight, Trophy } from "lucide-react";
import {
  type Challenge,
  type ChallengeResultEntry,
  useChallenges,
} from "@/hooks/useGroups";
import { timeLeft } from "./CyclePill";

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

function isActive(c: Challenge): boolean {
  return !c.resolved_at && new Date(c.ends_at) > new Date();
}

export default function ActiveChallengesStrip({
  groupId,
  onSeeAll,
}: {
  groupId: string;
  onSeeAll: () => void;
}) {
  const { data } = useChallenges(groupId);
  const active = (data ?? []).filter(isActive);
  if (active.length === 0) return null;

  return (
    <div className="rounded-2xl bg-fuchsia-500/10 ring-1 ring-fuchsia-400/30 shadow-md p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="inline-flex items-center gap-2">
          <Trophy
            size={16}
            strokeWidth={2.5}
            className="text-fuchsia-300"
            aria-hidden="true"
          />
          <h3 className="text-sm font-bold uppercase tracking-widest text-fuchsia-200">
            Active challenge{active.length > 1 ? "s" : ""}
          </h3>
        </div>
        <button
          type="button"
          onClick={onSeeAll}
          className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-fuchsia-200 hover:text-fuchsia-100"
        >
          See all
          <ChevronRight size={14} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      <ul className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
        {active.map((c) => {
          const leader = c.results[0];
          return (
            <li key={c.id} className="shrink-0 w-64">
              <button
                type="button"
                onClick={onSeeAll}
                className="cursor-pointer w-full text-left rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2.5 hover:bg-white/10 transition-colors"
              >
                <p className="text-sm font-bold text-slate-100 truncate">
                  {c.segment_name}
                </p>
                <p className="mt-0.5 text-xs text-fuchsia-300 tabular-nums">
                  {timeLeft(c.ends_at)} · +{c.points_winner} pts
                </p>
                <p className="mt-1 text-xs text-slate-400 truncate">
                  {leader ? (
                    <>
                      <span className="text-slate-200 font-medium">
                        {nameOf(leader)}
                      </span>{" "}
                      leads —{" "}
                      <span className="tabular-nums">
                        {formatTime(leader.best_time_s)}
                      </span>
                    </>
                  ) : (
                    <span className="italic">No times yet</span>
                  )}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
