"use client";

import { useQuery } from "@tanstack/react-query";

export type Totals = {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
  achievement_count?: number;
};

export type AthleteStats = {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_ride_totals: Totals;
  all_ride_totals: Totals;
  recent_run_totals: Totals;
  all_run_totals: Totals;
  recent_swim_totals: Totals;
  all_swim_totals: Totals;
  ytd_ride_totals: Totals;
  ytd_run_totals: Totals;
  ytd_swim_totals: Totals;
};

export type Athlete = {
  id?: number;
  username?: string;
  resource_state: number;
  firstname: string;
  lastname: string;
  profile: string;
  profile_medium: string;
  city?: string;
  state?: string;
  country?: string;
  sex?: "M" | "F";
  follower_count?: number;
  friend_count?: number;
  created_at?: string;
  updated_at?: string;
  stats?: AthleteStats;
};

async function fetchAthlete(): Promise<Athlete> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/athlete`, {
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Fetch failed:", res.status, text);
    throw new Error(`Failed to fetch activities: ${res.status}`);
  }
  return res.json();
}

export function useAthlete() {
  return useQuery<Athlete, Error>({
    queryKey: ["athlete"],
    queryFn: fetchAthlete,
  });
}
