"use client";

import {useActivities} from "@/app/hooks/useActivites";

export default function ActivitiesTable() {
    const { data, isLoading, error } = useActivities();


    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error fetching activities</p>;

    return (
        <table className="w-full text-left table-auto border-collapse">
            <thead>
            <tr className="border-b">
                <th className="py-2 px-4">Name</th>
                <th className="py-2 px-4">Type</th>
                <th className="py-2 px-4">Distance (km)</th>
                <th className="py-2 px-4">Moving Time</th>
                <th className="py-2 px-4">Elevation Gain</th>
            </tr>
            </thead>
            <tbody>
            {data.map((act) => {
                const distanceKm = (act.distance / 1000).toFixed(1);
                const hours = Math.floor(act.moving_time / 3600);
                const minutes = Math.floor((act.moving_time % 3600) / 60);
                const seconds = act.moving_time % 60;
                const movingTimeFormatted = [
                    hours > 0 ? String(hours) : null,
                    hours > 0 ? String(minutes).padStart(2, "0"): String(minutes),
                    minutes > 0 || hours > 0 ? String(seconds).padStart(2, "0") : String(seconds),
                ]
                    .filter(Boolean)
                    .join(":");

                return (
                    <tr
                        key={act.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                            window.open(`https://www.strava.com/activities/${act.id}`, "_blank")
                        }
                    >
                        <td className="py-2 px-4">{act.name}</td>
                        <td className="py-2 px-4">{act.type}</td>
                        <td className="py-2 px-4">{distanceKm}</td>
                        <td className="py-2 px-4">{movingTimeFormatted}</td>
                        <td className="py-2 px-4">{Math.round(act.total_elevation_gain)}</td>
                    </tr>
                );
            })}
            </tbody>
        </table>
    );
}
