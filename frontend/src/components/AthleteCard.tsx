"use client";
import React from "react";
import { useAthlete } from "@/hooks/useAthlete";

export default function AthleteCard() {
  const { data, isLoading, error } = useAthlete();

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error fetching athlete</p>;
  if (!data) return <p>No athlete data</p>;

  const { firstname, lastname, profile_medium, stats } = data;

  const totalActivities = stats
    ? stats.all_ride_totals.count +
      stats.all_run_totals.count +
      stats.all_swim_totals.count
    : 0;

  const totalDistanceKm = stats
    ? ((stats.all_ride_totals.distance ?? 0) +
        (stats.all_run_totals.distance ?? 0) +
        (stats.all_swim_totals.distance ?? 0)) /
      1000
    : 0;

  return (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-6">
      <img
        src={profile_medium}
        alt={`${firstname} ${lastname}`}
        className="w-24 h-24 rounded-full object-cover bg-gray-200 border-2 border-orange-500"
      />
      <div>
        <h2 className="text-2xl font-semibold text-emerald-600">
          {firstname} {lastname}
        </h2>
        <p className="mt-1">
          Total Activities: <strong>{totalActivities}</strong>
        </p>
        <p>
          Total Distance:{" "}
          <strong>
            {totalDistanceKm.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{" "}
            km
          </strong>
        </p>
      </div>
    </div>
  );
}
