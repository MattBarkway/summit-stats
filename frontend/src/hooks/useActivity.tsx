import { useQuery } from "@tanstack/react-query";

const API = process.env.NEXT_PUBLIC_API_URL;

export type LatLng = [number, number];

export type StreamSet = {
  time?: { data?: number[] };
  distance?: { data?: number[] };
  latlng?: { data?: LatLng[] };
  altitude?: { data?: number[] };
};

export type Activity = {
  id: number;
  name: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date: string;
  achievement_count: number;
  pr_count: number;
};

export type ActivityDetail = {
  activity: Activity;
  streams: StreamSet;
};

export function useActivity(id: string | undefined) {
  return useQuery({
    queryKey: ["activity", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`${API}/activities/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      return res.json() as Promise<ActivityDetail>;
    },
  });
}
