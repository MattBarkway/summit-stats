"use client";

import { useQuery } from "@tanstack/react-query";

export type Activity = {
    start_date_local: string | number | Date;
    id: number;
    name: string;
    type: string;
    distance: number;
    moving_time: number;
    total_elevation_gain: number;
};

async function fetchActivities(): Promise<Activity[]> {
    const res = await fetch("http://localhost:8000/stats/activities", {
        credentials: "include",
    });
    if (!res.ok) {
        const text = await res.text();
        console.error("Fetch failed:", res.status, text);
        throw new Error(`Failed to fetch activities: ${res.status}`);
    }
    return res.json();
}

export function useActivities() {
    return useQuery<Activity[], Error>({
        queryKey: ["activities"],
        queryFn: fetchActivities,
    });
}
