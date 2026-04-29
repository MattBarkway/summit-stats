import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API = process.env.NEXT_PUBLIC_API_URL;

export type CycleType =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "all_time";

export type CycleInfo = {
  cycle_type: CycleType;
  cycle_start: string;
  cycle_end: string;
};

export type GroupSummary = CycleInfo & {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  member_count: number;
  my_points: number;
};

export type MemberSummary = {
  athlete_id: number;
  firstname: string | null;
  lastname: string | null;
  profile_url: string | null;
};

export type GroupDetail = CycleInfo & {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  invite_code: string;
  owner_id: number;
  members: MemberSummary[];
};

export type FeedEntry = {
  id: string;
  earned_at: string;
  points: number;
  athlete_id: number;
  firstname: string | null;
  lastname: string | null;
  profile_url: string | null;
  activity_id: number | null;
  activity_name: string | null;
  activity_sport_type: string | null;
  activity_distance_m: number | null;
  activity_moving_time_s: number | null;
  activity_elevation_m: number | null;
  activity_start_date: string | null;
  trigger_type:
    | "distance_km"
    | "elevation_m"
    | "kom"
    | "top_ten"
    | "achievement"
    | "segment_challenge";
  threshold: number;
  rule_sport_type: string | null;
};

export type BadgeSummary = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  awarded_at: string;
  // biome-ignore lint/suspicious/noExplicitAny: backend stores arbitrary JSON
  context: Record<string, any> | null;
};

export type MemberDetail = CycleInfo & {
  athlete_id: number;
  firstname: string | null;
  lastname: string | null;
  profile_url: string | null;
  rank: number;
  points: number;
  activity_count: number;
  total_distance_m: number;
  total_elevation_m: number;
  events: FeedEntry[];
  badges: BadgeSummary[];
};

export type GroupPreview = CycleInfo & {
  name: string;
  icon_url: string | null;
  member_count: number;
  owner_name: string;
};

export type RuleTrigger =
  | "distance_km"
  | "elevation_m"
  | "kom"
  | "top_ten"
  | "achievement";

export type Rule = {
  id: string;
  trigger_type: RuleTrigger;
  threshold: number;
  points: number;
  sport_type: string | null;
};

export function useGroupRules(groupId: string | undefined) {
  return useQuery({
    queryKey: ["rules", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const res = await fetch(`${API}/groups/${groupId}/rules`, {
        credentials: "include",
      });
      return jsonOrThrow<Rule[]>(res);
    },
  });
}

export function useCreateRule(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      trigger_type: RuleTrigger;
      threshold: number;
      points: number;
      sport_type?: string | null;
    }) => {
      const res = await fetch(`${API}/groups/${groupId}/rules`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return jsonOrThrow<Rule>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rules", groupId] });
      qc.invalidateQueries({ queryKey: ["leaderboard", groupId] });
      qc.invalidateQueries({ queryKey: ["feed", groupId] });
    },
  });
}

export function useUpdateRule(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ruleId: string;
      threshold?: number;
      points?: number;
    }) => {
      const { ruleId, ...body } = input;
      const res = await fetch(`${API}/groups/${groupId}/rules/${ruleId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return jsonOrThrow<Rule>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rules", groupId] });
      qc.invalidateQueries({ queryKey: ["leaderboard", groupId] });
      qc.invalidateQueries({ queryKey: ["feed", groupId] });
    },
  });
}

export function useDeleteRule(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await fetch(`${API}/groups/${groupId}/rules/${ruleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rules", groupId] });
      qc.invalidateQueries({ queryKey: ["leaderboard", groupId] });
      qc.invalidateQueries({ queryKey: ["feed", groupId] });
    },
  });
}

export type ChallengeResultEntry = {
  athlete_id: number;
  firstname: string | null;
  lastname: string | null;
  profile_url: string | null;
  best_time_s: number | null;
  rank: number | null;
};

