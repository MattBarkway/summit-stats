"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import React from "react";
import { useActivities } from "@/hooks/useActivites";
import { v4 } from "uuid";

export default function CumulativeDistancePlot() {
  const { data, isLoading, error } = useActivities(1, 100);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error fetching activities</p>;
  if (!data || data.length === 0) return <p>No activity data</p>;

  const sorted = [...data].sort(
    (a, b) =>
      new Date(a.start_date_local).getTime() -
      new Date(b.start_date_local).getTime(),
  );

  let runningTotal = 0;
  const activityMap: Record<string, any> = {};

  const activityPoints = sorted.map((act) => {
    const dateStr = new Date(act.start_date_local).toISOString().split("T")[0];
    runningTotal += act.distance / 1000;
    const point = {
      date: dateStr,
      cumulativeDistance: +runningTotal.toFixed(1),
      activity: act,
    };
    activityMap[dateStr] = point;
    return point;
  });

  const chartData: {
    date: string;
    cumulativeDistance: number;
    activity?: any;
  }[] = [];
  const startDate = new Date(sorted[0].start_date_local);
  const today = new Date();
  let current = new Date(startDate);
  let lastDistance = 0;

  while (current <= today) {
    const dateStr = current.toISOString().split("T")[0];
    const activityPoint = activityMap[dateStr];
    if (activityPoint) {
      lastDistance = activityPoint.cumulativeDistance;
      chartData.push(activityPoint);
    } else {
      chartData.push({
        date: new Intl.DateTimeFormat("en-US").format(current),
        cumulativeDistance: lastDistance,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0].payload;
    if (!point.activity) return null;
    const act = point.activity;
    return (
      <div className="bg-white p-2 border rounded shadow">
        <p>
          <strong>{act.name}</strong>
        </p>
        <p>Type: {act.type}</p>
        <p>Distance: {(act.distance / 1000).toFixed(1)} km</p>
        <p>
          Moving Time: {Math.floor(act.moving_time / 3600)}:
          {Math.floor((act.moving_time % 3600) / 60)
            .toString()
            .padStart(2, "0")}
          :{(act.moving_time % 60).toString().padStart(2, "0")}
        </p>
        <p>Elevation Gain: {Math.round(act.total_elevation_gain)} m</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis label={{ value: "km", angle: -90, position: "insideLeft" }} />
        <Tooltip content={CustomTooltip} />
        <Line
          type="monotone"
          dataKey="cumulativeDistance"
          stroke="#059669"
          strokeWidth={3}
          // @ts-ignore
          dot={(props) => {
            return null;
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
