"use client";
import React from "react";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";
import ActivitiesTable from "@/components/ActivitiesTable";
import DistancePlot from "@/components/DistancePlot";
import AthleteCard from "@/components/AthleteCard";


export default function Dashboard() {
    return (
        <main className="min-h-screen bg-gray-50 p-8 space-y-8">
            {/* Header */}
            <header>
                <h1 className="text-4xl font-bold">Dashboard</h1>
                <p className="mt-1">Your Strava activity summary</p>
            </header>

            {/* Profile Card */}
            <section>
               <AthleteCard/>
            </section>

            {/* Charts */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Line Chart */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold mb-4">Distance Over Time</h3>
                    <DistancePlot/>
                </div>

                {/* Bar Chart */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold mb-4">Distance Per Activity</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="distance" fill="#f97316" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Recent Activities Table */}
            <section>
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold mb-4">Recent Activities</h3>
                    <ActivitiesTable/>
                </div>
            </section>
        </main>
    );
}
