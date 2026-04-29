"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import ChallengesTab from "@/components/ChallengesTab";
import CyclePill, { cycleLabel, timeLeft } from "@/components/CyclePill";
import CycleSelector from "@/components/CycleSelector";
import ErrorState from "@/components/ErrorState";
import FeedList from "@/components/FeedList";
import GroupEditForm from "@/components/GroupEditForm";
import GroupIcon from "@/components/GroupIcon";
import InviteLinkDisplay from "@/components/InviteLinkDisplay";
import LeaderboardTable from "@/components/LeaderboardTable";
import RulesList from "@/components/RulesList";
import { HeaderSkeleton } from "@/components/Skeleton";
import Tabs from "@/components/Tabs";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeleteGroup,
  useGroup,
  useGroupFeed,
  useLeaderboard,
  useLeaveGroup,
} from "@/hooks/useGroups";

const TABS = ["leaderboard", "feed", "challenges", "rules", "info"] as const;
type Tab = (typeof TABS)[number];

const isTab = (v: string): v is Tab => (TABS as readonly string[]).includes(v);

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: user } = useAuth();
  const {
    data: group,
    isLoading: groupLoading,
    error,
    refetch: refetchGroup,
  } = useGroup(id);
  const [cycleOverride, setCycleOverride] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const lbOverride = cycleOverride
    ? { cycle_start: cycleOverride.start, cycle_end: cycleOverride.end }
    : undefined;
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(
    id,
    lbOverride,
  );
  const { data: feed, isLoading: feedLoading } = useGroupFeed(id);
  const leave = useLeaveGroup();
  const remove = useDeleteGroup();

  const [tab, setTab] = useState<Tab>("leaderboard");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.slice(1);
      if (isTab(h)) setTab(h);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const select = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", `#${t}`);
  };

  if (groupLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-5">
        <HeaderSkeleton />
      </main>
    );
  }
  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-5">
        <ErrorState
          title="Couldn't load this group"
          message={(error as Error).message}
          onRetry={() => refetchGroup()}
        />
      </main>
    );
  }
  if (!group) return null;

  const isOwner = user?.id === group.owner_id;

  const handleLeave = async () => {
    if (!confirm("Leave this group?")) return;
    await leave.mutateAsync(group.id);
    router.push("/groups");
  };

  const handleDelete = async () => {
    if (!confirm("Delete this group? This cannot be undone.")) return;
    await remove.mutateAsync(group.id);
    router.push("/groups");
  };

  const entries = leaderboard?.entries ?? [];
  const totalActivities = entries.reduce((sum, e) => sum + e.activity_count, 0);

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-5">
      <header className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <GroupIcon group={group} size={56} />
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold text-gray-900 truncate">
                {group.name}
              </h1>
              {group.description && (
                <p className="mt-1 text-gray-700 line-clamp-1">
                  {group.description}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                {group.members.length} member
                {group.members.length === 1 ? "" : "s"} · {totalActivities}{" "}
                activit
                {totalActivities === 1 ? "y" : "ies"}
              </p>
              <div className="mt-3">
                <CyclePill info={group} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="rounded-lg border border-gray-300 bg-white/40 px-3 py-1.5 text-sm text-gray-700 hover:bg-white/70"
              >
                Edit
              </button>
            )}
            {isOwner ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={remove.isPending}
                className="rounded-lg border border-red-300 bg-white/40 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLeave}
                disabled={leave.isPending}
                className="rounded-lg border border-gray-300 bg-white/40 px-3 py-1.5 text-sm text-gray-700 hover:bg-white/70 disabled:opacity-50"
              >
                Leave
              </button>
            )}
          </div>
        </div>
      </header>

      <GroupEditForm
        group={group}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <div>
        <Tabs<Tab>
          tabs={[
            { id: "leaderboard", label: "Leaderboard" },
            { id: "feed", label: "Feed", count: feed?.length },
            { id: "challenges", label: "Challenges" },
            { id: "rules", label: "Rules" },
            { id: "info", label: "Info" },
          ]}
          value={tab}
          onChange={select}
        />
      </div>

      {tab === "leaderboard" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {leaderboard && leaderboard.cycle_type !== "all_time" && (
              <p className="text-sm text-gray-700">
                {cycleLabel(
                  leaderboard.cycle_type,
                  leaderboard.cycle_start,
                  leaderboard.cycle_end,
                )}{" "}
                standings
                {!cycleOverride && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-gray-600">
                      {timeLeft(leaderboard.cycle_end)}
                    </span>
                  </>
                )}
              </p>
            )}
            <CycleSelector
              cycle={group.cycle_type}
              selected={cycleOverride}
              onChange={(w) =>
                setCycleOverride(w ? { start: w.start, end: w.end } : null)
              }
            />
          </div>
          {cycleOverride && leaderboard && leaderboard.entries.length > 0 && (
            <Podium entries={leaderboard.entries.slice(0, 3)} />
          )}
          <LeaderboardTable
            data={leaderboard?.entries ?? null}
            loading={lbLoading}
            groupId={id}
          />
        </section>
      )}

      {tab === "feed" && (
        <section>
          <FeedList data={feed} loading={feedLoading} />
        </section>
      )}

      {tab === "challenges" && (
        <section>
          <ChallengesTab groupId={id} isOwner={isOwner} />
        </section>
      )}

      {tab === "rules" && (
        <section>
          <RulesList groupId={id} isOwner={isOwner} />
        </section>
      )}

      {tab === "info" && (
        <section className="space-y-5">
          {group.description && (
            <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                About
              </h3>
              <p className="text-gray-800 whitespace-pre-wrap">
                {group.description}
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md p-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Invite a friend
            </h3>
            <InviteLinkDisplay
              code={group.invite_code}
              groupName={group.name}
            />
          </div>

          <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Members ({group.members.length})
            </h3>
            <ul className="space-y-2">
              {group.members.map((m) => {
                const name =
                  [m.firstname, m.lastname].filter(Boolean).join(" ") ||
                  `Athlete ${m.athlete_id}`;
                return (
                  <li
                    key={m.athlete_id}
                    className="flex items-center gap-3 rounded-xl bg-white/30 px-3 py-2"
                  >
                    {m.profile_url ? (
                      // biome-ignore lint/performance/noImgElement: Strava-hosted avatar URL, not a static asset
                      <img
                        src={m.profile_url}
                        alt={name}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-white/40"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-white/40" />
                    )}
                    <span>{name}</span>
                    {m.athlete_id === group.owner_id && (
                      <span className="ml-auto rounded-full bg-[#3e7f6b]/20 px-2 py-0.5 text-xs font-medium text-[#3e7f6b]">
                        Owner
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}

function Podium({
  entries,
}: {
  entries: {
    athlete_id: number;
    firstname: string | null;
    lastname: string | null;
    profile_url: string | null;
    points: number;
  }[];
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {entries.map((e, i) => {
        const name =
          [e.firstname, e.lastname].filter(Boolean).join(" ") ||
          `Athlete ${e.athlete_id}`;
        return (
          <div
            key={e.athlete_id}
            className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md p-4 flex items-center gap-3"
          >
            <span className="text-2xl">{medals[i]}</span>
            {e.profile_url ? (
              // biome-ignore lint/performance/noImgElement: Strava-hosted avatar URL
              <img
                src={e.profile_url}
                alt={name}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-white/40"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/40" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate">{name}</p>
              <p className="text-sm text-[#3e7f6b] font-semibold">
                {e.points.toLocaleString()} pts
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
