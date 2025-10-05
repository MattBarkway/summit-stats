"use client";
import React, { useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
} from "recharts";
import ActivitiesTable from "@/components/ActivitiesTable";
import DistancePlot from "@/components/DistancePlot";
import AthleteCard from "@/components/AthleteCard";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { data: user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [isLoading, user, router]);

  if (isLoading) return <p>Loading...</p>;

  return (
    <main className="min-h-screen bg-gray-50 p-8 space-y-8">
      {/* Profile Card */}
      <section>
        <AthleteCard />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-4">Distance Over Time</h3>
          <DistancePlot />
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-4">Activity types</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart data={[]}></PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent Activities Table */}
      <section>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-4">Recent Activities</h3>
          <ActivitiesTable />
        </div>
      </section>
    </main>
  );
}
