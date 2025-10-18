"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";

export type Activity = {
  start_date_local: string | number | Date;
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
};

async function fetchActivities(
  page: number,
  perPage: number,
): Promise<Activity[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/stats/activities?page=${page || 1}&per_page=${perPage || 10}`,
    {
      credentials: "include",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Fetch failed:", res.status, text);
    throw new Error(`Failed to fetch activities: ${res.status}`);
  }

  return res.json();
}

export function useActivities(page: number, perPage: number) {
  return useQuery<Activity[], Error>({
    queryKey: ["activities", page, perPage],
    queryFn: () => fetchActivities(page, perPage),
    keepPreviousData: true,
  } as UseQueryOptions<Activity[], Error>);
}
