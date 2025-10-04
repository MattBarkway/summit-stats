"use client";
import React from "react";

export default function Home() {
  const handleConnect = () => {
    window.location.href = "http://localhost:8000/auth/strava";
  };

  return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <h1 className="text-4xl font-bold mb-6 text-gray-700">Welcome to ActivityAnalyser</h1>
        <p className="text-lg text-gray-600 mb-8">
          Connect with Strava to see your personalized activity dashboard.
        </p>
        <button
            onClick={handleConnect}
            className="px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
        >
          Connect with Strava
        </button>
      </main>
  );
}
