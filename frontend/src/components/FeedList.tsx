"use client";

import {
  Activity as ActivityIcon,
  Award,
  Bike,
  ExternalLink,
  Footprints,
  type LucideIcon,
  Map as MapIcon,
  Medal,
  Mountain,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import type { FeedEntry } from "@/hooks/useGroups";
import { FeedEntrySkeleton } from "./Skeleton";

type IconStyle = {
  Icon: LucideIcon;
  bg: string;
  fg: string;
};

function eventIcon(e: FeedEntry): IconStyle {
  switch (e.trigger_type) {
    case "kom":
      return {
        Icon: Trophy,
        bg: "bg-amber-500/20",
        fg: "text-amber-300",
      };
    case "segment_challenge":
      return {
        Icon: Trophy,
        bg: "bg-fuchsia-500/20",
        fg: "text-fuchsia-300",
      };
    case "top_ten":
      return {
        Icon: Medal,
        bg: "bg-slate-300/20",
        fg: "text-slate-200",
      };
    case "achievement":
      return {
        Icon: Award,
        bg: "bg-violet-500/20",
        fg: "text-violet-300",
      };
    case "elevation_m":
      return {
        Icon: Mountain,
        bg: "bg-stone-300/15",
        fg: "text-stone-200",
      };
    case "distance_km":
      if (e.rule_sport_type === "Ride")
        return {
          Icon: Bike,
          bg: "bg-cyan-500/20",
          fg: "text-cyan-300",
        };
      if (e.rule_sport_type === "Run")
        return {
          Icon: Footprints,
          bg: "bg-emerald-500/20",
          fg: "text-emerald-300",
        };
      return {
        Icon: ActivityIcon,
        bg: "bg-white/10",
        fg: "text-slate-300",
      };
    default:
      return {
        Icon: ActivityIcon,
        bg: "bg-white/10",
        fg: "text-slate-300",
      };
  }
}

type Tier = {
  card: string;
  points: string;
  badgeRing: string;
  sparkles?: number;
};

function tierFor(points: number): Tier {
  if (points >= 250) {
    return {
      card: "shimmer-bg bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-amber-500/20 ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/20",
      points: "text-amber-300 text-base",
      badgeRing: "ring-amber-400",
      sparkles: 2,
    };
  }
  if (points >= 150) {
    return {
      card: "bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 ring-1 ring-violet-400/50 shadow-md",
      points: "text-violet-300 text-base",
      badgeRing: "ring-violet-400",
      sparkles: 1,
    };
  }
  if (points >= 75) {
    return {
      card: "bg-cyan-500/10 ring-1 ring-cyan-400/40",
      points: "text-cyan-300",
      badgeRing: "ring-cyan-400",
    };
  }
  if (points >= 40) {
    return {
      card: "bg-emerald-500/10 ring-1 ring-emerald-400/30",
      points: "text-emerald-300",
      badgeRing: "ring-emerald-400/60",
    };
  }
  return {
    card: "bg-white/5 ring-1 ring-white/10",
    points: "text-orange-300",
    badgeRing: "ring-white/20",
  };
}

function ruleLabel(e: FeedEntry): string {
  const sport = e.rule_sport_type ? `${e.rule_sport_type} ` : "";
  switch (e.trigger_type) {
    case "distance_km":
      return `${sport}≥ ${e.threshold} km`;
    case "elevation_m":
      return `${sport}≥ ${e.threshold} m elevation`;
    case "kom":
      return "KOM";
    case "segment_challenge":
      return "Segment challenge";
    case "top_ten":
      return "Top 10 segment";
    case "achievement":
      return e.threshold > 1
        ? `${sport}≥ ${e.threshold} achievements`
        : `${sport}achievement earned`;
    default:
      return e.trigger_type;
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function activitySummary(e: FeedEntry): string | null {
  const parts: string[] = [];
  if (e.activity_distance_m != null && e.activity_distance_m > 0) {
    parts.push(`${(e.activity_distance_m / 1000).toFixed(1)} km`);
  }
  if (e.activity_moving_time_s != null && e.activity_moving_time_s > 0) {
    parts.push(formatDuration(e.activity_moving_time_s));
  }
  if (e.activity_elevation_m != null && e.activity_elevation_m > 0) {
    parts.push(`${Math.round(e.activity_elevation_m)} m ↑`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

type Group = {
  key: string;
  entries: FeedEntry[];
  totalPoints: number;
  eventTime: string;
};

function eventTimeFor(e: FeedEntry): string {
  return e.activity_start_date ?? e.earned_at;
}

function groupByActivity(entries: FeedEntry[]): Group[] {
  const groups = new Map<string, FeedEntry[]>();
  for (const e of entries) {
    const key = e.activity_id != null ? `act:${e.activity_id}` : `solo:${e.id}`;
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  const out: Group[] = [];
  for (const [_key, list] of groups) {
    const sorted = [...list].sort((a, b) => b.points - a.points);
    out.push({
      key: _key,
      entries: sorted,
      totalPoints: sorted.reduce((s, e) => s + e.points, 0),
      eventTime: sorted.map(eventTimeFor).reduce((a, b) => (a > b ? a : b)),
    });
  }
  out.sort((a, b) => (a.eventTime > b.eventTime ? -1 : 1));
  return out;
}

export default function FeedList({
  data,
  loading,
}: {
  data: FeedEntry[] | undefined;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
          <FeedEntrySkeleton key={`feed-skel-${i}`} />
        ))}
      </ul>
    );
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-slate-400">
        No activity yet. Members will appear here once they earn points.
      </p>
    );
  }

  const groups = groupByActivity(data);

  return (
    <ul className="space-y-2">
      {groups.map((g) => {
        const head = g.entries[0];
        const name =
          [head.firstname, head.lastname].filter(Boolean).join(" ") ||
          `Athlete ${head.athlete_id}`;
        const tier = tierFor(g.totalPoints);
        const isMulti = g.entries.length > 1;
        const summary = activitySummary(head);
        const activityLink =
          head.activity_id != null ? (
            <span className="inline-flex items-center gap-2 flex-wrap">
              <a
                href={`https://www.strava.com/activities/${head.activity_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-slate-100 hover:text-orange-300"
              >
                {head.activity_name ?? `Activity ${head.activity_id}`}
                <ExternalLink
                  size={12}
                  strokeWidth={2.5}
                  className="opacity-70"
                  aria-hidden="true"
                />
              </a>
              <Link
                href={`/activities/${head.activity_id}`}
                className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-cyan-300"
                title="View map"
              >
                <MapIcon size={12} strokeWidth={2.5} aria-hidden="true" />
                Map
              </Link>
            </span>
          ) : null;

        return (
          <li
            key={g.key}
            className={`flex items-start gap-3 rounded-2xl px-4 py-3 transition-all ${tier.card}`}
          >
            <div className="relative shrink-0">
              {head.profile_url ? (
                // biome-ignore lint/performance/noImgElement: Strava-hosted avatar URL
                <img
                  src={head.profile_url}
                  alt={name}
                  className={`h-10 w-10 rounded-full object-cover ring-2 ${tier.badgeRing}`}
                />
              ) : (
                <div
                  className={`h-10 w-10 rounded-full bg-white/10 ring-2 ${tier.badgeRing}`}
                />
              )}
              {!isMulti && (
                <span
                  className={`absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-slate-900 shadow-sm ${eventIcon(head).bg} ${eventIcon(head).fg}`}
                  aria-hidden="true"
                >
                  {(() => {
                    const { Icon } = eventIcon(head);
                    return <Icon size={12} strokeWidth={2.5} />;
                  })()}
                </span>
              )}
              {isMulti && (
                <span
                  className="absolute -bottom-1 -right-1 inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-orange-400 text-slate-950 text-[10px] font-bold ring-2 ring-slate-900 shadow-sm"
                  title={`${g.entries.length} events`}
                >
                  ×{g.entries.length}
                </span>
              )}
            </div>

            <div className="flex-1 text-sm min-w-0">
              <p className="text-slate-200">
                <span className="font-semibold">{name}</span>
                <span className="text-slate-400"> earned </span>
                <span
                  className={`font-bold tabular-nums inline-flex items-center gap-1 ${tier.points}`}
                >
                  {tier.sparkles ? (
                    <Sparkles size={14} strokeWidth={2.5} />
                  ) : null}
                  +{g.totalPoints} pts
                  {tier.sparkles && tier.sparkles > 1 ? (
                    <Sparkles size={14} strokeWidth={2.5} />
                  ) : null}
                </span>
                {!isMulti && (
                  <span className="text-slate-400"> for {ruleLabel(head)}</span>
                )}
              </p>

              {activityLink && (
                <p className="mt-0.5 text-slate-400">on {activityLink}</p>
              )}
              {summary && (
                <p className="mt-0.5 text-xs text-slate-300 font-medium tabular-nums">
                  {summary}
                </p>
              )}

              {isMulti && (
                <ul className="mt-2 space-y-1 border-t border-white/10 pt-2">
                  {g.entries.map((e) => {
                    const { Icon, bg, fg } = eventIcon(e);
                    return (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${bg} ${fg}`}
                          aria-hidden="true"
                        >
                          <Icon size={11} strokeWidth={2.5} />
                        </span>
                        <span className="text-slate-300">{ruleLabel(e)}</span>
                        <span className="ml-auto font-bold tabular-nums text-orange-300">
                          +{e.points}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-1 text-xs text-slate-500">
                {timeAgo(g.eventTime)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