export type Challenge = {
  id: string;
  segment_id: number;
  segment_name: string;
  starts_at: string;
  ends_at: string;
  points_winner: number;
  points_top3: number;
  points_finish: number;
  resolved_at: string | null;
  results: ChallengeResultEntry[];
};

export function useChallenges(groupId: string | undefined) {
  return useQuery({
    queryKey: ["challenges", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const res = await fetch(`${API}/groups/${groupId}/challenges`, {
        credentials: "include",
      });
      return jsonOrThrow<Challenge[]>(res);
    },
  });
}

export function useCreateChallenge(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      segment_id: number;
      ends_at: string;
      points_winner?: number;
      points_top3?: number;
      points_finish?: number;
    }) => {
      const res = await fetch(`${API}/groups/${groupId}/challenges`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return jsonOrThrow<Challenge>(res);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["challenges", groupId] }),
  });
}

export function useDeleteChallenge(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cid: string) => {
      const res = await fetch(`${API}/groups/${groupId}/challenges/${cid}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges", groupId] });
      qc.invalidateQueries({ queryKey: ["leaderboard", groupId] });
    },
  });
}

export function useGroupPreview(code: string | undefined) {
  return useQuery({
    queryKey: ["group-preview", code],
    enabled: !!code,
    queryFn: async () => {
      const res = await fetch(`${API}/groups/preview/${code}`);
      return jsonOrThrow<GroupPreview>(res);
    },
  });
}

export type LeaderboardEntry = {
  rank: number;
  athlete_id: number;
  firstname: string | null;
  lastname: string | null;
  profile_url: string | null;
  points: number;
  activity_count: number;
};

export type LeaderboardResponse = CycleInfo & {
  entries: LeaderboardEntry[];
};

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch(`${API}/groups`, { credentials: "include" });
      return jsonOrThrow<GroupSummary[]>(res);
    },
  });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: ["group", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`${API}/groups/${id}`, {
        credentials: "include",
      });
      return jsonOrThrow<GroupDetail>(res);
    },
  });
}

export function useGroupFeed(groupId: string | undefined) {
  return useQuery({
    queryKey: ["feed", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const res = await fetch(`${API}/groups/${groupId}/feed`, {
        credentials: "include",
      });
      return jsonOrThrow<FeedEntry[]>(res);
    },
  });
}

export function useGroupMember(
  groupId: string | undefined,
  athleteId: number | undefined,
) {
  return useQuery({
    queryKey: ["group-member", groupId, athleteId],
    enabled: !!groupId && athleteId != null,
    queryFn: async () => {
      const res = await fetch(`${API}/groups/${groupId}/members/${athleteId}`, {
        credentials: "include",
      });
      return jsonOrThrow<MemberDetail>(res);
    },
  });
}

export function useLeaderboard(
  groupId: string | undefined,
  override?: { cycle_start: string; cycle_end: string },
) {
  return useQuery({
    queryKey: [
      "leaderboard",
      groupId,
      override?.cycle_start ?? null,
      override?.cycle_end ?? null,
    ],
    enabled: !!groupId,
    queryFn: async () => {
      const url = new URL(
        `${API}/groups/${groupId}/leaderboard`,
        window.location.origin,
      );
      if (override) {
        url.searchParams.set("cycle_start", override.cycle_start);
        url.searchParams.set("cycle_end", override.cycle_end);
      }
      const res = await fetch(url.toString(), { credentials: "include" });
      return jsonOrThrow<LeaderboardResponse>(res);
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const res = await fetch(`${API}/groups`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return jsonOrThrow<GroupDetail>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invite_code: string) => {
      const res = await fetch(`${API}/groups/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code }),
      });
      return jsonOrThrow<GroupDetail>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/groups/${id}/leave`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useEditGroup(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name?: string;
      description?: string | null;
      icon_url?: string | null;
    }) => {
      const res = await fetch(`${API}/groups/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return jsonOrThrow<GroupDetail>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group", id] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/groups/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}
