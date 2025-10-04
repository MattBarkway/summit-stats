"use client";

import { useState, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { useActivities } from "@/hooks/useActivites";
import PaginatedTable from "@/components/PaginatedTable";

interface Activity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
}

export default function ActivitiesDataTable() {
  // TODO:
  //  - Add separate links per row, to strava and to an in detail analysis page on the site
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalCount = -1;

  const { data, isLoading, error, isFetching } = useActivities(page, perPage);

  const columnHelper = createColumnHelper<Activity>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("type", { header: "Type" }),
      columnHelper.accessor("distance", {
        header: "Distance (km)",
        cell: (info) => (info.getValue() / 1000).toFixed(1),
      }),
      columnHelper.accessor("moving_time", {
        header: "Moving Time",
        cell: (info) => {
          const seconds = info.getValue();
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const sec = seconds % 60;
          return [
            hours > 0 ? String(hours) : null,
            hours > 0 ? String(minutes).padStart(2, "0") : String(minutes),
            minutes > 0 || hours > 0
              ? String(sec).padStart(2, "0")
              : String(sec),
          ]
            .filter(Boolean)
            .join(":");
        },
      }),
      columnHelper.accessor("total_elevation_gain", {
        header: "Elevation Gain",
        cell: (info) => Math.round(info.getValue()),
      }),
    ],
    [columnHelper],
  );

  if (error) return <p>Error fetching activities</p>;

  const totalPages = totalCount ? Math.ceil(totalCount / perPage) : 1;

  return (
    <PaginatedTable<Activity>
      data={data || null}
      columns={columns}
      loading={isLoading || isFetching}
      onRowClick={(activity) =>
        window.open(
          `https://www.strava.com/activities/${activity.id}`,
          "_blank",
        )
      }
      totalPages={totalPages}
      initialPage={page}
      onPageChange={setPage}
    />
  );
}
